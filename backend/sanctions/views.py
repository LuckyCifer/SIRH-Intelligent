from datetime import date as date_type
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import IsRH, IsManagerOrRH
from .models import Sanction
from .serializers import SanctionSerializer


# ── Helpers ────────────────────────────────────────────────────────────────

def _validate_mise_a_pied(data):
    """Validation légale mise à pied (Art. 30 al.3 Loi 92/007)."""
    if data.get("type_sanction") != "MISE_A_PIED":
        return
    duree = data.get("duree_mise_a_pied_jours")
    if duree is None:
        raise ValidationError({
            "duree_mise_a_pied_jours": (
                "La durée de la mise à pied est obligatoire (Art. 30 al.3)."
            )
        })
    if int(duree) > 8:
        raise ValidationError({
            "duree_mise_a_pied_jours": (
                "La durée de la mise à pied ne peut excéder 8 jours ouvrables "
                "(Art. 30 du Code du Travail camerounais)."
            )
        })


def _calculer_retenue_salaire(sanction):
    """Retenue = nb_jours × (salaire_mensuel_brut / 26). Met à jour le champ."""
    if not sanction.duree_mise_a_pied_jours:
        return
    try:
        from paie.models import BulletinPaie
        bulletin = BulletinPaie.objects.filter(
            employe=sanction.employe
        ).order_by("-annee", "-mois").first()
        if bulletin and bulletin.salaire_brut:
            montant = sanction.duree_mise_a_pied_jours * (bulletin.salaire_brut / 26)
            Sanction.objects.filter(pk=sanction.pk).update(
                montant_retenue_salaire=round(float(montant), 2)
            )
    except Exception:
        pass


def _notifier_rh_mise_a_pied(sanction):
    """Crée une notification URGENT pour tous les RH/ADMIN de la même entreprise."""
    try:
        from notifications.models import Notification
        from accounts.models import User
        nom_employe = sanction.employe.get_full_name() or sanction.employe.username
        entreprise = getattr(sanction.employe, "entreprise", None)
        qs = User.objects.filter(role__in=["RH", "ADMIN"])
        if entreprise:
            qs = qs.filter(entreprise=entreprise)
        for rh in qs:
            Notification.objects.create(
                destinataire=rh,
                type_notif="URGENT",
                categorie="SYSTEME",
                titre=f"URGENT — Mise à pied de {nom_employe} à notifier à l'IT",
                message=(
                    f"La mise à pied de {nom_employe} doit être communiquée "
                    f"à l'Inspecteur du Travail dans les 48 heures "
                    f"(Art. 30 al.3c du Code du Travail). "
                    f"Non-respect → sanction nulle et de nul effet."
                ),
                lien="/rh/sanctions",
            )
    except Exception:
        pass


# ── ViewSet ────────────────────────────────────────────────────────────────

