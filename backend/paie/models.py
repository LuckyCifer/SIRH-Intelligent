"""
Modèles — Paie (SIRH)
Calculs fiscaux basés sur la législation camerounaise 2026.
"""
from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.conf import settings


# ─── Constantes fiscales legacy (conservées pour compatibilité) ───────────────
TAUX_CNPS_EMPLOYE   = Decimal("0.028")   # ancien taux — utilisé dans le fallback legacy
TAUX_CNPS_EMPLOYEUR = Decimal("0.077")   # ancien taux

# Tranches IRPP legacy (utilisées dans la méthode fallback calculer_irpp)
IRPP_TRANCHES = [
    (Decimal("166666"),  Decimal("0")),
    (Decimal("250000"),  Decimal("0.10")),
    (Decimal("416667"),  Decimal("0.15")),
    (Decimal("833333"),  Decimal("0.25")),
    (None,               Decimal("0.35")),
]


def calculer_irpp(base_imposable: Decimal) -> Decimal:
    """Calcul IRPP legacy mensuel par tranches — conservé pour le fallback."""
    base = Decimal(str(base_imposable))
    if base <= 0:
        return Decimal("0")
    irpp = Decimal("0")
    precedent = Decimal("0")
    for plafond, taux in IRPP_TRANCHES:
        if taux == 0:
            precedent = plafond
            if base <= plafond:
                break
            continue
        borne = min(base, plafond) if plafond is not None else base
        if borne <= precedent:
            break
        irpp += (borne - precedent) * taux
        precedent = plafond if plafond is not None else base
        if plafond is None or base <= plafond:
            break
    return irpp.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


# ─── Modèles ─────────────────────────────────────────────────────────────────

class ConfigurationPaie(models.Model):
    nom                  = models.CharField(max_length=100, default="Configuration principale")
    salaire_minimum      = models.DecimalField(max_digits=12, decimal_places=0, default=0,
                           help_text="SMIG mensuel en FCFA")
    taux_cnps_employe    = models.DecimalField(max_digits=6, decimal_places=4, default=Decimal("0.028"))
    taux_cnps_employeur  = models.DecimalField(max_digits=6, decimal_places=4, default=Decimal("0.077"))
    active               = models.BooleanField(default=True)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuration paie"
        verbose_name_plural = "Configurations paie"

    def __str__(self):
        return self.nom


class ElementPaie(models.Model):
    class TypeElement(models.TextChoices):
        GAIN    = "GAIN",    "Gain / Prime"
        RETENUE = "RETENUE", "Retenue"

    code         = models.CharField(max_length=20, unique=True)
    libelle      = models.CharField(max_length=100)
    type         = models.CharField(max_length=10, choices=TypeElement.choices)
    montant_fixe = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True,
                   help_text="Montant fixe en FCFA (exclusif avec taux)")
    taux         = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True,
                   help_text="Taux en fraction du salaire brut (ex : 0.05 = 5 %)")
    imposable    = models.BooleanField(default=True,
                   help_text="Inclus dans l'assiette IRPP")
    is_actif     = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Élément de paie"
        verbose_name_plural = "Éléments de paie"
        ordering = ["type", "libelle"]

    def __str__(self):
        return f"[{self.code}] {self.libelle}"


