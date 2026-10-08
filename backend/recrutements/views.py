import secrets
import string
from datetime import date, timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q

from accounts.permissions import IsRH, IsManagerOrRH
from .models import OffreEmploi, Candidature, Entretien
from .serializers import OffreEmploiSerializer, CandidatureSerializer, EntretienSerializer
from .services import analyser_cv_async


def _notifier_onboarding_rh(candidature, entreprise):
    """Crée une notification ALERTE pour les RH à l'embauche confirmée."""
    try:
        from notifications.models import Notification
        from accounts.models import User
        deadline_cnps = date.today() + timedelta(days=8)
        nom = candidature.nom_complet
        for rh in User.objects.filter(role__in=["RH", "ADMIN"], entreprise=entreprise, is_active=True):
            Notification.objects.create(
                destinataire=rh,
                type_notif="ALERTE",
                categorie="RECRUTEMENT",
                titre=f"Embauche confirmée — {nom}",
                message=(
                    f"Embauche de {nom} confirmée. Obligations légales :\n"
                    f"1. Déclarer à la CNPS avant le {deadline_cnps.strftime('%d/%m/%Y')} (8 jours)\n"
                    f"2. Inscrire au registre du personnel\n"
                    f"3. Organiser la visite médicale d'embauche\n"
                    f"4. Créer le contrat de travail écrit"
                ),
                lien=f"/rh/recrutements/candidatures/{candidature.pk}",
            )
    except Exception:
        pass


class OffreEmploiViewSet(viewsets.ModelViewSet):
    serializer_class = OffreEmploiSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy",
                           "publier", "cloturer", "tableau_bord"]:
            return [IsRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        entreprise = getattr(user, "entreprise", None)
        qs = OffreEmploi.objects.select_related("departement", "poste", "cree_par")
        if entreprise:
            qs = qs.filter(entreprise=entreprise)
        if user.role in ["RH", "ADMIN"]:
            return qs
        return qs.filter(statut="PUBLIEE")

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=True, methods=["post"])
    def publier(self, request, pk=None):
        offre = self.get_object()
        if offre.statut not in ["BROUILLON", "EN_PAUSE"]:
            return Response({"detail": "Seules les offres brouillon ou en pause peuvent être publiées."}, status=400)
        offre.statut = "PUBLIEE"
        offre.date_publication = date.today()
        offre.save()
        return Response(OffreEmploiSerializer(offre).data)

    @action(detail=True, methods=["post"])
    def cloturer(self, request, pk=None):
        offre = self.get_object()
        offre.statut = "CLOTUREE"
        offre.save()
        return Response(OffreEmploiSerializer(offre).data)

    @action(detail=True, methods=["post"], url_path="mettre-en-pause")
    def mettre_en_pause(self, request, pk=None):
        offre = self.get_object()
        offre.statut = "EN_PAUSE"
        offre.save()
        return Response(OffreEmploiSerializer(offre).data)

    @action(detail=False, methods=["get"], url_path="tableau-bord")
    def tableau_bord(self, request):
        entreprise = getattr(request.user, "entreprise", None)
        aujourd_hui = date.today()
        debut_semaine = aujourd_hui - timedelta(days=aujourd_hui.weekday())
        fin_semaine = debut_semaine + timedelta(days=6)

        offres_qs = OffreEmploi.objects.filter(entreprise=entreprise) if entreprise else OffreEmploi.objects.all()
        cands_qs  = Candidature.objects.filter(offre__entreprise=entreprise) if entreprise else Candidature.objects.all()
        entret_qs = Entretien.objects.filter(candidature__offre__entreprise=entreprise) if entreprise else Entretien.objects.all()

        total_offres = offres_qs.count()
        publiees = offres_qs.filter(statut="PUBLIEE").count()
        total_candidatures = cands_qs.count()
        candidatures_semaine = cands_qs.filter(
            date_candidature__date__gte=debut_semaine,
            date_candidature__date__lte=fin_semaine,
        ).count()
        entretiens_a_venir = entret_qs.filter(date_heure__date__gte=aujourd_hui).count()

        par_statut = {}
        for statut, _ in Candidature.Statut.choices:
            par_statut[statut] = cands_qs.filter(statut=statut).count()

        dernieres_candidatures = cands_qs.select_related("offre").order_by("-date_candidature")[:5]
        prochains_entretiens = entret_qs.select_related(
            "candidature__offre", "intervieweur"
        ).filter(date_heure__gte=aujourd_hui).order_by("date_heure")[:3]

        return Response({
            "total_offres": total_offres,
            "publiees": publiees,
            "total_candidatures": total_candidatures,
            "candidatures_semaine": candidatures_semaine,
            "entretiens_a_venir": entretiens_a_venir,
            "par_statut_candidature": par_statut,
            "dernieres_candidatures": CandidatureSerializer(dernieres_candidatures, many=True).data,
            "prochains_entretiens": EntretienSerializer(prochains_entretiens, many=True).data,
        })


