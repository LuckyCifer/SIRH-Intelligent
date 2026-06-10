from datetime import date, timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q

from accounts.permissions import IsRH, IsManagerOrRH
from .models import OffreEmploi, Candidature, Entretien
from .serializers import OffreEmploiSerializer, CandidatureSerializer, EntretienSerializer
from .services import analyser_cv_async


class OffreEmploiViewSet(viewsets.ModelViewSet):
    serializer_class = OffreEmploiSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy",
                           "publier", "cloturer", "tableau_bord"]:
            return [IsRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = OffreEmploi.objects.select_related("departement", "poste", "cree_par")
        if user.role in ["RH", "ADMIN"]:
            return qs.all()
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
        aujourd_hui = date.today()
        debut_semaine = aujourd_hui - timedelta(days=aujourd_hui.weekday())
        fin_semaine = debut_semaine + timedelta(days=6)
        debut_mois = aujourd_hui.replace(day=1)

        total_offres = OffreEmploi.objects.count()
        publiees = OffreEmploi.objects.filter(statut="PUBLIEE").count()
        total_candidatures = Candidature.objects.count()
        candidatures_semaine = Candidature.objects.filter(
            date_candidature__date__gte=debut_semaine,
            date_candidature__date__lte=fin_semaine,
        ).count()
        entretiens_a_venir = Entretien.objects.filter(
            date_heure__date__gte=aujourd_hui
        ).count()

        par_statut = {}
        for statut, _ in Candidature.Statut.choices:
            par_statut[statut] = Candidature.objects.filter(statut=statut).count()

        dernieres_candidatures = Candidature.objects.select_related("offre").order_by(
            "-date_candidature"
        )[:5]
        prochains_entretiens = Entretien.objects.select_related(
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
        candidature.statut = nouveau_statut
        commentaire = request.data.get("commentaire")
        if commentaire:
            candidature.commentaire_rh = commentaire
        candidature.save()
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
