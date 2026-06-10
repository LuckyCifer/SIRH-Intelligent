"""
Modèles — stagiaires
StagePeriode + ProjetSoutenance
"""
from django.db import models
from django.conf import settings


class StagePeriode(models.Model):

    class Statut(models.TextChoices):
        EN_COURS  = "EN_COURS",  "En cours"
        TERMINE   = "TERMINE",   "Terminé"
        ABANDONNE = "ABANDONNE", "Abandonné"

    stagiaire  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="periodes_stage",
        limit_choices_to={"role": "EMPLOYE"},
    )
    encadreur  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="stagiaires_encadres",
        limit_choices_to={"role": "MANAGER"},
    )
    date_debut  = models.DateField()
    date_fin    = models.DateField()
    statut      = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_COURS)
    description = models.TextField(blank=True, help_text="Objectifs ou contexte du stage")
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Période de stage"
        verbose_name_plural = "Périodes de stage"
        ordering = ["-date_debut"]

    def __str__(self):
        return f"Stage de {self.stagiaire} ({self.date_debut} → {self.date_fin})"

    @property
    def duree_semaines(self):
        delta = self.date_fin - self.date_debut
        return max(1, delta.days // 7)


class ProjetSoutenance(models.Model):

    class Statut(models.TextChoices):
        PROPOSE   = "PROPOSE",   "Proposé"
        VALIDE    = "VALIDE",    "Validé"
        EN_COURS  = "EN_COURS",  "En cours"
        LIVRE     = "LIVRE",     "Livré"
        SOUTENU   = "SOUTENU",   "Soutenu"

    stagiaire   = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projet_soutenance",
        limit_choices_to={"role": "EMPLOYE"},
    )
    theme       = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    statut      = models.CharField(max_length=20, choices=Statut.choices, default=Statut.PROPOSE)
    livrable    = models.FileField(upload_to="livrables/", null=True, blank=True)
    date_soutenance = models.DateField(null=True, blank=True)
    note        = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    commentaire_jury = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Projet de soutenance"
        verbose_name_plural = "Projets de soutenance"

    def __str__(self):
        return f"{self.stagiaire} — {self.theme[:60]}"
