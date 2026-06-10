from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.permissions import IsManagerOrRH
from .models import Contrat
from .serializers import ContratSerializer


class ContratViewSet(viewsets.ModelViewSet):
    queryset           = Contrat.objects.select_related("employe", "poste__departement").all()
    serializer_class   = ContratSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsManagerOrRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs   = Contrat.objects.select_related("employe", "poste__departement").all()

        # Un employé ne voit que ses propres contrats
        if user.is_employe:
            qs = qs.filter(employe=user)

        # Filtres optionnels
        employe_id    = self.request.query_params.get("employe")
        type_contrat  = self.request.query_params.get("type")
        statut        = self.request.query_params.get("statut")
        departement   = self.request.query_params.get("departement")

        if employe_id:   qs = qs.filter(employe_id=employe_id)
        if type_contrat: qs = qs.filter(type_contrat=type_contrat)
        if statut:       qs = qs.filter(statut=statut)
        if departement:  qs = qs.filter(poste__departement_id=departement)
        return qs

    @action(detail=False, methods=["get"], permission_classes=[IsManagerOrRH])
    def expirant_bientot(self, request):
        """GET /api/contrats/expirant-bientot/ — Contrats expirant dans 30 jours"""
        today = timezone.now().date()
        limite = today.replace(day=today.day)
        from datetime import timedelta
        limite_30 = today + timedelta(days=30)
        qs = Contrat.objects.filter(
            statut=Contrat.Statut.ACTIF,
            date_fin__isnull=False,
            date_fin__lte=limite_30,
            date_fin__gte=today,
        ).select_related("employe", "poste__departement").order_by("date_fin")
        return Response(ContratSerializer(qs, many=True).data)
