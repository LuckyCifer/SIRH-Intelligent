from django.db.models import Avg
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.models import User
from accounts.permissions import IsEncadreurOrAdmin, IsAdminRH
from accounts.filiere_data import FILIERE_DATA
from .models import AnalyseIA
from .serializers import AnalyseIASerializer
from .services import analyser_rapport
from rapports.models import RapportHebdomadaire


class AnalyseListView(generics.ListAPIView):
    """Liste des analyses — encadreur / admin uniquement"""
    serializer_class   = AnalyseIASerializer
    permission_classes = [IsEncadreurOrAdmin]

    def get_queryset(self):
        user = self.request.user
        qs   = AnalyseIA.objects.select_related("rapport__stagiaire")
        if user.is_encadreur:
            return qs.filter(rapport__stagiaire__periodes_stage__encadreur=user).distinct()
        return qs


class AnalyseDetailView(generics.RetrieveAPIView):
    """Détail d'une analyse"""
    queryset           = AnalyseIA.objects.all()
    serializer_class   = AnalyseIASerializer
    permission_classes = [IsAuthenticated]


@api_view(["POST"])
@permission_classes([IsEncadreurOrAdmin])
def relancer_analyse(request, rapport_pk):
    """Relancer manuellement l'analyse IA sur un rapport"""
    try:
        rapport = RapportHebdomadaire.objects.get(pk=rapport_pk)
    except RapportHebdomadaire.DoesNotExist:
        return Response({"error": "Rapport introuvable."}, status=status.HTTP_404_NOT_FOUND)

    analyser_rapport(rapport)
    return Response({"message": "Analyse IA relancée avec succès."})


@api_view(["GET"])
@permission_classes([IsEncadreurOrAdmin])
def alertes(request):
    """Retourne tous les stagiaires avec une alerte MOYENNE ou ELEVEE"""
    analyses = AnalyseIA.objects.filter(
        niveau_alerte__in=["MOYENNE", "ELEVEE"]
    ).select_related("rapport__stagiaire").order_by("-date_analyse")

    data = [
        {
            "stagiaire_id":  a.rapport.stagiaire.id,
            "stagiaire":     a.rapport.stagiaire.get_full_name() or str(a.rapport.stagiaire),
            "filiere":       a.rapport.stagiaire.filiere,
            "semaine":       a.rapport.semaine_numero,
            "score":         a.score_engagement,
            "niveau_alerte": a.niveau_alerte,
            "motif":         a.motif_alerte,
            "date_analyse":  a.date_analyse,
        }
        for a in analyses
    ]
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def statut_analyse(request, rapport_id):
    """GET /api/analyse/statut/<rapport_id>/ — Statut de l'analyse d'un rapport"""
    try:
        rapport = RapportHebdomadaire.objects.get(pk=rapport_id)
    except RapportHebdomadaire.DoesNotExist:
        return Response({"error": "Rapport introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if request.user.is_stagiaire and rapport.stagiaire_id != request.user.id:
        return Response({"error": "Accès non autorisé."}, status=403)

    try:
        analyse = rapport.analyse_ia
        return Response({
            "rapport_id":        rapport_id,
            "analyse_disponible": True,
            "score_engagement":  analyse.score_engagement,
            "niveau_alerte":     analyse.niveau_alerte,
            "progression_estimee": analyse.progression_estimee,
            "date_analyse":      analyse.date_analyse,
        })
    except AnalyseIA.DoesNotExist:
        return Response({
            "rapport_id":        rapport_id,
            "analyse_disponible": False,
            "message":           "Analyse en cours de traitement...",
        })


class AnalyseStatsView(APIView):
    """GET /api/analyse/stats/ — Statistiques globales des analyses (admin uniquement)."""
    permission_classes = [IsAdminRH]

    def get(self, request):
        analyses = AnalyseIA.objects.select_related("rapport__stagiaire")

        # Répartition alertes
        par_niveau = {
            level: analyses.filter(niveau_alerte=level).count()
            for level in ["AUCUNE", "FAIBLE", "MOYENNE", "ELEVEE"]
        }

        # Répartition progression
        par_progression = {
            niveau: analyses.filter(progression_estimee=niveau).count()
            for niveau in ["FAIBLE", "MOYENNE", "BONNE", "EXCELLENTE"]
        }

        # Score global
        score_global = analyses.aggregate(score=Avg("score_engagement"))["score"]

        # Par filière (liste)
        par_filiere = []
        for fd in FILIERE_DATA:
            code = fd["code"]
            qs_f = analyses.filter(rapport__stagiaire__filiere=code)
            score_f = qs_f.aggregate(score=Avg("score_engagement"))["score"]
            alertes_f = qs_f.filter(niveau_alerte__in=["MOYENNE", "ELEVEE"]).count()
            par_filiere.append({
                "filiere":        code,
                "label":          fd["label"],
                "nb_analyses":    qs_f.count(),
                "score_moyen":    round(score_f, 1) if score_f is not None else None,
                "alertes_actives": alertes_f,
            })

        # Évolution des scores par semaine
        evolution_qs = (
            analyses
            .values("rapport__semaine_numero")
            .annotate(score_moyen=Avg("score_engagement"))
            .order_by("rapport__semaine_numero")
        )
        evolution_scores = [
            {
                "semaine":    e["rapport__semaine_numero"],
                "score_moyen": round(e["score_moyen"], 1),
            }
            for e in evolution_qs
            if e["rapport__semaine_numero"] is not None
        ]

        return Response({
            "total_analyses":         analyses.count(),
            "score_moyen_global":     round(score_global, 1) if score_global is not None else None,
            "par_niveau_alerte":      par_niveau,
            "repartition_progression": par_progression,
            "par_filiere":            par_filiere,
            "evolution_scores":       evolution_scores,
        })