class SanctionViewSet(viewsets.ModelViewSet):
    serializer_class = SanctionSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy",
                           "notifier", "archiver", "notifier_it",
                           "appliquer_retenue_paie"]:
            return [IsManagerOrRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs   = Sanction.objects.select_related("employe", "prononcee_par")

        employe_id    = self.request.query_params.get("employe")
        type_sanction = self.request.query_params.get("type_sanction")
        statut        = self.request.query_params.get("statut")
        a_regulariser = self.request.query_params.get("a_regulariser")

        if employe_id:
            qs = qs.filter(employe_id=employe_id)
        if type_sanction:
            qs = qs.filter(type_sanction=type_sanction)
        if statut:
            qs = qs.filter(statut=statut)
        if a_regulariser == "1":
            qs = qs.filter(type_sanction="MISE_A_PIED", notifie_it=False).exclude(statut="BROUILLON")

        if user.role == "EMPLOYE":
            return qs.filter(
                employe=user,
                statut__in=["NOTIFIEE", "ACCEPTEE", "CONTESTEE", "ARCHIVEE"],
            )
        if user.role == "MANAGER":
            return qs.filter(employe__departement__in=user.departements_diriges.all())
        return qs

    def perform_create(self, serializer):
        data = serializer.validated_data
        _validate_mise_a_pied(data)
        sanction = serializer.save(prononcee_par=self.request.user)
        if sanction.type_sanction == "MISE_A_PIED":
            _calculer_retenue_salaire(sanction)
            if not sanction.notifie_it:
                _notifier_rh_mise_a_pied(sanction)

    def perform_update(self, serializer):
        data = serializer.validated_data
        _validate_mise_a_pied(data)
        sanction = serializer.save()
        if sanction.type_sanction == "MISE_A_PIED":
            _calculer_retenue_salaire(sanction)

    # ── Actions existantes ─────────────────────────────────────────────────

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
        reponse     = request.data.get("reponse", "")
        sanction.reponse_employe = reponse
        sanction.date_reponse    = timezone.now()
        if action_type == "accepter":
            sanction.statut = "ACCEPTEE"
        elif action_type == "contester":
            if not reponse:
                return Response({"error": "Motif de contestation requis."}, status=400)
            sanction.statut  = "CONTESTEE"
            sanction.conteste = True
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

    # ── Nouvelles actions légales ──────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="notifier-it")
    def notifier_it(self, request, pk=None):
        """POST /sanctions/{id}/notifier-it/ — Enregistre la notification à l'IT."""
        sanction = self.get_object()
        if sanction.type_sanction != "MISE_A_PIED":
            return Response(
                {"error": "Cette action ne s'applique qu'aux mises à pied."},
                status=400,
            )
        aujourd_hui     = date_type.today()
        delta           = (aujourd_hui - sanction.date_sanction).days
        dans_les_delais = delta <= 2

        sanction.notifie_it           = True
        sanction.date_notification_it = aujourd_hui
        sanction.delai_48h_respecte   = dans_les_delais
        sanction.save()

        if dans_les_delais:
            message = f"Notification IT enregistrée dans les délais ({delta} jour(s) après la sanction)."
        else:
            message = (
                f"Notification IT enregistrée HORS délai ({delta} jours après la sanction). "
                f"Le délai légal de 48h était dépassé."
            )
        return Response({
            "dans_les_delais": dans_les_delais,
            "message": message,
            "sanction": SanctionSerializer(sanction).data,
        })

    @action(detail=True, methods=["post"], url_path="appliquer-retenue-paie")
    def appliquer_retenue_paie(self, request, pk=None):
        """POST /sanctions/{id}/appliquer-retenue-paie/ — Marque la retenue appliquée."""
        sanction = self.get_object()
        if sanction.type_sanction != "MISE_A_PIED":
            return Response(
                {"error": "Les retenues sur salaire ne s'appliquent qu'aux mises à pied."},
                status=400,
            )
        if sanction.retenue_appliquee_paie:
            return Response({"message": "La retenue a déjà été appliquée.", "sanction": SanctionSerializer(sanction).data})

        sanction.retenue_appliquee_paie = True
        sanction.save()
        return Response({
            "message": (
                f"Retenue de {sanction.montant_retenue_salaire} FCFA marquée comme appliquée. "
                f"Intégrer cette retenue dans le bulletin de paie du mois concerné."
            ),
            "montant_retenue": str(sanction.montant_retenue_salaire),
            "sanction": SanctionSerializer(sanction).data,
        })

    # ── Stats ──────────────────────────────────────────────────────────────

    @action(detail=False, methods=["get"])
    def stats(self, request):
        user     = request.user
        qs       = Sanction.objects.exclude(statut="BROUILLON")
        if user.role == "MANAGER":
            qs = qs.filter(employe__departement__in=user.departements_diriges.all())
        mois_debut = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return Response({
            "total":              qs.count(),
            "en_cours":           qs.filter(statut__in=["NOTIFIEE", "ACCEPTEE", "CONTESTEE"]).count(),
            "contestees":         qs.filter(statut="CONTESTEE").count(),
            "ce_mois":            qs.filter(created_at__gte=mois_debut).count(),
            "a_regulariser":      Sanction.objects.filter(
                                      type_sanction="MISE_A_PIED", notifie_it=False
                                  ).exclude(statut="BROUILLON").count(),
            "par_type": {
                t: qs.filter(type_sanction=t).count()
                for t, _ in Sanction.TypeSanction.choices
            },
            "employes_sanctionnes": qs.values("employe").distinct().count(),
        })