class BulletinPaie(models.Model):
    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        VALIDE    = "VALIDE",    "Validé"
        PAYE      = "PAYE",      "Payé"

    class ModePaiement(models.TextChoices):
        VIREMENT = "virement", "Virement bancaire"
        ESPECES  = "especes",  "Espèces"
        CHEQUE   = "cheque",   "Chèque"

    employe      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="bulletins_paie",
    )
    mois         = models.PositiveSmallIntegerField()
    annee        = models.PositiveSmallIntegerField()

    # ── Identification & classification ──────────────────────────────────────
    numero_cnps_employe   = models.CharField(max_length=50, blank=True, default="")
    numero_cnps_employeur = models.CharField(max_length=50, blank=True, default="")
    categorie_pro         = models.CharField(max_length=20, blank=True, default="")
    echelon               = models.CharField(max_length=20, blank=True, default="")
    coefficient           = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    # ── Éléments du brut (inputs) ─────────────────────────────────────────────
    salaire_categoriel       = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    sursalaire               = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    prime_anciennete         = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    prime_responsabilite     = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    prime_assiduite          = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    prime_rendement          = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    gratification            = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    indemnite_transport      = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    indemnite_logement       = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    indemnite_representation = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    avantages_nature         = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    nb_heures_sup_25         = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    nb_heures_sup_40         = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    taux_horaire             = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    allocations_familiales   = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    # ── Rémunération de base (champs legacy — conservés pour compat.) ─────────
    salaire_brut = models.DecimalField(max_digits=12, decimal_places=0, default=0,
                   help_text="Total brut (calculé). Conservé pour compatibilité.")
    total_primes = models.DecimalField(max_digits=12, decimal_places=0, default=0,
                   help_text="Somme des primes imposables (calculé).")

    # ── Cotisations & impôts salarié (calculés) ───────────────────────────────
    cnps_employe    = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    irpp            = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    cac             = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    cfc_salarie     = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    rav             = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    tdl             = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    avances_salaire = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    autres_retenues = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    total_retenues  = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    # ── Charges patronales (calculées, informatives) ──────────────────────────
    cnps_patronal_pension = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    cnps_patronal_famille = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    cnps_patronal_at      = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    cfc_patronal          = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    fne                   = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    cout_total_employeur  = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    # ── Récapitulatif (calculé) ───────────────────────────────────────────────
    salaire_brut_imposable = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    salaire_brut_cotisable = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    revenu_net_categoriel  = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    total_brut             = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    # ── Résultat final ────────────────────────────────────────────────────────
    salaire_net  = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    # ── Détails de calcul (JSON) ──────────────────────────────────────────────
    details      = models.JSONField(default=dict, blank=True)

    # ── Divers ───────────────────────────────────────────────────────────────
    mode_paiement = models.CharField(
        max_length=20, choices=ModePaiement.choices, default=ModePaiement.VIREMENT
    )
    observations  = models.TextField(blank=True, default="")

    # ── Workflow ──────────────────────────────────────────────────────────────
    statut       = models.CharField(max_length=20, choices=Statut.choices, default=Statut.BROUILLON)
    genere_par   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="bulletins_generes",
    )
    valide_par   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="bulletins_valides",
    )
    date_validation = models.DateTimeField(null=True, blank=True)
    date_paiement   = models.DateField(null=True, blank=True)
    entreprise      = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="bulletins_paie",
    )
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Bulletin de paie"
        verbose_name_plural = "Bulletins de paie"
        unique_together = [["employe", "mois", "annee"]]
        ordering = ["-annee", "-mois"]

    def __str__(self):
        return f"Bulletin {self.mois:02d}/{self.annee} - {self.employe.get_full_name()}"

    def calculer(self):
        """
        Recalcule tous les montants.
        Si salaire_categoriel > 0 → CalculateurPaie (Cameroun 2026).
        Sinon → fallback legacy (salaire_brut direct).
        """
        if self.salaire_categoriel and Decimal(str(self.salaire_categoriel)) > 0:
            from .calculateur import CalculateurPaie
            CalculateurPaie().calculer(self)
            return

        # ── Fallback legacy : salaire_brut défini directement ────────────────
        brut    = Decimal(str(self.salaire_brut))
        primes  = Decimal(str(self.total_primes))
        total   = brut + primes
        cnps    = (brut * TAUX_CNPS_EMPLOYE).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        base_irpp = max(Decimal("0"), total - cnps)
        irpp    = calculer_irpp(base_irpp)
        autres  = Decimal(str(self.autres_retenues))
        net     = total - cnps - irpp - autres
        self.cnps_employe = cnps
        self.irpp         = irpp
        self.salaire_net  = max(Decimal("0"), net)
        self.total_brut   = total
        self.details      = {
            "total_brut":   str(total),
            "cnps_taux":    str(TAUX_CNPS_EMPLOYE),
            "base_irpp":    str(base_irpp),
            "irpp_calcule": str(irpp),
        }


# ─── Mobile Money ─────────────────────────────────────────────────────────────

class VirementMobile(models.Model):
    """Trace chaque virement salarial via MTN MoMo ou Orange Money."""

    class Operateur(models.TextChoices):
        MTN    = "MTN",    "MTN Mobile Money"
        ORANGE = "ORANGE", "Orange Money"

    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        EN_COURS   = "EN_COURS",   "En cours"
        SUCCES     = "SUCCES",     "Succes"
        ECHEC      = "ECHEC",      "Echec"
        ANNULE     = "ANNULE",     "Annule"

    employe = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="virements_mobiles",
    )
    bulletin = models.ForeignKey(
        BulletinPaie,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="virements",
    )
    operateur      = models.CharField(max_length=10, choices=Operateur.choices)
    numero_mobile  = models.CharField(max_length=25)
    montant        = models.DecimalField(max_digits=12, decimal_places=0)
    motif          = models.CharField(max_length=200, default="Virement salarial")
    reference_id   = models.UUIDField(unique=True, default=None)
    transaction_id = models.CharField(max_length=100, blank=True)
    statut         = models.CharField(
        max_length=15, choices=Statut.choices, default=Statut.EN_ATTENTE
    )
    message_erreur = models.TextField(blank=True)
    mode_demo      = models.BooleanField(default=True)
    initie_par     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="virements_inities",
    )
    entreprise = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="virements_mobiles",
    )
    date_confirmation = models.DateTimeField(null=True, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = "Virement mobile"
        verbose_name_plural = "Virements mobiles"
        ordering            = ["-created_at"]

    def __str__(self):
        return f"[{self.operateur}] {self.employe.get_full_name()} - {self.montant} FCFA ({self.statut})"
