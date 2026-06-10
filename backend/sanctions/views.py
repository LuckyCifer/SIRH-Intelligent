from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsRH, IsManagerOrRH
from .models import Sanction
from .serializers import SanctionSerializer


class SanctionViewSet(viewsets.ModelViewSet):
    serializer_class = SanctionSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy",
                           "notifier", "archiver"]:
            return [IsManagerOrRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Sanction.objects.select_related("employe", "prononcee_par")
        employe_id    = self.request.query_params.get("employe")
        type_sanction = self.request.query_params.get("type_sanction")
        statut        = self.request.query_params.get("statut")

        if employe_id:
            qs = qs.filter(employe_id=employe_id)
        if type_sanction:
            qs = qs.filter(type_sanction=type_sanction)
        if statut:
            qs = qs.filter(statut=statut)

        if user.role == "EMPLOYE":
            return qs.filter(
                employe=user,
                statut__in=["NOTIFIEE", "ACCEPTEE", "CONTESTEE", "ARCHIVEE"],
            )
        if user.role == "MANAGER":
            return qs.filter(employe__departement__in=user.departements_diriges.all())
        return qs

    def perform_create(self, serializer):
        serializer.save(prononcee_par=self.request.user)

    @action(detail=True, methods=["post"])
    def notifier(self, request, pk=None):
        sanction = self.get_object()
        sanction.statut = "NOTIFIEE"
        sanction.save()
        return Response(SanctionSerializer(sanction).data)

    @action(detail=True, methods=["post"])
    def repondre(self, request, pk=None):
        sanction = self.get_object()
        if sanction.employe != request.user:
            return Response({"error": "Accès refusé."}, status=403)
        action_type = request.data.get("action")
        reponse = request.data.get("reponse", "")
        sanction.reponse_employe = reponse
        sanction.date_reponse = timezone.now()
        if action_type == "accepter":
            sanction.statut = "ACCEPTEE"
        elif action_type == "contester":
            if not reponse:
                return Response({"error": "Motif de contestation requis."}, status=400)
            sanction.statut = "CONTESTEE"
        else:
            return Response({"error": "action doit être 'accepter' ou 'contester'."}, status=400)
        sanction.save()
        return Response(SanctionSerializer(sanction).data)

    @action(detail=True, methods=["post"])
    def archiver(self, request, pk=None):
        sanction = self.get_object()
        sanction.statut = "ARCHIVEE"
        sanction.save()
        return Response(SanctionSerializer(sanction).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        user = request.user
        sanctions = Sanction.objects.exclude(statut="BROUILLON")
        if user.role == "MANAGER":
            sanctions = sanctions.filter(
                employe__departement__in=user.departements_diriges.all()
            )
        mois_debut = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return Response({
            "total": sanctions.count(),
            "en_cours": sanctions.filter(statut__in=["NOTIFIEE", "ACCEPTEE", "CONTESTEE"]).count(),
            "contestees": sanctions.filter(statut="CONTESTEE").count(),
            "ce_mois": sanctions.filter(created_at__gte=mois_debut).count(),
            "par_type": {
                t: sanctions.filter(type_sanction=t).count()
                for t, _ in Sanction.TypeSanction.choices
            },
            "employes_sanctionnes": sanctions.values("employe").distinct().count(),
        })
