"""
Modèle — AnalyseIA
Résultat de l'analyse Groq sur un rapport hebdomadaire
"""
from django.db import models


class AnalyseIA(models.Model):

    class NiveauAlerte(models.TextChoices):
        AUCUNE  = "AUCUNE",  "Aucune alerte"
        FAIBLE  = "FAIBLE",  "Alerte faible"
        MOYENNE = "MOYENNE", "Alerte moyenne"
        ELEVEE  = "ELEVEE",  "Alerte élevée"

    rapport          = models.OneToOneField(
        "rapports.RapportHebdomadaire",
        on_delete=models.CASCADE,
        related_name="analyse_ia",
    )
    score_engagement     = models.IntegerField(default=0, help_text="Score 0–100")
    points_forts         = models.JSONField(default=list)
    points_amelioration  = models.JSONField(default=list)
    recommandation       = models.TextField(blank=True, help_text="Recommandation pour l'encadreur")
    synthese             = models.TextField(blank=True, help_text="Synthèse générale du rapport")
    niveau_alerte        = models.CharField(max_length=10, choices=NiveauAlerte.choices, default=NiveauAlerte.AUCUNE)
    motif_alerte         = models.TextField(blank=True)
    competences_detectees = models.JSONField(default=list)
    progression_estimee  = models.CharField(
        max_length=15,
        choices=[
            ("FAIBLE",      "Faible"),
            ("MOYENNE",     "Moyenne"),
            ("BONNE",       "Bonne"),
            ("EXCELLENTE",  "Excellente"),
        ],
        default="MOYENNE",
    )
    modele_utilise       = models.CharField(max_length=100, blank=True)
    tokens_utilises      = models.IntegerField(default=0)
    date_analyse         = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Analyse IA"
        verbose_name_plural = "Analyses IA"
        ordering = ["-date_analyse"]

    def __str__(self):
        return f"Analyse — {self.rapport} (score: {self.score_engagement}/100)"
