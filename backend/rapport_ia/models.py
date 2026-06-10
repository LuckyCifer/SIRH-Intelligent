from django.db import models
from django.conf import settings


class RapportIAMensuel(models.Model):

    class Statut(models.TextChoices):
        EN_GENERATION = "EN_GENERATION", "En génération"
        GENERE        = "GENERE",        "Généré"
        ERREUR        = "ERREUR",        "Erreur"

    class TypeRapport(models.TextChoices):
        GLOBAL       = "GLOBAL",       "Global"
        DEPARTEMENT  = "DEPARTEMENT",  "Par département"
        EMPLOYE      = "EMPLOYE",      "Par employé"

    mois         = models.PositiveSmallIntegerField()
    annee        = models.PositiveSmallIntegerField()
    type_rapport = models.CharField(max_length=20, choices=TypeRapport.choices, default=TypeRapport.GLOBAL)
    departement  = models.ForeignKey(
        "departements.Departement", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="rapports_ia",
    )
    employe = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="rapports_ia",
    )

    donnees_collectees = models.JSONField(default=dict)
    contenu_rapport    = models.TextField(blank=True)
    resume_executif    = models.TextField(blank=True)
    indicateurs_cles   = models.JSONField(default=dict)
    alertes_ia         = models.JSONField(default=list)
    recommandations    = models.JSONField(default=list)
    score_sante_rh     = models.FloatField(default=0)
    statut             = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_GENERATION)
    message_erreur     = models.TextField(blank=True)

    genere_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True,
        on_delete=models.SET_NULL, related_name="rapports_ia_generes",
    )
    entreprise = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="rapports_ia",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["mois", "annee", "type_rapport", "departement", "employe"]
        ordering = ["-annee", "-mois", "-created_at"]
        verbose_name = "Rapport IA mensuel"
        verbose_name_plural = "Rapports IA mensuels"

    def __str__(self):
        return f"Rapport IA {self.annee}-{str(self.mois).zfill(2)} ({self.type_rapport})"

    @property
    def periode(self):
        return f"{self.annee}-{str(self.mois).zfill(2)}"
