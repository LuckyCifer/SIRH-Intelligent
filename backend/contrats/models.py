"""
Modèles — Contrats (SIRH)
Loi n°92/007 du 14 août 1992 — Code du Travail camerounais
"""
import calendar
from datetime import date as date_type
from django.db import models
from django.conf import settings
from django.core.validators import MaxValueValidator


def _ajouter_mois(d, n):
    """Ajoute n mois à une date sans dateutil."""
    month = d.month + n
    year  = d.year + (month - 1) // 12
    month = (month - 1) % 12 + 1
    day   = min(d.day, calendar.monthrange(year, month)[1])
    return date_type(year, month, day)


class Contrat(models.Model):

    class TypeContrat(models.TextChoices):
        CDI       = "CDI",       "CDI — Contrat à Durée Indéterminée"
        CDD       = "CDD",       "CDD — Contrat à Durée Déterminée"
        STAGE     = "STAGE",     "Convention de Stage"
        FREELANCE = "FREELANCE", "Contrat Freelance"
        INTERIM   = "INTERIM",   "Contrat d'Intérim"

    class Statut(models.TextChoices):
        ACTIF    = "ACTIF",    "Actif"
        EXPIRE   = "EXPIRE",   "Expiré"
        RESILIE  = "RESILIE",  "Résilié"
        EN_COURS = "EN_COURS", "En cours de renouvellement"

    class CategorieProf(models.TextChoices):
        CAT_I_VI   = "CAT_I_VI",   "Cat. I–VI (Ouvriers/Employés) — essai max 1 mois"
        CAT_VII_X  = "CAT_VII_X",  "Cat. VII–X (Agents de maîtrise) — essai max 3 mois"
        CAT_XI_XII = "CAT_XI_XII", "Cat. XI–XII (Cadres) — essai max 6 mois"

    MAX_ESSAI_PAR_CATEGORIE = {
        "CAT_I_VI": 1, "CAT_VII_X": 3, "CAT_XI_XII": 6,
    }

    # ── Champs de base ────────────────────────────────────────────────────────
    employe      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contrats"
    )
    type_contrat = models.CharField(max_length=20, choices=TypeContrat.choices)
    poste        = models.ForeignKey(
        "departements.Poste", on_delete=models.SET_NULL, null=True, blank=True
    )
    date_debut   = models.DateField()
    date_fin     = models.DateField(null=True, blank=True, help_text="Laisser vide pour un CDI")
    salaire      = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True,
                   help_text="Salaire mensuel brut en FCFA")
    statut       = models.CharField(max_length=20, choices=Statut.choices, default=Statut.ACTIF)
    document     = models.FileField(upload_to="contrats/", null=True, blank=True,
                   help_text="Fichier PDF du contrat signé")
    notes        = models.TextField(blank=True)
    entreprise   = models.ForeignKey(
        "entreprises.Entreprise", on_delete=models.CASCADE,
        null=True, blank=True, related_name="contrats"
    )

    # ── Catégorie professionnelle ─────────────────────────────────────────────
    categorie_pro = models.CharField(
        max_length=15, choices=CategorieProf.choices, default="CAT_VII_X", blank=True
    )

    # ── Période d'essai (Art. 27) ─────────────────────────────────────────────
    periode_essai_mois = models.IntegerField(default=0)
    date_fin_essai     = models.DateField(null=True, blank=True)
    essai_confirme     = models.BooleanField(default=False)
    essai_rompu        = models.BooleanField(default=False)

    # ── Préavis (Art. 34 + Arrêté 015/MTPS/SG/CJ du 26/05/1993) ─────────────
    duree_preavis_jours = models.IntegerField(default=15)
    preavis_debute      = models.BooleanField(default=False)
    date_debut_preavis  = models.DateField(null=True, blank=True)

    # ── CDD — Renouvellement (Art. 25) ────────────────────────────────────────
    renouvellement_numero = models.IntegerField(default=0)
    duree_totale_cdd_mois = models.IntegerField(default=0)

    # ── Clause de non-concurrence (Art. 36 al.3) ──────────────────────────────
    clause_non_concurrence        = models.BooleanField(default=False)
    rayon_non_concurrence_km      = models.IntegerField(
        default=50, validators=[MaxValueValidator(50)],
        help_text="Maximum légal : 50 km (Art. 36)"
    )
    duree_non_concurrence_mois    = models.IntegerField(
        default=12, validators=[MaxValueValidator(12)],
        help_text="Maximum légal : 12 mois (Art. 36)"
    )

    # ── Informations légales obligatoires ─────────────────────────────────────
    lieu_travail   = models.CharField(max_length=200, blank=True)
    horaires_travail = models.CharField(max_length=200, blank=True)
    visa_mintss    = models.BooleanField(default=False,
                    help_text="Visa MINTSS — obligatoire pour travailleurs étrangers")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering     = ["-date_debut"]
        verbose_name = "Contrat"
        verbose_name_plural = "Contrats"

    def __str__(self):
        return f"{self.type_contrat} — {self.employe} ({self.date_debut})"

    @property
    def jours_restants(self):
        if self.date_fin:
            from django.utils import timezone
            return (self.date_fin - timezone.now().date()).days
        return None

    @property
    def expire_bientot(self):
        j = self.jours_restants
        return j is not None and 0 <= j <= 30

    @property
    def en_periode_essai(self):
        if not self.date_fin_essai or self.essai_confirme or self.essai_rompu:
            return False
        from django.utils import timezone
        return timezone.now().date() <= self.date_fin_essai

    @property
    def jours_essai_restants(self):
        if not self.en_periode_essai:
            return None
        from django.utils import timezone
        return (self.date_fin_essai - timezone.now().date()).days
