from django.db.models import Avg
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.permissions import IsEncadreurOrAdmin, IsStagiaire
from .models import StagePeriode, ProjetSoutenance
from .serializers import StagePeriodeSerializer, ProjetSoutenanceSerializer


class StagePeriodeListCreateView(generics.ListCreateAPIView):
    serializer_class   = StagePeriodeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_stagiaire:
            return StagePeriode.objects.filter(stagiaire=user)
        if user.is_encadreur:
            return StagePeriode.objects.filter(encadreur=user)
        return StagePeriode.objects.all()

    def perform_create(self, serializer):
        # Seul l'admin/encadreur peut créer une période
        serializer.save()


class StagePeriodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = StagePeriode.objects.all()
    serializer_class   = StagePeriodeSerializer
    permission_classes = [IsEncadreurOrAdmin]


class ProjetSoutenanceListCreateView(generics.ListCreateAPIView):
    serializer_class   = ProjetSoutenanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_stagiaire:
            return ProjetSoutenance.objects.filter(stagiaire=user)
        if user.is_encadreur:
            return ProjetSoutenance.objects.filter(stagiaire__periodes_stage__encadreur=user).distinct()
        return ProjetSoutenance.objects.all()

    def perform_create(self, serializer):
        if self.request.user.is_stagiaire:
            serializer.save(stagiaire=self.request.user)
        else:
            serializer.save()


class ProjetSoutenanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = ProjetSoutenance.objects.all()
    serializer_class   = ProjetSoutenanceSerializer
    permission_classes = [permissions.IsAuthenticated]


class EncadreurDashboardView(APIView):
    """GET /api/stagiaires/dashboard/ — Vue tableau de bord encadreur.
    Retourne la liste des stagiaires en cours avec score IA et niveau d'alerte.
    Exemple : GET /api/stagiaires/dashboard/ → [{id, nom, filiere, nb_rapports, ...}, ...]
    """
    permission_classes = [IsEncadreurOrAdmin]

    def get(self, request):
        from rapports.models import RapportHebdomadaire
        from analyse_ia.models import AnalyseIA

        user = request.user
        if user.is_encadreur:
            periodes = StagePeriode.objects.filter(
                encadreur=user, statut=StagePeriode.Statut.EN_COURS
            ).select_related("stagiaire")
        else:
            periodes = StagePeriode.objects.filter(
                statut=StagePeriode.Statut.EN_COURS
            ).select_related("stagiaire")

        result = []
        seen = set()
        for periode in periodes:
            stagiaire = periode.stagiaire
            if stagiaire.id in seen:
                continue
            seen.add(stagiaire.id)

            nb_rapports = RapportHebdomadaire.objects.filter(stagiaire=stagiaire).count()
            derniere = AnalyseIA.objects.filter(
                rapport__stagiaire=stagiaire
            ).order_by("-date_analyse").first()

            result.append({
                "id":              stagiaire.id,
                "nom":             stagiaire.get_full_name() or stagiaire.username,
                "username":        stagiaire.username,
                "filiere":         stagiaire.filiere,
                "nb_rapports":     nb_rapports,
                "dernier_score_ia": derniere.score_engagement if derniere else None,
                "niveau_alerte":   derniere.niveau_alerte if derniere else "AUCUNE",
                "periode_id":      periode.id,
            })

        return Response(result)


