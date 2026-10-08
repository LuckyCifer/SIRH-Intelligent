import calendar
from datetime import date as date_type
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.permissions import IsManagerOrRH
from .models import Contrat, _ajouter_mois
from .serializers import ContratSerializer
from .validators import (
    valider_duree_cdd, valider_periode_essai, valider_non_concurrence,
    calculer_preavis, _duree_mois,
)


def _post_process_contrat(contrat):
    """
    Calcule les champs dérivés après create/update :
    date_fin_essai, duree_totale_cdd_mois, duree_preavis_jours.
    """
    updates = {}

    # date_fin_essai = date_debut + periode_essai_mois
    if contrat.periode_essai_mois and contrat.periode_essai_mois > 0 and contrat.date_debut:
        updates["date_fin_essai"] = _ajouter_mois(contrat.date_debut, contrat.periode_essai_mois)
    elif contrat.periode_essai_mois == 0:
        updates["date_fin_essai"] = None

    # duree_totale_cdd_mois
    if contrat.type_contrat == "CDD" and contrat.date_debut and contrat.date_fin:
        updates["duree_totale_cdd_mois"] = _duree_mois(contrat.date_debut, contrat.date_fin)
    elif contrat.type_contrat != "CDD":
        updates["duree_totale_cdd_mois"] = 0

    # duree_preavis_jours selon ancienneté depuis date_debut
    if contrat.date_debut:
        anciennete = _duree_mois(contrat.date_debut, timezone.now().date())
        updates["duree_preavis_jours"] = calculer_preavis(anciennete)

    if updates:
        Contrat.objects.filter(pk=contrat.pk).update(**updates)


def _notifier_rh_cdd_dernier_renouvellement(contrat):
    """Crée une notification INFO pour les RH de la même entreprise si dernier renouvellement CDD."""
    try:
        from notifications.models import Notification
        from accounts.models import User
        nom = contrat.employe.get_full_name() or contrat.employe.username
        entreprise = getattr(contrat.employe, "entreprise", None)
        qs = User.objects.filter(role__in=["RH", "ADMIN"])
        if entreprise:
            qs = qs.filter(entreprise=entreprise)
        for rh in qs:
            Notification.objects.create(
                destinataire=rh,
                type_notif="ALERTE",
                categorie="CONTRAT",
                titre=f"CDD {nom} — dernier renouvellement légal",
                message=(
                    f"Le CDD de {nom} est en 1er renouvellement (dernier autorisé). "
                    f"À l'issue de ce contrat, un CDI doit être proposé ou la relation "
                    f"de travail prend fin (Art. 25 du Code du Travail)."
                ),
                lien="/rh/contrats",
            )
    except Exception:
        pass


def _notifier_fin_essai_proche(contrat):
    """Crée une notification si fin de période d'essai dans 5 jours."""
    try:
        if not contrat.date_fin_essai or contrat.essai_confirme or contrat.essai_rompu:
            return
        jours = (contrat.date_fin_essai - timezone.now().date()).days
        if not (0 <= jours <= 5):
            return
        from notifications.models import Notification
        from accounts.models import User
        nom = contrat.employe.get_full_name() or contrat.employe.username
        entreprise = getattr(contrat.employe, "entreprise", None)
        qs = User.objects.filter(role__in=["RH", "ADMIN"])
        if entreprise:
            qs = qs.filter(entreprise=entreprise)
        for rh in qs:
            Notification.objects.create(
                destinataire=rh,
                type_notif="ALERTE",
                categorie="CONTRAT",
                titre=f"Fin de période d'essai dans {jours}j — {nom}",
                message=(
                    f"La période d'essai de {nom} se termine le "
                    f"{contrat.date_fin_essai.strftime('%d/%m/%Y')}. "
                    f"Décision requise : confirmation ou rupture (Art. 27)."
                ),
                lien="/rh/contrats",
            )
    except Exception:
        pass


class ContratViewSet(viewsets.ModelViewSet):
    queryset         = Contrat.objects.select_related("employe", "poste__departement").all()
    serializer_class = ContratSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsManagerOrRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs   = Contrat.objects.select_related("employe", "poste__departement").all()

        if user.is_employe:
            qs = qs.filter(employe=user)

        employe_id   = self.request.query_params.get("employe")
        type_contrat = self.request.query_params.get("type")
        statut       = self.request.query_params.get("statut")
        departement  = self.request.query_params.get("departement")

        if employe_id:   qs = qs.filter(employe_id=employe_id)
        if type_contrat: qs = qs.filter(type_contrat=type_contrat)
        if statut:       qs = qs.filter(statut=statut)
        if departement:  qs = qs.filter(poste__departement_id=departement)
        return qs

    def perform_create(self, serializer):
        data = serializer.validated_data
        valider_duree_cdd(data)
        valider_periode_essai(data)
        valider_non_concurrence(data)
        contrat = serializer.save()
        _post_process_contrat(contrat)
        if contrat.type_contrat == "CDD" and contrat.renouvellement_numero == 1:
            _notifier_rh_cdd_dernier_renouvellement(contrat)
        _notifier_fin_essai_proche(contrat)

    def perform_update(self, serializer):
        data = serializer.validated_data
        valider_duree_cdd(data)
        valider_periode_essai(data)
        valider_non_concurrence(data)
        contrat = serializer.save()
        _post_process_contrat(contrat)

    @action(detail=False, methods=["get"], permission_classes=[IsManagerOrRH])
    def expirant_bientot(self, request):
        """GET /api/contrats/expirant-bientot/ — CDD expirant dans 30 jours."""
        from datetime import timedelta
        today    = timezone.now().date()
        limite30 = today + timedelta(days=30)
        limite15 = today + timedelta(days=15)
        qs = Contrat.objects.filter(
            statut=Contrat.Statut.ACTIF,
            date_fin__isnull=False,
            date_fin__lte=limite30,
            date_fin__gte=today,
        ).select_related("employe", "poste__departement").order_by("date_fin")
        data = ContratSerializer(qs, many=True).data
        # Enrichir avec le niveau d'urgence
        for item, contrat in zip(data, qs):
            item["urgence"] = "URGENT" if contrat.date_fin <= limite15 else "NORMAL"
            item["mention"] = (
                "Dernier renouvellement légal (Art. 25)"
                if contrat.renouvellement_numero == 1 else ""
            )
        return Response(data)
