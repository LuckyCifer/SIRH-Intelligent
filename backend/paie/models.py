"""
Modèles — Paie (SIRH)
Calculs fiscaux basés sur la législation camerounaise 2024.
"""
from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.conf import settings


# ─── Constantes fiscales Cameroun 2024 ───────────────────────────────────────
TAUX_CNPS_EMPLOYE   = Decimal("0.028")   # 2,8 % du salaire brut
TAUX_CNPS_EMPLOYEUR = Decimal("0.077")   # 7,7 % du salaire brut

# Tranches IRPP mensuel (revenu imposable mensuel → taux marginal)
IRPP_TRANCHES = [
    (Decimal("166666"),  Decimal("0")),
    (Decimal("250000"),  Decimal("0.10")),
    (Decimal("416667"),  Decimal("0.15")),
    (Decimal("833333"),  Decimal("0.25")),
    (None,               Decimal("0.35")),
]


def calculer_irpp(base_imposable: Decimal) -> Decimal:
    """Calcul IRPP mensuel par tranches — Cameroun 2024."""
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

    employe      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="bulletins_paie",
    )
    mois         = models.PositiveSmallIntegerField()
    annee        = models.PositiveSmallIntegerField()

    # Rémunération de base
    salaire_brut = models.DecimalField(max_digits=12, decimal_places=0,
                   help_text="Salaire mensuel brut en FCFA")
    total_primes = models.DecimalField(max_digits=12, decimal_places=0, default=0,
                   help_text="Primes et indemnités diverses")

    # Cotisations & impôts (calculés automatiquement)
    cnps_employe    = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    irpp            = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    autres_retenues = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    # Résultat
    salaire_net  = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    # Détails de calcul (JSON)
    details      = models.JSONField(default=dict, blank=True)

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
        return f"Bulletin {self.mois:02d}/{self.annee} — {self.employe.get_full_name()}"

    def calculer(self):
        """
        Recalcule CNPS employé, IRPP et salaire net.
        Modifie l'objet en place — appeler save() ensuite.
        """
        brut    = Decimal(str(self.salaire_brut))
        primes  = Decimal(str(self.total_primes))
        total   = brut + primes

        # CNPS employé : 2,8 % du salaire brut
        cnps = (brut * TAUX_CNPS_EMPLOYE).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        # Base IRPP = total brut - CNPS employé
        base_irpp = max(Decimal("0"), total - cnps)
        irpp = calculer_irpp(base_irpp)

        autres = Decimal(str(self.autres_retenues))
        net = total - cnps - irpp - autres

        self.cnps_employe = cnps
        self.irpp = irpp
        self.salaire_net = max(Decimal("0"), net)
        self.details = {
            "total_brut":   str(total),
            "cnps_taux":    str(TAUX_CNPS_EMPLOYE),
            "base_irpp":    str(base_irpp),
            "irpp_calcule": str(irpp),
        }
