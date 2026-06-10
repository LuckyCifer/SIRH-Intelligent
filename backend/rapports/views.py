import threading
import logging
from django.db.models import Avg, Max
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsEncadreurOrAdmin
from .models import RapportHebdomadaire
from .serializers import RapportHebdomadaireSerializer

logger = logging.getLogger(__name__)


def _analyse_en_thread(rapport_pk: int) -> None:
    """Lance analyser_rapport dans un thread daemon, gère les connexions DB."""
    from django.db import close_old_connections
    from analyse_ia.services import analyser_rapport
    close_old_connections()
    try:
        rapport = RapportHebdomadaire.objects.get(pk=rapport_pk)
        analyser_rapport(rapport)
    except Exception as e:
        logger.error(f"Thread analyse rapport #{rapport_pk}: {e}")
    finally:
        close_old_connections()


class RapportListCreateView(generics.ListCreateAPIView):
    serializer_class   = RapportHebdomadaireSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = RapportHebdomadaire.objects.select_related("stagiaire").prefetch_related("analyse_ia")
        if user.is_stagiaire:
            qs = qs.filter(stagiaire=user)
        elif user.is_encadreur:
            qs = qs.filter(stagiaire__periodes_stage__encadreur=user).distinct()
        # Filtres optionnels : ?stagiaire=<id>  ?statut=SOUMIS|VALIDE|...
        stagiaire_id = self.request.query_params.get("stagiaire")
        if stagiaire_id:
            qs = qs.filter(stagiaire_id=stagiaire_id)
        statut = self.request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        return qs

    def perform_create(self, serializer):
        if self.request.user.is_stagiaire:
            serializer.save(stagiaire=self.request.user)
        else:
            serializer.save()


class RapportDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = RapportHebdomadaire.objects.all()
    serializer_class   = RapportHebdomadaireSerializer
    permission_classes = [IsAuthenticated]


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def soumettre_rapport(request, pk):
    """Soumettre un rapport brouillon → déclenche l'analyse IA automatiquement"""
    try:
        rapport = RapportHebdomadaire.objects.get(pk=pk, stagiaire=request.user)
    except RapportHebdomadaire.DoesNotExist:
        return Response({"error": "Rapport introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if rapport.statut != RapportHebdomadaire.Statut.BROUILLON:
        return Response({"error": "Seul un brouillon peut être soumis."}, status=status.HTTP_400_BAD_REQUEST)

    rapport.statut = RapportHebdomadaire.Statut.SOUMIS
    rapport.date_soumission = timezone.now()
    rapport.save()

    # Déclencher l'analyse IA de manière asynchrone (non bloquante)
    thread = threading.Thread(target=_analyse_en_thread, args=(rapport.pk,), daemon=True)
    thread.start()

    return Response({
        "message": "Rapport soumis. Analyse IA en cours...",
        "statut": rapport.statut,
        "analyse_en_cours": True,
    })


@api_view(["POST"])
@permission_classes([IsEncadreurOrAdmin])
def valider_rapport(request, pk):
    """Encadreur valide ou rejette un rapport"""
    try:
        rapport = RapportHebdomadaire.objects.get(pk=pk)
    except RapportHebdomadaire.DoesNotExist:
        return Response({"error": "Rapport introuvable."}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get("action")  # "valider" ou "rejeter"
    commentaire = request.data.get("commentaire", "")

    if action == "valider":
        rapport.statut = RapportHebdomadaire.Statut.VALIDE
        rapport.date_validation = timezone.now()
    elif action == "rejeter":
        rapport.statut = RapportHebdomadaire.Statut.REJETE
    else:
        return Response({"error": "Action invalide. Utilisez 'valider' ou 'rejeter'."}, status=400)

    rapport.commentaire_encadreur = commentaire
    rapport.save()
    return Response({"message": f"Rapport {rapport.statut.lower()}.", "statut": rapport.statut})


class RapportStatsView(APIView):
    """GET /api/rapports/stats/ — Statistiques des rapports pour l'utilisateur connecté"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = RapportHebdomadaire.objects.all()
        if user.is_stagiaire:
            qs = qs.filter(stagiaire=user)
        elif user.is_encadreur:
            qs = qs.filter(stagiaire__periodes_stage__encadreur=user).distinct()

        par_statut = {
            s: qs.filter(statut=s).count()
            for s in [
                RapportHebdomadaire.Statut.BROUILLON,
                RapportHebdomadaire.Statut.SOUMIS,
                RapportHebdomadaire.Statut.VALIDE,
                RapportHebdomadaire.Statut.REJETE,
            ]
        }
        score_moyen = qs.filter(analyse_ia__isnull=False).aggregate(
            score=Avg("analyse_ia__score_engagement")
        )["score"]
        derniere = (
            qs.filter(statut__in=[
                RapportHebdomadaire.Statut.SOUMIS,
                RapportHebdomadaire.Statut.VALIDE,
            ])
            .order_by("-semaine_numero")
            .values_list("semaine_numero", flat=True)
            .first()
        )

        # Exemple : GET /api/rapports/stats/ → {"total_rapports":3,"par_statut":{...},...}
        return Response({
            "total_rapports": qs.count(),
            "par_statut": par_statut,
            "score_moyen_ia": round(score_moyen, 1) if score_moyen is not None else None,
            "derniere_semaine_soumise": derniere,
        })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mes_stats(request):
    """GET /api/rapports/mes-stats/ — Statistiques personnelles du stagiaire connecté.
    Exemple : GET /api/rapports/mes-stats/ → {total_rapports: 5, valides: 3, score_moyen: 74.5, ...}
    """
    if not request.user.is_stagiaire:
        return Response({"error": "Endpoint réservé aux stagiaires."}, status=403)

    qs = RapportHebdomadaire.objects.filter(stagiaire=request.user)
    total    = qs.count()
    brouillons = qs.filter(statut=RapportHebdomadaire.Statut.BROUILLON).count()
    soumis   = qs.filter(statut=RapportHebdomadaire.Statut.SOUMIS).count()
    valides  = qs.filter(statut=RapportHebdomadaire.Statut.VALIDE).count()
    rejetes  = qs.filter(statut=RapportHebdomadaire.Statut.REJETE).count()

    score_data = qs.filter(analyse_ia__isnull=False).aggregate(
        score_moyen=Avg("analyse_ia__score_engagement"),
        meilleur_score=Max("analyse_ia__score_engagement"),
    )

    dernier = (
        qs.order_by("-semaine_numero")
        .values_list("semaine_numero", flat=True)
        .first()
    )

    soumis_total = soumis + valides + rejetes
    taux = round(soumis_total / total * 100, 1) if total > 0 else 0.0

    return Response({
        "total_rapports":         total,
        "brouillons":             brouillons,
        "soumis":                 soumis,
        "valides":                valides,
        "rejetes":                rejetes,
        "score_moyen":            round(score_data["score_moyen"], 1) if score_data["score_moyen"] else None,
        "meilleur_score":         score_data["meilleur_score"],
        "dernier_rapport_semaine": dernier,
        "taux_soumission":        taux,
    })
