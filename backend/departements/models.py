"""
Modèles — Départements & Postes (SIRH)
"""
from django.db import models
from django.conf import settings


class Departement(models.Model):
    nom         = models.CharField(max_length=200)
    code        = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="departements_diriges",
    )
    couleur     = models.CharField(max_length=7, default="#2E74B5")
    icone       = models.CharField(max_length=50, default="fas fa-building")
    actif       = models.BooleanField(default=True)
    entreprise  = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="departements",
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering     = ["nom"]
        verbose_name = "Département"
        verbose_name_plural = "Départements"

    def __str__(self):
        return f"{self.code} — {self.nom}"


class Poste(models.Model):

    class Niveau(models.TextChoices):
        JUNIOR    = "JUNIOR",    "Junior"
        CONFIRME  = "CONFIRME",  "Confirmé"
        SENIOR    = "SENIOR",    "Senior"
        CHEF      = "CHEF",      "Chef / Responsable"
        DIRECTION = "DIRECTION", "Direction"

    departement  = models.ForeignKey(
        Departement,
        on_delete=models.CASCADE,
        related_name="postes",
    )
    titre        = models.CharField(max_length=200)
    description  = models.TextField(blank=True)
    niveau       = models.CharField(max_length=20, choices=Niveau.choices, default=Niveau.JUNIOR)
    salaire_min  = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True,
                   help_text="Salaire minimum en FCFA")
    salaire_max  = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True,
                   help_text="Salaire maximum en FCFA")
    actif        = models.BooleanField(default=True)
    entreprise   = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="postes",
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering     = ["departement", "titre"]
        verbose_name = "Poste"
        verbose_name_plural = "Postes"

    def __str__(self):
        return f"{self.titre} ({self.departement.code})"
