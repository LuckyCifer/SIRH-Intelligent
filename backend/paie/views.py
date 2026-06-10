from decimal import Decimal
from datetime import date
from django.db.models import Sum, Avg, Count
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsRH
from .models import ConfigurationPaie, ElementPaie, BulletinPaie
from .serializers import (
    ConfigurationPaieSerializer,
    ElementPaieSerializer,
    BulletinPaieSerializer,
)
from .services import generer_bulletin_pdf


class ConfigurationPaieViewSet(viewsets.ModelViewSet):
    queryset = ConfigurationPaie.objects.all()
    serializer_class = ConfigurationPaieSerializer
    permission_classes = [IsRH]


class ElementPaieViewSet(viewsets.ModelViewSet):
    queryset = ElementPaie.objects.all()
    serializer_class = ElementPaieSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [permissions.IsAuthenticated()]


class BulletinPaieViewSet(viewsets.ModelViewSet):
    serializer_class = BulletinPaieSerializer

    def get_permissions(self):
        if self.action == "mes_bulletins":
            return [permissions.IsAuthenticated()]
        return [IsRH()]

    def get_queryset(self):
        user = self.request.user
        if user.role not in ["RH", "ADMIN"]:
            return BulletinPaie.objects.filter(employe=user).exclude(statut="BROUILLON")

        qs = BulletinPaie.objects.select_related(
            "employe", "genere_par", "valide_par"
        )
        for param in ("employe", "mois", "annee", "statut"):
            val = self.request.query_params.get(param)
            if val:
                qs = qs.filter(**{param: val})
        return qs

    def perform_create(self, serializer):
        bulletin = serializer.save(genere_par=self.request.user)
        bulletin.calculer()
        bulletin.save()

    # ── Actions ──────────────────────────────────────────────────────────────

    @action(detail=False, methods=["post"], url_path="generer-masse")
    def generer_masse(self, request):
        """Génération idempotente des bulletins pour tous les employés actifs."""
        mois  = request.data.get("mois")
        annee = request.data.get("annee")
        if not mois or not annee:
            return Response({"error": "mois et annee sont requis."}, status=400)

        from django.contrib.auth import get_user_model
        Usr = get_user_model()
        employes = Usr.objects.filter(role__in=["EMPLOYE", "MANAGER"], is_active=True)

        crees = skips = 0
        for emp in employes:
            contrat = emp.contrats.filter(statut="ACTIF").order_by("-date_debut").first()
            salaire = (contrat.salaire if contrat and contrat.salaire else Decimal("0"))
            bulletin, created = BulletinPaie.objects.get_or_create(
                employe=emp,
                mois=int(mois),
                annee=int(annee),
                defaults={"salaire_brut": salaire, "genere_par": request.user},
            )
            if created:
                bulletin.calculer()
                bulletin.save()
                crees += 1
            else:
                skips += 1

        return Response({
            "crees":   crees,
            "ignores": skips,
            "message": f"{crees} bulletin(s) créé(s), {skips} existant(s) ignoré(s).",
        })

    @action(detail=True, methods=["post"])
    def valider(self, request, pk=None):
        bulletin = self.get_object()
        if bulletin.statut != "BROUILLON":
            return Response(
                {"error": "Seuls les bulletins en brouillon peuvent être validés."},
                status=400,
            )
        from django.utils import timezone
        bulletin.statut          = "VALIDE"
        bulletin.valide_par      = request.user
        bulletin.date_validation = timezone.now()
        bulletin.save()
        return Response(BulletinPaieSerializer(bulletin).data)

    @action(detail=True, methods=["post"], url_path="marquer-paye")
    def marquer_paye(self, request, pk=None):
        bulletin = self.get_object()
        if bulletin.statut != "VALIDE":
            return Response(
                {"error": "Seuls les bulletins validés peuvent être marqués payés."},
                status=400,
            )
        bulletin.statut        = "PAYE"
        bulletin.date_paiement = request.data.get("date_paiement") or date.today().isoformat()
        bulletin.save()
        try:
            from notifications.services import notifier_bulletin_disponible
            notifier_bulletin_disponible(bulletin)
        except Exception:
            pass
        return Response(BulletinPaieSerializer(bulletin).data)

    @action(detail=True, methods=["get"], url_path="telecharger-pdf")
    def telecharger_pdf(self, request, pk=None):
        bulletin = self.get_object()
        pdf_bytes, content_type, filename = generer_bulletin_pdf(bulletin)
        response = HttpResponse(pdf_bytes, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path="stats-masse-salariale")
    def stats_masse_salariale(self, request):
        qs = BulletinPaie.objects.all()
        for param in ("mois", "annee"):
            val = request.query_params.get(param)
            if val:
                qs = qs.filter(**{param: val})

        agg = qs.aggregate(
            masse_brute   = Sum("salaire_brut"),
            masse_nette   = Sum("salaire_net"),
            total_cnps    = Sum("cnps_employe"),
            total_irpp    = Sum("irpp"),
            nb_bulletins  = Count("id"),
            salaire_moyen = Avg("salaire_net"),
        )
        return Response({
            "masse_brute":   int(agg["masse_brute"]   or 0),
            "masse_nette":   int(agg["masse_nette"]   or 0),
            "total_cnps":    int(agg["total_cnps"]    or 0),
            "total_irpp":    int(agg["total_irpp"]    or 0),
            "nb_bulletins":  agg["nb_bulletins"]       or 0,
            "salaire_moyen": round(float(agg["salaire_moyen"] or 0)),
            "bulletins_par_statut": {
                s: qs.filter(statut=s).count()
                for s, _ in BulletinPaie.Statut.choices
            },
        })

    @action(detail=False, methods=["get"], url_path="mes-bulletins")
    def mes_bulletins(self, request):
        bulletins = (
            BulletinPaie.objects
            .filter(employe=request.user)
            .exclude(statut="BROUILLON")
            .order_by("-annee", "-mois")
        )
        return Response(BulletinPaieSerializer(bulletins, many=True).data)
