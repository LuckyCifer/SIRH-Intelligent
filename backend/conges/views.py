from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from accounts.permissions import IsRH, IsManagerOrRH
from .models import TypeConge, DemandeConge, SoldeConge
from .serializers import TypeCongeSerializer, DemandeCongeSerializer, SoldeCongeSerializer


def _get_or_init_solde(employe, type_conge, annee):
    solde, _ = SoldeConge.objects.get_or_create(
        employe=employe,
        type_conge=type_conge,
        annee=annee,
        defaults={
            "jours_acquis":      type_conge.jours_par_an,
            "jours_pris":        0,
            "jours_en_attente":  0,
        },
    )
    return solde


class TypeCongeViewSet(viewsets.ModelViewSet):
    queryset           = TypeConge.objects.all()
    serializer_class   = TypeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = TypeConge.objects.all()
        actif = self.request.query_params.get("actif")
        if actif is None or actif.lower() in ("1", "true", "oui"):
            qs = qs.filter(actif=True)
        return qs


class DemandeCongeViewSet(viewsets.ModelViewSet):
    serializer_class   = DemandeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = DemandeConge.objects.select_related(
            "employe", "type_conge", "valideur"
        ).all()

        if user.role in ("RH", "ADMIN"):
            pass
        elif user.role == "MANAGER":
            qs = qs.filter(
                employe__departement__in=user.departements_diriges.all()
            )
        else:
            qs = qs.filter(employe=user)

        # Filtres optionnels
        statut = self.request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        employe_id = self.request.query_params.get("employe")
        if employe_id:
            qs = qs.filter(employe_id=employe_id)
        dept_id = self.request.query_params.get("departement")
        if dept_id:
            qs = qs.filter(employe__departement_id=dept_id)
        type_id = self.request.query_params.get("type_conge")
        if type_id:
            qs = qs.filter(type_conge_id=type_id)
        annee = self.request.query_params.get("annee")
        if annee:
            qs = qs.filter(date_debut__year=annee)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        employe = user if user.role == "EMPLOYE" else None

        if employe is None:
            employe_id = self.request.data.get("employe")
            from accounts.models import User
            try:
                employe = User.objects.get(pk=employe_id)
            except User.DoesNotExist:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"employe": "Employé introuvable."})

        demande = serializer.save(employe=employe)

        try:
            from notifications.services import notifier_conge_soumis
            notifier_conge_soumis(demande)
        except Exception:
            pass

        # Incrémenter jours_en_attente
        annee = demande.date_debut.year
        solde = _get_or_init_solde(employe, demande.type_conge, annee)
        solde.jours_en_attente = float(solde.jours_en_attente) + demande.nb_jours
        solde.save()

    @action(detail=True, methods=["post"], permission_classes=[IsManagerOrRH])
    def approuver(self, request, pk=None):
        demande = self.get_object()
        if demande.statut != DemandeConge.Statut.EN_ATTENTE:
            return Response({"error": "Seules les demandes EN_ATTENTE peuvent être approuvées."}, status=400)
        commentaire = request.data.get("commentaire", "")
        demande.statut = DemandeConge.Statut.APPROUVE
        demande.valideur = request.user
        demande.commentaire_valideur = commentaire
        demande.date_validation = timezone.now()
        demande.save()
        self._mettre_a_jour_solde(demande, "approuver")
        try:
            from notifications.services import notifier_conge_valide
            notifier_conge_valide(demande, approuve=True)
        except Exception:
            pass
        return Response({"message": "Congé approuvé.", "statut": "APPROUVE"})

    @action(detail=True, methods=["post"], permission_classes=[IsManagerOrRH])
    def refuser(self, request, pk=None):
        demande = self.get_object()
        if demande.statut != DemandeConge.Statut.EN_ATTENTE:
            return Response({"error": "Seules les demandes EN_ATTENTE peuvent être refusées."}, status=400)
        commentaire = request.data.get("commentaire", "")
        if not commentaire:
            return Response({"error": "Un commentaire est obligatoire en cas de refus."}, status=400)
        demande.statut = DemandeConge.Statut.REFUSE
        demande.valideur = request.user
        demande.commentaire_valideur = commentaire
        demande.date_validation = timezone.now()
        demande.save()
        self._mettre_a_jour_solde(demande, "refuser")
        try:
            from notifications.services import notifier_conge_valide
            notifier_conge_valide(demande, approuve=False)
        except Exception:
            pass
        return Response({"message": "Congé refusé.", "statut": "REFUSE"})

    @action(detail=True, methods=["post"])
    def annuler(self, request, pk=None):
        demande = self.get_object()
        user    = request.user
        # Vérif : seul l'employé concerné ou un gestionnaire peut annuler
        if user.role == "EMPLOYE" and demande.employe != user:
            return Response({"error": "Non autorisé."}, status=403)
        if demande.statut != DemandeConge.Statut.EN_ATTENTE:
            return Response({"error": "Seules les demandes EN_ATTENTE peuvent être annulées."}, status=400)
        demande.statut = DemandeConge.Statut.ANNULE
        demande.save()
        self._mettre_a_jour_solde(demande, "annuler")
        return Response({"message": "Demande annulée."})

    def _mettre_a_jour_solde(self, demande, action_type):
        annee = demande.date_debut.year
        solde = _get_or_init_solde(demande.employe, demande.type_conge, annee)
        if action_type == "approuver":
            solde.jours_pris         = float(solde.jours_pris) + demande.nb_jours
            solde.jours_en_attente   = max(0, float(solde.jours_en_attente) - demande.nb_jours)
        elif action_type in ("refuser", "annuler"):
            solde.jours_en_attente   = max(0, float(solde.jours_en_attente) - demande.nb_jours)
        solde.save()


