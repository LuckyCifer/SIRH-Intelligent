"""
Modèles — rapports hebdomadaires
"""
from django.db import models
from django.conf import settings


class RapportHebdomadaire(models.Model):

    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        SOUMIS    = "SOUMIS",    "Soumis"
        VALIDE    = "VALIDE",    "Validé"
        REJETE    = "REJETE",    "Rejeté"

    stagiaire              = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rapports",
        limit_choices_to={"role": "STAGIAIRE"},
    )
    semaine_numero         = models.PositiveIntegerField(help_text="Numéro de la semaine de stage (1, 2, 3...)")
    date_debut_semaine     = models.DateField()
    date_fin_semaine       = models.DateField()
    activites_realisees    = models.TextField(help_text="Décrivez les activités réalisées cette semaine")
    projets_en_cours       = models.TextField(blank=True, help_text="État d'avancement des projets")
    difficultes            = models.TextField(blank=True, help_text="Difficultés rencontrées")
    objectifs_semaine_suiv = models.TextField(blank=True, help_text="Objectifs pour la semaine prochaine")
    statut                 = models.CharField(max_length=20, choices=Statut.choices, default=Statut.BROUILLON)
    commentaire_encadreur  = models.TextField(blank=True)
    date_soumission        = models.DateTimeField(null=True, blank=True)
    date_validation        = models.DateTimeField(null=True, blank=True)
    created_at             = models.DateTimeField(auto_now_add=True)
    updated_at             = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name          = "Rapport hebdomadaire"
        verbose_name_plural   = "Rapports hebdomadaires"
        ordering              = ["-date_debut_semaine"]
        unique_together       = ["stagiaire", "semaine_numero"]

    def __str__(self):
        return f"Rapport S{self.semaine_numero} — {self.stagiaire} ({self.statut})"