class CandidatureViewSet(viewsets.ModelViewSet):
    serializer_class = CandidatureSerializer
    permission_classes = [IsManagerOrRH]

    def get_queryset(self):
        qs = Candidature.objects.select_related("offre")
        offre_id = self.request.query_params.get("offre_id")
        statut = self.request.query_params.get("statut")
        if offre_id:
            qs = qs.filter(offre_id=offre_id)
        if statut:
            qs = qs.filter(statut=statut)
        return qs

    @action(detail=True, methods=["post"], url_path="changer-statut")
    def changer_statut(self, request, pk=None):
        candidature = self.get_object()
        nouveau_statut = request.data.get("statut")
        if nouveau_statut not in dict(Candidature.Statut.choices):
            return Response({"detail": "Statut invalide."}, status=400)
        ancien_statut  = candidature.statut
        candidature.statut = nouveau_statut
        commentaire = request.data.get("commentaire")
        if commentaire:
            candidature.commentaire_rh = commentaire
        if nouveau_statut == "ACCEPTEE" and ancien_statut != "ACCEPTEE":
            if not candidature.date_embauche_prevue:
                candidature.date_embauche_prevue = date.today() + timedelta(days=14)
        candidature.save()
        if nouveau_statut == "ACCEPTEE" and ancien_statut != "ACCEPTEE":
            _notifier_onboarding_rh(candidature, request.user.entreprise)
        return Response(CandidatureSerializer(candidature).data)

    @action(detail=True, methods=["post"], url_path="analyser-cv-ia")
    def analyser_cv_ia(self, request, pk=None):
        candidature = self.get_object()
        analyser_cv_async(candidature.pk)
        return Response({"detail": "Analyse IA lancée."})

    @action(detail=True, methods=["patch"], url_path="noter")
    def noter(self, request, pk=None):
        candidature = self.get_object()
        note = request.data.get("note_interne")
        if note is not None:
            candidature.note_interne = int(note)
            candidature.save()
        return Response(CandidatureSerializer(candidature).data)

    @action(detail=True, methods=["get"], url_path="onboarding-checklist")
    def onboarding_checklist(self, request, pk=None):
        """GET /api/recrutements/candidatures/{id}/onboarding-checklist/"""
        candidature = self.get_object()
        return Response(CandidatureSerializer(candidature).data)

    @action(detail=True, methods=["patch"], url_path="update-onboarding")
    def update_onboarding(self, request, pk=None):
        """PATCH /api/recrutements/candidatures/{id}/update-onboarding/"""
        candidature = self.get_object()
        allowed = [
            "date_embauche_prevue", "date_embauche_effective",
            "cnps_declare", "date_declaration_cnps", "numero_cnps_attribue",
            "visite_medicale_faite", "date_visite_medicale", "aptitude_medicale",
            "inscrit_registre_personnel", "numero_registre",
            "est_etranger", "visa_mintss_obtenu",
        ]
        for field in allowed:
            if field in request.data:
                val = request.data[field]
                if val in ("true", "True", True):
                    val = True
                elif val in ("false", "False", False):
                    val = False
                setattr(candidature, field, val)
        # Calculer delai_cnps_respecte automatiquement
        if (candidature.cnps_declare
                and candidature.date_declaration_cnps
                and candidature.date_embauche_effective):
            delta = (candidature.date_declaration_cnps - candidature.date_embauche_effective).days
            candidature.delai_cnps_respecte = delta <= 8
        else:
            candidature.delai_cnps_respecte = False
        candidature.save()
        return Response(CandidatureSerializer(candidature).data)

    @action(detail=False, methods=["get"], url_path="onboardings-en-cours")
    def onboardings_en_cours(self, request):
        """GET /api/recrutements/candidatures/onboardings-en-cours/ — Embauches avec checklist incomplète."""
        qs = Candidature.objects.filter(statut="ACCEPTEE").select_related("offre").order_by("-updated_at")
        return Response(CandidatureSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="convertir-en-employe")
    def convertir_en_employe(self, request, pk=None):
        """POST — Crée le compte User + Contrat depuis la candidature acceptée."""
        from accounts.models import User
        from contrats.models import Contrat
        from django.utils import timezone

        candidature = self.get_object()
        if candidature.statut != "ACCEPTEE":
            return Response({"detail": "La candidature doit être acceptée."}, status=400)

        offre = candidature.offre

        # Décomposer nom_complet
        parts      = candidature.nom_complet.strip().split()
        first_name = parts[0] if parts else "Nouveau"
        last_name  = " ".join(parts[1:]) if len(parts) > 1 else "Employé"

        # Username unique
        base = (first_name[:1] + last_name).lower().replace(" ", "").replace("-", "")[:28]
        username = base
        cpt = 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{cpt}"
            cpt += 1

        # Mot de passe temporaire
        alphabet = string.ascii_letters + string.digits
        temp_pwd = "".join(secrets.choice(alphabet) for _ in range(12))

        entreprise = getattr(request.user, "entreprise", None)

        user = User(
            username=username,
            email=candidature.email,
            first_name=first_name,
            last_name=last_name,
            telephone=candidature.telephone or "",
            role="EMPLOYE",
            departement=offre.departement,
            poste=offre.poste,
            entreprise=entreprise,
        )
        user.set_password(temp_pwd)
        user.save()

        # Contrat
        date_debut = (
            candidature.date_embauche_effective
            or candidature.date_embauche_prevue
            or timezone.now().date()
        )
        contrat = Contrat.objects.create(
            employe=user,
            type_contrat=offre.type_contrat,
            statut="ACTIF",
            date_debut=date_debut,
            poste=offre.poste,
            entreprise=entreprise,
        )

        # Marquer registre fait
        Candidature.objects.filter(pk=candidature.pk).update(inscrit_registre_personnel=True)

        return Response({
            "user_id":      user.pk,
            "username":     user.username,
            "temp_password": temp_pwd,
            "contrat_id":   contrat.pk,
            "message": (
                f"Compte créé : {user.username} "
                f"(mot de passe temporaire : {temp_pwd}). "
                f"Contrat #{contrat.pk} créé."
            ),
        }, status=status.HTTP_201_CREATED)


class EntretienViewSet(viewsets.ModelViewSet):
    serializer_class = EntretienSerializer
    permission_classes = [IsManagerOrRH]

    def get_queryset(self):
        qs = Entretien.objects.select_related(
            "candidature__offre", "intervieweur"
        )
        candidature_id = self.request.query_params.get("candidature_id")
        if candidature_id:
            qs = qs.filter(candidature_id=candidature_id)
        return qs