class SoldeCongeViewSet(viewsets.ModelViewSet):
    serializer_class   = SoldeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ["get", "put", "patch", "head", "options"]  # Pas de POST/DELETE (géré auto)

    def get_queryset(self):
        user  = self.request.user
        annee = int(self.request.query_params.get("annee", timezone.now().year))
        qs    = SoldeConge.objects.select_related("employe", "type_conge").filter(annee=annee)
        if user.role in ("RH", "ADMIN"):
            employe_id = self.request.query_params.get("employe")
            if employe_id:
                qs = qs.filter(employe_id=employe_id)
        elif user.role == "MANAGER":
            qs = qs.filter(employe__departement__in=user.departements_diriges.all())
        else:
            qs = qs.filter(employe=user)
        return qs


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def stats_conges(request):
    annee    = timezone.now().year
    user     = request.user
    demandes = DemandeConge.objects.filter(date_debut__year=annee)

    if user.role == "MANAGER":
        demandes = demandes.filter(
            employe__departement__in=user.departements_diriges.all()
        )
    elif user.role == "EMPLOYE":
        demandes = demandes.filter(employe=user)

    total_jours = sum(
        d.nb_jours for d in demandes.filter(statut=DemandeConge.Statut.APPROUVE)
    )
    total_valides = demandes.filter(statut=DemandeConge.Statut.APPROUVE).count()
    total_traites = demandes.exclude(statut=DemandeConge.Statut.EN_ATTENTE).count()

    return Response({
        "en_attente":        demandes.filter(statut="EN_ATTENTE").count(),
        "approuves":         total_valides,
        "refuses":           demandes.filter(statut="REFUSE").count(),
        "annules":           demandes.filter(statut="ANNULE").count(),
        "total_jours_pris":  total_jours,
        "taux_approbation":  round(total_valides / total_traites * 100, 1) if total_traites else 0,
        "par_type": [
            {
                "type":        tc.nom,
                "couleur":     tc.couleur,
                "nb_demandes": demandes.filter(type_conge=tc).count(),
            }
            for tc in TypeConge.objects.filter(actif=True)
        ],
    })
