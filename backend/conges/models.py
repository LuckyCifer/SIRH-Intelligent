"""
Modèles — Congés & Absences (SIRH)
"""
from django.db import models
from django.conf import settings


class TypeConge(models.Model):
    nom            = models.CharField(max_length=100)
    code           = models.CharField(max_length=20, unique=True)
    jours_par_an   = models.IntegerField(default=30, help_text="Nombre de jours alloués par an")
    est_paye       = models.BooleanField(default=True)
    necessite_justificatif = models.BooleanField(default=False)
    couleur        = models.CharField(max_length=7, default="#2E74B5")
    description    = models.TextField(blank=True)
    actif          = models.BooleanField(default=True)

    class Meta:
        verbose_name        = "Type de congé"
        verbose_name_plural = "Types de congé"
        ordering = ["nom"]

    def __str__(self):
        return f"{self.nom} ({self.jours_par_an}j/an)"


class DemandeConge(models.Model):

    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        APPROUVE   = "APPROUVE",   "Approuvé"
        REFUSE     = "REFUSE",     "Refusé"
        ANNULE     = "ANNULE",     "Annulé"

    employe    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="demandes_conge",
    )
    type_conge = models.ForeignKey(
        TypeConge,
        on_delete=models.PROTECT,
        related_name="demandes",
    )
    date_debut = models.DateField()
    date_fin   = models.DateField()
    nb_jours   = models.IntegerField(help_text="Calculé automatiquement")
    motif      = models.TextField(help_text="Raison de la demande")
    justificatif = models.FileField(
        upload_to="conges/justificatifs/",
        null=True, blank=True,
    )
    statut     = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.EN_ATTENTE,
    )
    valideur   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="conges_valides",
    )
    commentaire_valideur = models.TextField(blank=True)
    date_validation      = models.DateTimeField(null=True, blank=True)
    entreprise = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="demandes_conge",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = "Demande de congé"
        verbose_name_plural = "Demandes de congé"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employe} — {self.type_conge.nom} ({self.date_debut} → {self.date_fin})"

    def save(self, *args, **kwargs):
        from datetime import timedelta
        delta = self.date_fin - self.date_debut
        nb = 0
        for i in range(delta.days + 1):
            jour = self.date_debut + timedelta(days=i)
            if jour.weekday() < 5:
                nb += 1
        self.nb_jours = nb
        super().save(*args, **kwargs)


class SoldeConge(models.Model):
    employe    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="soldes_conge",
    )
    type_conge = models.ForeignKey(
        TypeConge,
        on_delete=models.CASCADE,
        related_name="soldes",
    )
    annee          = models.IntegerField(help_text="Année concernée ex: 2026")
    jours_acquis   = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    jours_pris     = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    jours_en_attente = models.DecimalField(max_digits=5, decimal_places=1, default=0)

    class Meta:
        unique_together     = ["employe", "type_conge", "annee"]
        verbose_name        = "Solde de congé"
        verbose_name_plural = "Soldes de congé"

    def __str__(self):
        return f"{self.employe} — {self.type_conge.nom} {self.annee} : {self.solde_restant}j restants"

    @property
    def solde_restant(self):
        return float(self.jours_acquis) - float(self.jours_pris) - float(self.jours_en_attente)
