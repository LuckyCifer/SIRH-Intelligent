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

    @action(detail=False, methods=["post"])
    def pointer_arrivee(self, request):
        aujourd_hui = _today_local()
        heure_now   = _now_local()
        pointage, created = Pointage.objects.get_or_create(
            employe=request.user,
            date=aujourd_hui,
            defaults={"heure_arrivee": heure_now, "statut": "PRESENT"},
        )
        if not created and pointage.heure_arrivee:
            return Response(
                {"error": "Vous avez déjà pointé votre arrivée aujourd'hui."},
                status=400,
            )
        if not created:
            pointage.heure_arrivee = heure_now
            pointage.statut = "PRESENT"
            pointage.save()
        return Response({
            "message": f"Arrivée enregistrée à {heure_now.strftime('%H:%M')}",
            "pointage": PointageSerializer(pointage).data,
        })

    @action(detail=False, methods=["post"])
    def pointer_depart(self, request):
        aujourd_hui = _today_local()
        heure_now   = _now_local()
        try:
            pointage = Pointage.objects.get(employe=request.user, date=aujourd_hui)
        except Pointage.DoesNotExist:
            return Response({"error": "Pointez d'abord votre arrivée."}, status=400)
        pointage.heure_depart = heure_now
        pointage.save()
        return Response({
            "message": f"Départ enregistré à {heure_now.strftime('%H:%M')}",
            "heures_travaillees": str(pointage.heures_travaillees),
            "pointage": PointageSerializer(pointage).data,
        })

    @action(detail=False, methods=["get"])
    def mon_pointage_aujourd_hui(self, request):
        aujourd_hui = _today_local()
        try:
            p = Pointage.objects.get(employe=request.user, date=aujourd_hui)
            return Response(PointageSerializer(p).data)
        except Pointage.DoesNotExist:
            return Response({"pointage": None, "message": "Pas encore pointé aujourd'hui"})

    @action(detail=False, methods=["get"])
    def stats_mensuel(self, request):
        maintenant = timezone.localtime(timezone.now())
        pointages  = Pointage.objects.filter(
            employe=request.user,
            date__year=maintenant.year,
            date__month=maintenant.month,
        )
        total     = pointages.count()
        presences = pointages.filter(statut__in=["PRESENT", "RETARD"]).count()
        return Response({
            "mois":           maintenant.strftime("%B %Y"),
            "jours_presents": pointages.filter(statut="PRESENT").count(),
            "jours_absents":  pointages.filter(statut="ABSENT").count(),
            "jours_retard":   pointages.filter(statut="RETARD").count(),
            "total_heures":   round(sum(float(p.heures_travaillees or 0) for p in pointages), 2),
            "heures_sup":     round(sum(float(p.heures_supplementaires or 0) for p in pointages), 2),
            "taux_presence":  round(presences / max(1, total) * 100, 1),
        })


class ConfigPresenceViewSet(viewsets.ModelViewSet):
    queryset           = ConfigPresence.objects.all()
    serializer_class   = ConfigPresenceSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def rapport_presence_equipe(request):
    mois_param = request.query_params.get(
        "mois", timezone.localtime(timezone.now()).strftime("%Y-%m")
    )
    try:
        annee, mois = mois_param.split("-")
    except ValueError:
        return Response({"error": "Format mois invalide (attendu : YYYY-MM)."}, status=400)

    from accounts.models import User
    if request.user.role == "MANAGER":
        employes = User.objects.filter(
            departement__in=request.user.departements_diriges.all(),
            role="EMPLOYE",
        )
    else:
        employes = User.objects.filter(role="EMPLOYE")

    rapport = []
    for emp in employes:
        pts = Pointage.objects.filter(employe=emp, date__year=annee, date__month=mois)
        total     = pts.count()
        presences = pts.filter(statut__in=["PRESENT", "RETARD"]).count()
        rapport.append({
            "employe_id":     emp.id,
            "nom_complet":    emp.get_full_name() or emp.username,
            "departement":    emp.departement.nom if emp.departement else "—",
            "jours_presents": pts.filter(statut="PRESENT").count(),
            "jours_absents":  pts.filter(statut="ABSENT").count(),
            "jours_retard":   pts.filter(statut="RETARD").count(),
            "total_heures":   round(sum(float(p.heures_travaillees or 0) for p in pts), 2),
            "taux_presence":  round(presences / max(1, total) * 100, 1),
        })
    return Response({"mois": mois_param, "employes": rapport})
