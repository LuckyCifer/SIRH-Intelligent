from decimal import Decimal
from datetime import date
from io import BytesIO
from django.db.models import Sum, Avg, Count
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsRH
from .models import ConfigurationPaie, ElementPaie, BulletinPaie, VirementMobile
from .serializers import (
    ConfigurationPaieSerializer,
    ElementPaieSerializer,
    BulletinPaieSerializer,
    VirementMobileSerializer,
)
from .pdf_generator import generer_bulletin_pdf


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
        entreprise = getattr(user, "entreprise", None)
        if user.role not in ["RH", "ADMIN"]:
            return BulletinPaie.objects.filter(employe=user).exclude(statut="BROUILLON")

        qs = BulletinPaie.objects.select_related("employe", "genere_par", "valide_par")
        if entreprise:
            qs = qs.filter(entreprise=entreprise)
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
        entreprise = getattr(request.user, "entreprise", None)
        employes_qs = Usr.objects.filter(role__in=["EMPLOYE", "MANAGER"], is_active=True)
        if entreprise:
            employes_qs = employes_qs.filter(entreprise=entreprise)
        employes = employes_qs

        crees = skips = 0
        for emp in employes:
            contrat = emp.contrats.filter(statut="ACTIF").order_by("-date_debut").first()
            salaire = (contrat.salaire if contrat and contrat.salaire else Decimal("0"))
            bulletin, created = BulletinPaie.objects.get_or_create(
                employe=emp,
                mois=int(mois),
                annee=int(annee),
                defaults={
                    "salaire_categoriel": salaire,
                    "genere_par": request.user,
                    "entreprise": entreprise,
                },
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
        entreprise = getattr(request.user, "entreprise", None)
        qs = BulletinPaie.objects.filter(entreprise=entreprise) if entreprise else BulletinPaie.objects.all()
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

    @action(detail=True, methods=["post"], url_path="virer")
    def virer(self, request, pk=None):
        """
        POST /api/paie/bulletins/{id}/virer/
        Corps : { operateur: "MTN"|"ORANGE", numero_mobile: "655123456" }
        Initie un virement Mobile Money pour ce bulletin.
        """
        from uuid import uuid4
        from django.utils import timezone
        from .disbursement import initier_virement

        bulletin = self.get_object()
        if bulletin.statut not in ("VALIDE", "PAYE"):
            return Response(
                {"error": "Seuls les bulletins valides ou payes peuvent etre vires."},
                status=400,
            )

        operateur     = request.data.get("operateur", "").upper()
        numero_mobile = request.data.get("numero_mobile", "").strip()

        if operateur not in ("MTN", "ORANGE"):
            return Response({"error": "Operateur invalide. Choisir MTN ou ORANGE."}, status=400)
        if not numero_mobile:
            return Response({"error": "Numero mobile requis."}, status=400)

        # Idempotence : eviter les doublons pour le meme bulletin
        existing = VirementMobile.objects.filter(
            bulletin=bulletin, statut__in=("EN_COURS", "SUCCES")
        ).first()
        if existing:
            return Response(
                {"error": "Un virement est deja en cours ou effectue pour ce bulletin.",
                 "virement": VirementMobileSerializer(existing).data},
                status=400,
            )

        montant = int(bulletin.salaire_net or 0)
        if montant <= 0:
            return Response({"error": "Montant net nul, virement impossible."}, status=400)

        mois_labels = ["", "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
                       "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"]
        motif = f"Salaire {mois_labels[bulletin.mois]} {bulletin.annee}"

        reference_id = str(uuid4())
        try:
            result = initier_virement(operateur, numero_mobile, montant, reference_id, motif)
        except Exception as e:
            return Response({"error": f"Erreur API Mobile Money : {e}"}, status=502)

        entreprise = getattr(request.user, "entreprise", None)
        virement = VirementMobile.objects.create(
            employe=bulletin.employe,
            bulletin=bulletin,
            operateur=operateur,
            numero_mobile=numero_mobile,
            montant=montant,
            motif=motif,
            reference_id=reference_id,
            transaction_id=result.get("transaction_id", ""),
            statut=result.get("statut", "EN_COURS"),
            mode_demo=result.get("mode_demo", True),
            initie_par=request.user,
            entreprise=entreprise,
        )

        # Marquer le bulletin comme PAYE si le virement est directement SUCCES
        if virement.statut == "SUCCES" and bulletin.statut == "VALIDE":
            bulletin.statut        = "PAYE"
            bulletin.date_paiement = timezone.now().date()
            bulletin.save()

        return Response(VirementMobileSerializer(virement).data, status=201)


# ─────────────────────────────────────────────────────────────────────────────
# Virements Mobile Money
# ─────────────────────────────────────────────────────────────────────────────

class VirementMobileViewSet(viewsets.ModelViewSet):
    serializer_class   = VirementMobileSerializer
    permission_classes = [IsRH]
    http_method_names  = ["get", "post", "head", "options"]

    def get_queryset(self):
        entreprise = getattr(self.request.user, "entreprise", None)
        qs = VirementMobile.objects.select_related(
            "employe", "bulletin", "initie_par"
        )
        if entreprise:
            qs = qs.filter(entreprise=entreprise)
        for param in ("operateur", "statut", "employe"):
            val = self.request.query_params.get(param)
            if val:
                qs = qs.filter(**{param: val})
        return qs

    def perform_create(self, serializer):
        from uuid import uuid4
        from .disbursement import initier_virement

        operateur     = serializer.validated_data["operateur"]
        numero_mobile = serializer.validated_data["numero_mobile"]
        montant       = int(serializer.validated_data["montant"])
        motif         = serializer.validated_data.get("motif", "Virement salarial")

        reference_id = str(uuid4())
        try:
            result = initier_virement(operateur, numero_mobile, montant, reference_id, motif)
        except Exception as e:
            from rest_framework.exceptions import APIException
            raise APIException(detail=f"Erreur API Mobile Money : {e}")

        entreprise = getattr(self.request.user, "entreprise", None)
        serializer.save(
            reference_id=reference_id,
            transaction_id=result.get("transaction_id", ""),
            statut=result.get("statut", "EN_COURS"),
            mode_demo=result.get("mode_demo", True),
            initie_par=self.request.user,
            entreprise=entreprise,
        )

    @action(detail=True, methods=["post"], url_path="rafraichir-statut")
    def rafraichir_statut(self, request, pk=None):
        """
        POST /api/paie/virements/{id}/rafraichir-statut/
        Interroge l'API Mobile Money pour mettre a jour le statut.
        """
        from django.utils import timezone
        from .disbursement import rafraichir_statut

        virement = self.get_object()
        if virement.statut in ("SUCCES", "ECHEC", "ANNULE"):
            return Response(VirementMobileSerializer(virement).data)

        try:
            result = rafraichir_statut(virement)
        except Exception as e:
            return Response({"error": f"Erreur lors de la verification : {e}"}, status=502)

        virement.statut = result.get("statut", virement.statut)
        if result.get("transaction_id"):
            virement.transaction_id = result["transaction_id"]
        if result.get("message"):
            virement.message_erreur = result["message"]
        if virement.statut == "SUCCES" and not virement.date_confirmation:
            virement.date_confirmation = timezone.now()
            # Marquer le bulletin PAYE si virement reussi
            if virement.bulletin and virement.bulletin.statut == "VALIDE":
                virement.bulletin.statut        = "PAYE"
                virement.bulletin.date_paiement = timezone.now().date()
                virement.bulletin.save()
        virement.save()
        return Response(VirementMobileSerializer(virement).data)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """Statistiques agrégées des virements pour le dashboard."""
        entreprise = getattr(request.user, "entreprise", None)
        qs = VirementMobile.objects.all()
        if entreprise:
            qs = qs.filter(entreprise=entreprise)

        from django.db.models import Sum, Count
        agg = qs.aggregate(
            total_virements = Count("id"),
            total_montant   = Sum("montant"),
            nb_succes       = Count("id", filter=models.Q(statut="SUCCES")),
            nb_echec        = Count("id", filter=models.Q(statut="ECHEC")),
            nb_en_cours     = Count("id", filter=models.Q(statut="EN_COURS")),
            montant_succes  = Sum("montant", filter=models.Q(statut="SUCCES")),
        )
        taux = 0
        if agg["total_virements"]:
            taux = round(agg["nb_succes"] / agg["total_virements"] * 100, 1)

        return Response({
            "total_virements": agg["total_virements"] or 0,
            "total_montant":   int(agg["total_montant"]  or 0),
            "montant_succes":  int(agg["montant_succes"] or 0),
            "nb_succes":       agg["nb_succes"]   or 0,
            "nb_echec":        agg["nb_echec"]    or 0,
            "nb_en_cours":     agg["nb_en_cours"] or 0,
            "taux_succes":     taux,
            "par_operateur": {
                op: qs.filter(operateur=op).aggregate(
                    n=Count("id"), m=Sum("montant")
                )
                for op, _ in VirementMobile.Operateur.choices
            },
        })


# ─────────────────────────────────────────────────────────────────────────────
# Import Excel
# ─────────────────────────────────────────────────────────────────────────────

class ImportPaieViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsRH]

    @action(detail=False, methods=["post"], url_path="preview")
    def preview(self, request):
        """
        POST /api/paie/import/preview/
        Multipart: { fichier: .xlsx, mois: int, annee: int }
        Analyse le fichier sans rien écrire en base.
        """
        fichier = request.FILES.get("fichier")
        mois    = request.data.get("mois")
        annee   = request.data.get("annee")

        if not fichier:
            return Response({"error": "Fichier manquant."}, status=400)
        if not mois or not annee:
            return Response({"error": "mois et annee sont requis."}, status=400)

        try:
            mois_int  = int(mois)
            annee_int = int(annee)
        except (ValueError, TypeError):
            return Response({"error": "mois et annee doivent être des entiers."}, status=400)

        entreprise = getattr(request.user, "entreprise", None)

        from .importers import ExcelPaieImporter
        result = ExcelPaieImporter().parse(fichier, entreprise, mois_int, annee_int)

        # Marquer les bulletins déjà existants pour avertir le RH
        for entry in result["succes"]:
            entry["bulletin_existant"] = BulletinPaie.objects.filter(
                employe_id=entry["employe_id"],
                mois=mois_int,
                annee=annee_int,
            ).exists()

        return Response(result)

    @action(detail=False, methods=["post"], url_path="confirmer")
    def confirmer(self, request):
        """
        POST /api/paie/import/confirmer/
        JSON: { donnees: [...], mois: int, annee: int }
        Crée ou met à jour les BulletinPaie.
        """
        donnees = request.data.get("donnees", [])
        mois    = request.data.get("mois")
        annee   = request.data.get("annee")

        if not donnees:
            return Response({"error": "Aucune donnée à importer."}, status=400)
        if not mois or not annee:
            return Response({"error": "mois et annee sont requis."}, status=400)

        try:
            mois_int  = int(mois)
            annee_int = int(annee)
        except (ValueError, TypeError):
            return Response({"error": "mois et annee doivent être des entiers."}, status=400)

        entreprise = getattr(request.user, "entreprise", None)
        crees = mis_a_jour = erreurs = 0

        CHAMPS_NOUVEAU = [
            "salaire_categoriel", "sursalaire", "prime_anciennete", "prime_responsabilite",
            "prime_assiduite", "prime_rendement", "gratification",
            "nb_heures_sup_20", "nb_heures_sup_30", "nb_heures_sup_40", "nb_heures_sup_50",
            "taux_horaire",
            "indemnite_transport", "indemnite_logement", "indemnite_representation",
            "avantages_nature", "allocations_familiales", "avances_salaire",
            "numero_cnps_employe", "categorie_pro", "echelon", "coefficient",
            "mode_paiement", "observations",
        ]
        for entry in donnees:
            try:
                fmt = entry.get("format", "ancien")
                if fmt == "nouveau":
                    defaults = {f: entry.get(f, 0) for f in CHAMPS_NOUVEAU}
                    defaults.update({
                        "genere_par": request.user,
                        "entreprise": entreprise,
                        "details":    {"source": "import_excel"},
                    })
                else:
                    from decimal import Decimal as _D
                    defaults = {
                        "salaire_brut":    entry.get("salaire_base", 0),
                        "total_primes":    entry.get("total_primes", 0),
                        "autres_retenues": entry.get("autres_retenues", 0),
                        "genere_par":      request.user,
                        "entreprise":      entreprise,
                        "details":         {"note_rh": entry.get("note_rh", ""), "source": "import_excel"},
                    }

                bulletin, created = BulletinPaie.objects.get_or_create(
                    employe_id=entry["employe_id"],
                    mois=mois_int,
                    annee=annee_int,
                    defaults=defaults,
                )
                if not created:
                    for k, v in defaults.items():
                        if k not in ("genere_par", "entreprise"):
                            setattr(bulletin, k, v)

                bulletin.calculer()
                bulletin.save()

                if created:
                    crees += 1
                else:
                    mis_a_jour += 1
            except Exception:
                erreurs += 1

        return Response({
            "crees":      crees,
            "mis_a_jour": mis_a_jour,
            "erreurs":    erreurs,
            "message":    (
                f"{crees} bulletin(s) créé(s), "
                f"{mis_a_jour} mis à jour"
                + (f", {erreurs} erreur(s)." if erreurs else ".")
            ),
        })

    @action(detail=False, methods=["get"], url_path="template")
    def telecharger_template(self, request):
        """
        GET /api/paie/import/template/
        Génère et retourne un fichier .xlsx avec en-têtes + exemples + onglet Instructions.
        """
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Données Paie"

        headers = [
            "identifiant", "categorie_pro", "echelon", "coefficient",
            "salaire_categoriel", "sursalaire", "prime_anciennete",
            "prime_responsabilite", "prime_assiduite", "prime_rendement",
            "gratification", "nb_heures_sup_20", "nb_heures_sup_30", "nb_heures_sup_40",
            "nb_heures_sup_50", "taux_horaire",
            "indemnite_transport", "indemnite_logement", "indemnite_representation",
            "avantages_nature", "allocations_familiales",
            "avances_salaire", "mode_paiement", "observations", "numero_cnps_employe",
        ]
        fill_header = PatternFill(start_color="1F3864", end_color="1F3864", fill_type="solid")
        font_header = Font(bold=True, color="FFFFFF", size=11)
        thin_border = Border(
            left=Side(style="thin"), right=Side(style="thin"),
            top=Side(style="thin"),  bottom=Side(style="thin"),
        )

        for col, h in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=h)
            cell.fill = cell.fill = fill_header
            cell.font = font_header
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border
        ws.row_dimensions[1].height = 22

        # Exemples (lignes 2-4)
        # identifiant, cat, echelon, coeff, sal_cat, sursalaire, anc, resp, assid,
        # rendement, gratis, h25, h40, tx_h, transport, logement, represent,
        # avantages, alloc_fam, avances, mode_paie, obs, n_cnps
        examples = [
            ["alice.mballa", "B", "3", 280, 350000, 50000, 35000,   0,     0,    0,   0, 0, 0,    0, 50000,     0,     0, 0, 0,     0, "virement", "Prime ancienneté incluse", ""],
            ["paul.fopa",    "A", "1",   0,  80000,     0,     0,   0,     0,    0,   0, 8, 0, 2500,     0,     0,     0, 0, 0, 10000, "especes",  "8h sup 25%",              ""],
            ["manager.it",  "C", "5", 450, 320000, 50000,     0, 30000, 20000, 15000, 0, 0, 0,    0, 60000, 30000, 20000, 0, 0,     0, "virement", "",                        ""],
        ]
        fill_example = PatternFill(start_color="EBF2FA", end_color="EBF2FA", fill_type="solid")
        for row_i, row_data in enumerate(examples, 2):
            for col_i, val in enumerate(row_data, 1):
                cell = ws.cell(row=row_i, column=col_i, value=val)
                cell.fill = fill_example
                cell.border = thin_border

        # Largeurs de colonnes (23 colonnes)
        col_widths = [18, 10, 10, 10, 16, 12, 14, 16, 14, 14, 12, 10, 10, 12, 16, 14, 18, 14, 16, 14, 12, 28, 18]
        for i, w in enumerate(col_widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = w

        # Geler la ligne d'en-tête
        ws.freeze_panes = "A2"

        # ── Onglet Instructions ──
        ws2 = wb.create_sheet("Instructions")
        ws2.column_dimensions["A"].width = 22
        ws2.column_dimensions["B"].width = 65

        instructions_header = ["Colonne", "Description"]
        ws2.append(instructions_header)
        ws2["A1"].font = Font(bold=True, color="FFFFFF", size=11)
        ws2["B1"].font = Font(bold=True, color="FFFFFF", size=11)
        ws2["A1"].fill = fill_header
        ws2["B1"].fill = fill_header

        instructions = [
            ("identifiant",             "OBLIGATOIRE — Username exact de l'employé (ex : alice.mballa)"),
            ("categorie_pro",           "Catégorie professionnelle (ex : A, B, C)"),
            ("echelon",                 "Échelon (ex : 1, 2, 3…)"),
            ("coefficient",             "Coefficient hiérarchique (nombre décimal)"),
            ("salaire_categoriel",      "OBLIGATOIRE — Salaire catégoriel mensuel brut en FCFA"),
            ("sursalaire",              "Sursalaire (dépassement du salaire catégoriel) en FCFA"),
            ("prime_anciennete",        "Prime d'ancienneté en FCFA (2 %/an × sal. catégoriel)"),
            ("prime_responsabilite",    "Prime de responsabilité en FCFA"),
            ("prime_assiduite",         "Prime d'assiduité en FCFA"),
            ("prime_rendement",         "Prime de rendement en FCFA"),
            ("gratification",           "Gratification exceptionnelle en FCFA"),
            ("nb_heures_sup_20",        "Heures sup. 1 à 8 de la semaine (+20 %, décret 95/677/PM art. 12)"),
            ("nb_heures_sup_30",        "Heures sup. 9 à 16 de la semaine (+30 %)"),
            ("nb_heures_sup_40",        "Heures sup. 17 à 20 et heures sup. du dimanche (+40 %)"),
            ("nb_heures_sup_50",        "Heures sup. de nuit, urgence / force majeure (+50 %)"),
            ("taux_horaire",            "Taux horaire en FCFA = salaire effectif / 173,33 h"),
            ("indemnite_transport",     "Prime de transport permanente en FCFA (imposable, non cotisable CNPS)"),
            ("indemnite_logement",      "Indemnité de logement en FCFA (cotisable ; imposable jusqu'à 15 % du salaire taxable)"),
            ("indemnite_representation","Indemnité de représentation en FCFA (frais justifiés : non imposable)"),
            ("avantages_nature",        "Avantages en nature valorisés en FCFA (imposable)"),
            ("allocations_familiales",  "Allocations familiales en FCFA (non imposable)"),
            ("avances_salaire",         "Avances sur salaire à déduire du net en FCFA"),
            ("mode_paiement",           "Mode de paiement : virement | especes | cheque (défaut : virement)"),
            ("observations",            "Observations / notes libres visibles dans le bulletin"),
            ("numero_cnps_employe",     "Numéro CNPS de l'employé (affiché sur le bulletin)"),
        ]
        for col, desc in instructions:
            row = ws2.append([col, desc])

        for row in ws2.iter_rows(min_row=2):
            for cell in row:
                cell.border = thin_border

        # Note de bas de page
        ws2.append([])
        ws2.append(["Note :", "CNPS salarié 4,2 %, IRPP (tranches SNC), CAC, CFC, RAV, TDL calculés automatiquement."])
        ws2.append(["",       "Les montants sont en FCFA entiers. Ne pas inclure de séparateurs de milliers."])
        ws2.append(["",       "Taux CNPS patronal : pension 4,2 % + famille 7 % + AT 1,75 % (risque A)."])

        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)

        response = HttpResponse(
            buf.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="template_import_paie.xlsx"'
        return response
