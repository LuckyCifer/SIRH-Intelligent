from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from .models import Pointage, ConfigPresence
from .serializers import PointageSerializer, ConfigPresenceSerializer


def _today_local():
    return timezone.localtime(timezone.now()).date()


def _now_local():
    return timezone.localtime(timezone.now()).time()


def _calculer_statut_arrivee(heure_arrivee):
    """Retourne 'RETARD' si l'arrivée dépasse heure standard + tolérance, sinon 'PRESENT'."""
    try:
        config = ConfigPresence.objects.first()
        if not config:
            return "PRESENT"
        from datetime import date as date_type, time as time_type
        base = datetime.combine(date_type.today(), config.heure_arrivee_standard)
        limite = (base + timedelta(minutes=int(config.tolerance_retard_minutes))).time()
        return "RETARD" if heure_arrivee > limite else "PRESENT"
    except Exception:
        return "PRESENT"


def _jours_ouvres_mois(annee, mois, jusqu_au=None):
    """Nombre de jours ouvrés (lundi–vendredi) dans le mois, jusqu'à une date max."""
    from datetime import date as date_type
    import calendar as cal_mod
    dernier = until = date_type(annee, mois, cal_mod.monthrange(annee, mois)[1])
    if jusqu_au and jusqu_au < dernier:
        until = jusqu_au
    debut = date_type(annee, mois, 1)
    count = 0
    d = debut
    while d <= until:
        if d.weekday() < 5:  # lundi=0 … vendredi=4
            count += 1
        d += timedelta(days=1)
    return count


def _recalculer_hs_si_besoin(pointage):
    """Déclenche le recalcul HS hebdomadaire si le pointage est complet."""
    if pointage and pointage.heure_arrivee and pointage.heure_depart:
        try:
            from .calculateur_hs import CalculateurHeuresSupplementaires
            CalculateurHeuresSupplementaires().recalculer_hs_semaine_employe(
                pointage.employe, pointage.date
            )
        except Exception:
            pass


class PointageViewSet(viewsets.ModelViewSet):
    serializer_class   = PointageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = Pointage.objects.select_related("employe", "valide_par")

        date_debut = self.request.query_params.get("date_debut")
        date_fin   = self.request.query_params.get("date_fin")
        employe_id = self.request.query_params.get("employe")
        mois       = self.request.query_params.get("mois")

        if date_debut:
            qs = qs.filter(date__gte=date_debut)
        if date_fin:
            qs = qs.filter(date__lte=date_fin)
        if employe_id:
            qs = qs.filter(employe_id=employe_id)
        if mois:
            try:
                annee, mois_num = mois.split("-")
                qs = qs.filter(date__year=annee, date__month=mois_num)
            except ValueError:
                pass

        if user.role == "EMPLOYE":
            return qs.filter(employe=user)
        if user.role == "MANAGER":
            return qs.filter(
                employe__departement__in=user.departements_diriges.all()
            )
        return qs

    def perform_create(self, serializer):
        pointage = serializer.save()
        _recalculer_hs_si_besoin(pointage)

    def perform_update(self, serializer):
        pointage = serializer.save()
        _recalculer_hs_si_besoin(pointage)

    @action(detail=False, methods=["post"], url_path="pointer-arrivee")
    def pointer_arrivee(self, request):
        aujourd_hui = _today_local()
        heure_now   = _now_local()

        # Déterminer le statut : RETARD si arrivée après heure standard + tolérance
        statut = _calculer_statut_arrivee(heure_now)

        pointage, created = Pointage.objects.get_or_create(
            employe=request.user,
            date=aujourd_hui,
            defaults={"heure_arrivee": heure_now, "statut": statut},
        )
        if not created and pointage.heure_arrivee:
            return Response(
                {"error": "Vous avez déjà pointé votre arrivée aujourd'hui."},
                status=400,
            )
        if not created:
            pointage.heure_arrivee = heure_now
            pointage.statut = statut
            pointage.save()

        msg = f"Arrivée enregistrée à {heure_now.strftime('%H:%M')}"
        if pointage.est_retard:
            msg += f" — Retard de {pointage.minutes_retard}min"
        return Response({
            "message": msg,
            "pointage": PointageSerializer(pointage).data,
        })

    @action(detail=False, methods=["post"], url_path="pointer-depart")
    def pointer_depart(self, request):
        aujourd_hui = _today_local()
        heure_now   = _now_local()
        try:
            pointage = Pointage.objects.get(employe=request.user, date=aujourd_hui)
        except Pointage.DoesNotExist:
            return Response({"error": "Pointez d'abord votre arrivée."}, status=400)
        pointage.heure_depart = heure_now
        pointage.save()
        _recalculer_hs_si_besoin(pointage)
        return Response({
            "message": f"Départ enregistré à {heure_now.strftime('%H:%M')}",
            "heures_travaillees": str(pointage.heures_travaillees),
            "pointage": PointageSerializer(pointage).data,
        })

    @action(detail=False, methods=["get"], url_path="mon-pointage-aujourd-hui")
    def mon_pointage_aujourd_hui(self, request):
        aujourd_hui = _today_local()
        try:
            p = Pointage.objects.get(employe=request.user, date=aujourd_hui)
            return Response(PointageSerializer(p).data)
        except Pointage.DoesNotExist:
            return Response({"pointage": None, "message": "Pas encore pointé aujourd'hui"})

    @action(detail=False, methods=["get"], url_path="stats-mensuel")
    def stats_mensuel(self, request):
        maintenant = timezone.localtime(timezone.now())
        annee      = maintenant.year
        mois       = maintenant.month
        today      = maintenant.date()
        pointages  = Pointage.objects.filter(
            employe=request.user,
            date__year=annee,
            date__month=mois,
        )
        pts_list     = list(pointages)
        jours_retard = sum(1 for p in pts_list if p.est_retard)
        jours_pres   = sum(1 for p in pts_list if p.statut in ("PRESENT", "RETARD"))
        presences    = jours_pres

        # Absences = jours ouvrés écoulés - jours avec un pointage (présent ou retard)
        jours_ouvres  = _jours_ouvres_mois(annee, mois, jusqu_au=today)
        dates_pointees = {
            p.date for p in pts_list if p.statut in ("PRESENT", "RETARD", "CONGE", "FERIE")
        }
        jours_absents = max(0, jours_ouvres - len(dates_pointees))

        return Response({
            "mois":             maintenant.strftime("%B %Y"),
            "jours_presents":   jours_pres,
            "jours_absents":    jours_absents,
            "jours_retard":     jours_retard,
            "total_heures":     round(sum(float(p.heures_travaillees or 0) for p in pts_list), 2),
            "heures_sup":       round(sum(float(p.heures_supplementaires or 0) for p in pts_list), 2),
            "hs_jour":          round(sum(float(p.hs_jour_20 or 0) + float(p.hs_jour_30 or 0) for p in pts_list), 2),
            "hs_nuit":          round(sum(float(p.hs_nuit or 0) for p in pts_list), 2),
            "hs_weekend_ferie": round(sum(float(p.hs_dimanche or 0) + float(p.hs_ferie or 0) for p in pts_list), 2),
            "montant_hs":       round(sum(float(p.montant_hs_total or 0) for p in pts_list), 0),
            "taux_presence":    round(presences / max(1, jours_ouvres) * 100, 1),
        })


