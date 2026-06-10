from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from accounts.permissions import IsAdminRH
from .models import RapportIAMensuel
from .serializers import RapportIAMensuelSerializer, RapportIAListSerializer
from .services import lancer_generation_async


class RapportIAMensuelViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminRH]

    def get_queryset(self):
        qs = RapportIAMensuel.objects.select_related("departement", "employe", "genere_par")
        type_r = self.request.query_params.get("type_rapport")
        annee  = self.request.query_params.get("annee")
        mois   = self.request.query_params.get("mois")
        if type_r:
            qs = qs.filter(type_rapport=type_r)
        if annee:
            qs = qs.filter(annee=annee)
        if mois:
            qs = qs.filter(mois=mois)
        return qs

    def get_serializer_class(self):
        if self.action in ("list", "historique"):
            return RapportIAListSerializer
        return RapportIAMensuelSerializer

    @action(detail=False, methods=["post"])
    def generer(self, request):
        mois         = request.data.get("mois")
        annee        = request.data.get("annee")
        type_rapport = request.data.get("type_rapport", RapportIAMensuel.TypeRapport.GLOBAL)
        dept_id      = request.data.get("departement")
        emp_id       = request.data.get("employe")

        if not mois or not annee:
            return Response({"detail": "mois et annee sont requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mois  = int(mois)
            annee = int(annee)
        except (ValueError, TypeError):
            return Response({"detail": "mois et annee doivent être des entiers."}, status=status.HTTP_400_BAD_REQUEST)

        defaults = {
            "statut": RapportIAMensuel.Statut.EN_GENERATION,
            "message_erreur": "",
            "genere_par": request.user,
        }
        rapport, created = RapportIAMensuel.objects.get_or_create(
            mois=mois,
            annee=annee,
            type_rapport=type_rapport,
            departement_id=dept_id or None,
            employe_id=emp_id or None,
            defaults=defaults,
        )
        if not created:
            # réinitialiser pour régénérer
            rapport.statut         = RapportIAMensuel.Statut.EN_GENERATION
            rapport.message_erreur = ""
            rapport.genere_par     = request.user
            rapport.save(update_fields=["statut", "message_erreur", "genere_par", "updated_at"])

        lancer_generation_async(rapport.pk)

        return Response(
            {"id": rapport.pk, "statut": rapport.statut, "message": "Génération lancée."},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["get"], url_path="statut-generation")
    def statut_generation(self, request, pk=None):
        rapport = self.get_object()
        return Response({
            "id": rapport.pk,
            "statut": rapport.statut,
            "score_sante_rh": rapport.score_sante_rh,
            "message_erreur": rapport.message_erreur,
            "updated_at": rapport.updated_at,
        })

    @action(detail=False, methods=["get"], url_path="dernier-rapport")
    def dernier_rapport(self, request):
        qs = RapportIAMensuel.objects.filter(
            type_rapport=RapportIAMensuel.TypeRapport.GLOBAL,
            statut=RapportIAMensuel.Statut.GENERE,
        ).order_by("-annee", "-mois").first()
        if not qs:
            return Response(None)
        return Response(RapportIAMensuelSerializer(qs).data)

    @action(detail=False, methods=["get"])
    def historique(self, request):
        qs = self.get_queryset().filter(statut=RapportIAMensuel.Statut.GENERE)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(RapportIAListSerializer(page, many=True).data)
        return Response(RapportIAListSerializer(qs, many=True).data)
