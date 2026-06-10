"""
Modèles — Contrats (SIRH)
"""
from django.db import models
from django.conf import settings


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

    employe      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="contrats",
    )
    type_contrat = models.CharField(max_length=20, choices=TypeContrat.choices)
    poste        = models.ForeignKey(
        "departements.Poste",
        on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    date_debut   = models.DateField()
    date_fin     = models.DateField(null=True, blank=True,
                   help_text="Laisser vide pour un CDI")
    salaire      = models.DecimalField(max_digits=10, decimal_places=0,
                   null=True, blank=True,
                   help_text="Salaire mensuel brut en FCFA")
    statut       = models.CharField(max_length=20, choices=Statut.choices, default=Statut.ACTIF)
    document     = models.FileField(upload_to="contrats/", null=True, blank=True,
                   help_text="Fichier PDF du contrat signé")
    notes        = models.TextField(blank=True)
    entreprise   = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="contrats",
    )
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

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
            delta = self.date_fin - timezone.now().date()
            return delta.days
        return None

    @property
    def expire_bientot(self):
        j = self.jours_restants
        return j is not None and 0 <= j <= 30