class ConfigPresenceViewSet(viewsets.ModelViewSet):
    queryset           = ConfigPresence.objects.all()
    serializer_class   = ConfigPresenceSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def rapport_presence_equipe(request):
    import calendar as cal_mod
    from datetime import date as date_type

    mois_param = request.query_params.get(
        "mois", timezone.localtime(timezone.now()).strftime("%Y-%m")
    )
    try:
        annee_str, mois_str = mois_param.split("-")
        annee_int, mois_int = int(annee_str), int(mois_str)
    except ValueError:
        return Response({"error": "Format mois invalide (attendu : YYYY-MM)."}, status=400)

    today = date_type.today()
    # Pour le mois en cours, on calcule jusqu'à aujourd'hui ; sinon jusqu'à la fin du mois.
    if (annee_int, mois_int) == (today.year, today.month):
        jusqu_au = today
    else:
        jusqu_au = date_type(annee_int, mois_int, cal_mod.monthrange(annee_int, mois_int)[1])

    jours_ouvres = _jours_ouvres_mois(annee_int, mois_int, jusqu_au=jusqu_au)

    from accounts.models import User
    entreprise = getattr(request.user, "entreprise", None)

    if request.user.role == "MANAGER":
        employes = User.objects.filter(
            departement__in=request.user.departements_diriges.all(),
            role="EMPLOYE",
        )
    elif entreprise:
        employes = User.objects.filter(role="EMPLOYE", entreprise=entreprise)
    else:
        employes = User.objects.filter(role="EMPLOYE")

    rapport = []
    for emp in employes:
        pts      = Pointage.objects.filter(employe=emp, date__year=annee_int, date__month=mois_int)
        pts_list = list(pts)

        nb_retards  = pts.filter(statut="RETARD").count()
        nb_presents = pts.filter(statut__in=("PRESENT", "RETARD")).count()
        presences   = nb_presents

        # Absences = jours ouvrés écoulés – jours avec un statut justifié (présent/retard/congé/férié)
        dates_justifiees = {
            p.date for p in pts_list
            if p.statut in ("PRESENT", "RETARD", "CONGE", "FERIE")
        }
        jours_absents = max(0, jours_ouvres - len(dates_justifiees))

        # Taux basé sur les jours ouvrés écoulés, pas sur le nombre de pointages enregistrés
        taux = round(presences / max(1, jours_ouvres) * 100, 1)

        rapport.append({
            "employe_id":       emp.id,
            "nom_complet":      emp.get_full_name() or emp.username,
            "departement":      emp.departement.nom if emp.departement else "—",
            "jours_presents":   nb_presents,
            "jours_absents":    jours_absents,
            "jours_retard":     nb_retards,
            "total_heures":     round(sum(float(p.heures_travaillees or 0) for p in pts_list), 2),
            "taux_presence":    taux,
            "hs_jour":          round(sum(float(p.hs_jour_20 or 0) + float(p.hs_jour_30 or 0) for p in pts_list), 2),
            "hs_nuit":          round(sum(float(p.hs_nuit or 0) for p in pts_list), 2),
            "hs_weekend_ferie": round(sum(float(p.hs_dimanche or 0) + float(p.hs_ferie or 0) for p in pts_list), 2),
            "montant_hs":       round(sum(float(p.montant_hs_total or 0) for p in pts_list), 0),
        })
    return Response({"mois": mois_param, "employes": rapport})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def jours_feries_annee(request, annee):
    """GET /api/presences/jours-feries/{annee}/ — Liste des jours fériés camerounais."""
    from .calculateur_hs import CalculateurHeuresSupplementaires
    calc   = CalculateurHeuresSupplementaires()
    feries = calc.get_jours_feries_avec_noms(int(annee))
    return Response({"annee": annee, "jours_feries": feries, "total": len(feries)})