@api_view(["GET"])
@permission_classes([IsEncadreurOrAdmin])
def mon_dashboard_encadreur(request):
    """GET /api/stagiaires/mon-dashboard/ — Vue enrichie pour l'encadreur"""
    from rapports.models import RapportHebdomadaire
    from analyse_ia.models import AnalyseIA

    user = request.user
    if user.is_encadreur:
        periodes = StagePeriode.objects.filter(
            encadreur=user
        ).select_related("stagiaire").order_by("-date_debut")
    else:
        periodes = StagePeriode.objects.all().select_related("stagiaire").order_by("-date_debut")

    # Déduplique par stagiaire — garde la période la plus récente
    stagiaires_map = {}
    for p in periodes:
        if p.stagiaire_id not in stagiaires_map:
            stagiaires_map[p.stagiaire_id] = p

    stagiaires_data = []
    for periode in stagiaires_map.values():
        stagiaire = periode.stagiaire

        qs_r = RapportHebdomadaire.objects.filter(stagiaire=stagiaire)
        total      = qs_r.count()
        brouillons = qs_r.filter(statut="BROUILLON").count()
        soumis     = qs_r.filter(statut="SOUMIS").count()
        valides    = qs_r.filter(statut="VALIDE").count()
        rejetes    = qs_r.filter(statut="REJETE").count()

        analyses   = AnalyseIA.objects.filter(rapport__stagiaire=stagiaire)
        score_moy  = analyses.aggregate(m=Avg("score_engagement"))["m"]
        derniere   = analyses.order_by("-date_analyse").first()

        projet = None
        try:
            projet = stagiaire.projet_soutenance
        except Exception:
            pass

        stagiaires_data.append({
            "id":         stagiaire.id,
            "nom_complet": stagiaire.get_full_name() or stagiaire.username,
            "username":   stagiaire.username,
            "filiere":    stagiaire.filiere,
            "photo":      stagiaire.photo.url if stagiaire.photo else None,
            "periode": {
                "date_debut":     str(periode.date_debut),
                "date_fin":       str(periode.date_fin),
                "statut":         periode.statut,
                "duree_semaines": periode.duree_semaines,
            },
            "projet": {"theme": projet.theme, "statut": projet.statut} if projet else None,
            "rapports": {
                "total": total, "brouillons": brouillons,
                "soumis": soumis, "valides": valides, "rejetes": rejetes,
                "en_attente_validation": soumis,
            },
            "ia": {
                "score_moyen":    round(score_moy, 1) if score_moy is not None else None,
                "dernier_score":  derniere.score_engagement if derniere else None,
                "niveau_alerte":  derniere.niveau_alerte if derniere else "AUCUNE",
            },
        })

    scores_list      = [s["ia"]["score_moyen"] for s in stagiaires_data if s["ia"]["score_moyen"] is not None]
    score_moy_global = round(sum(scores_list) / len(scores_list), 1) if scores_list else None
    alertes_actives  = sum(1 for s in stagiaires_data if s["ia"]["niveau_alerte"] in ["MOYENNE", "ELEVEE"])
    en_attente       = sum(s["rapports"]["en_attente_validation"] for s in stagiaires_data)

    return Response({
        "stagiaires": stagiaires_data,
        "resume": {
            "total_stagiaires":   len(stagiaires_data),
            "rapports_en_attente": en_attente,
            "alertes_actives":    alertes_actives,
            "score_moyen_global": score_moy_global,
        },
    })


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def detail_stagiaire(request, stagiaire_id):
    """GET /api/stagiaires/<id>/detail/ — Fiche complète d'un stagiaire"""
    from rapports.models import RapportHebdomadaire
    from rapports.serializers import RapportHebdomadaireSerializer
    from analyse_ia.models import AnalyseIA
    from accounts.models import User as UserModel

    user = request.user
    if user.is_stagiaire and user.id != stagiaire_id:
        return Response({"error": "Accès non autorisé."}, status=403)
    if user.is_encadreur:
        if not StagePeriode.objects.filter(encadreur=user, stagiaire_id=stagiaire_id).exists():
            return Response({"error": "Ce stagiaire ne vous est pas assigné."}, status=403)

    try:
        stagiaire = UserModel.objects.get(pk=stagiaire_id, role="STAGIAIRE")
    except UserModel.DoesNotExist:
        return Response({"error": "Stagiaire introuvable."}, status=404)

    periode = StagePeriode.objects.filter(stagiaire=stagiaire).order_by("-date_debut").first()

    projet = None
    try:
        projet = stagiaire.projet_soutenance
    except Exception:
        pass

    rapports = (
        RapportHebdomadaire.objects
        .filter(stagiaire=stagiaire)
        .prefetch_related("analyse_ia")
        .order_by("semaine_numero")
    )

    evolution_ia = []
    for r in rapports:
        try:
            a = r.analyse_ia
            evolution_ia.append({
                "semaine": r.semaine_numero,
                "score":   a.score_engagement,
                "niveau_alerte": a.niveau_alerte,
            })
        except Exception:
            pass

    return Response({
        "id":         stagiaire.id,
        "nom_complet": stagiaire.get_full_name() or stagiaire.username,
        "username":   stagiaire.username,
        "email":      stagiaire.email,
        "telephone":  stagiaire.telephone,
        "filiere":    stagiaire.filiere,
        "photo":      stagiaire.photo.url if stagiaire.photo else None,
        "periode": {
            "id":             periode.id,
            "date_debut":     str(periode.date_debut),
            "date_fin":       str(periode.date_fin),
            "statut":         periode.statut,
            "duree_semaines": periode.duree_semaines,
        } if periode else None,
        "projet": {
            "id":               projet.id,
            "theme":            projet.theme,
            "description":      projet.description,
            "statut":           projet.statut,
            "date_soutenance":  str(projet.date_soutenance) if projet.date_soutenance else None,
            "note":             str(projet.note) if projet.note is not None else None,
        } if projet else None,
        "rapports":    RapportHebdomadaireSerializer(rapports, many=True).data,
        "evolution_ia": evolution_ia,
    })


@api_view(["GET"])
@permission_classes([IsEncadreurOrAdmin])
def mes_stats_encadreur(request):
    """GET /api/stagiaires/mes-stats/ — Stats globales de l'encadreur connecté"""
    from rapports.models import RapportHebdomadaire
    from analyse_ia.models import AnalyseIA
    from accounts.models import User as UserModel

    user = request.user
    if user.is_encadreur:
        periodes = StagePeriode.objects.filter(encadreur=user).select_related("stagiaire")
    else:
        periodes = StagePeriode.objects.all().select_related("stagiaire")

    stagiaires_ids = list({p.stagiaire_id for p in periodes})

    par_filiere: dict = {}
    for s in UserModel.objects.filter(id__in=stagiaires_ids):
        par_filiere[s.filiere] = par_filiere.get(s.filiere, 0) + 1

    qs_r          = RapportHebdomadaire.objects.filter(stagiaire_id__in=stagiaires_ids)
    en_attente    = qs_r.filter(statut="SOUMIS").count()
    traites       = qs_r.filter(statut__in=["SOUMIS", "VALIDE", "REJETE"]).count()
    valides       = qs_r.filter(statut="VALIDE").count()
    taux          = round(valides / traites * 100, 1) if traites > 0 else 0.0

    score_global  = AnalyseIA.objects.filter(
        rapport__stagiaire_id__in=stagiaires_ids
    ).aggregate(score=Avg("score_engagement"))["score"]

    alertes = (
        AnalyseIA.objects
        .filter(rapport__stagiaire_id__in=stagiaires_ids, niveau_alerte__in=["MOYENNE", "ELEVEE"])
        .values_list("rapport__stagiaire_id", flat=True)
        .distinct()
        .count()
    )

    return Response({
        "total_stagiaires":  len(stagiaires_ids),
        "par_filiere":       par_filiere,
        "rapports_en_attente": en_attente,
        "score_moyen_global": round(score_global, 1) if score_global is not None else None,
        "taux_validation":   taux,
        "alertes_actives":   alertes,
    })
