from django.db import models
from django.conf import settings


class Pointage(models.Model):

    class TypePointage(models.TextChoices):
        ARRIVEE = "ARRIVEE", "Arrivée"
        DEPART  = "DEPART",  "Départ"

    class StatutJour(models.TextChoices):
        PRESENT = "PRESENT", "Présent"
        ABSENT  = "ABSENT",  "Absent"
        RETARD  = "RETARD",  "En retard"
        CONGE   = "CONGE",   "En congé"
        FERIE   = "FERIE",   "Jour férié"
        WEEKEND = "WEEKEND", "Week-end"

    employe  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pointages",
    )
    date     = models.DateField()
    heure_arrivee = models.TimeField(null=True, blank=True)
    heure_depart  = models.TimeField(null=True, blank=True)
    statut   = models.CharField(
        max_length=20,
        choices=StatutJour.choices,
        default=StatutJour.PRESENT,
    )
    heures_travaillees = models.DecimalField(
        max_digits=4, decimal_places=2,
        null=True, blank=True,
        help_text="Heures travaillées dans la journée",
    )
    heures_supplementaires = models.DecimalField(
        max_digits=4, decimal_places=2,
        default=0,
        help_text="Heures au-delà de 8h",
    )
    note        = models.TextField(blank=True, help_text="Observation ou justification")
    valide_par  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="pointages_valides",
    )
    entreprise = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="pointages",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["employe", "date"]
        ordering = ["-date"]
        verbose_name = "Pointage"
        verbose_name_plural = "Pointages"

    def __str__(self):
        return f"{self.employe} — {self.date} ({self.statut})"

    def save(self, *args, **kwargs):
        if self.heure_arrivee and self.heure_depart:
            from datetime import datetime, date as date_type
            arrivee = datetime.combine(date_type.today(), self.heure_arrivee)
            depart  = datetime.combine(date_type.today(), self.heure_depart)
            diff    = (depart - arrivee).total_seconds() / 3600
            self.heures_travaillees        = round(max(0, diff), 2)
            self.heures_supplementaires    = round(max(0, diff - 8), 2)
        super().save(*args, **kwargs)


class ConfigPresence(models.Model):
    heure_arrivee_standard   = models.TimeField(default="08:00")
    heure_depart_standard    = models.TimeField(default="17:00")
    tolerance_retard_minutes = models.IntegerField(
        default=15,
        help_text="Minutes de tolérance avant de marquer un retard",
    )
    heures_journee_standard  = models.DecimalField(
        max_digits=4, decimal_places=2, default=8,
    )

    class Meta:
        verbose_name = "Configuration présences"
        verbose_name_plural = "Configurations présences"

    def __str__(self):
        return f"Config : {self.heure_arrivee_standard} → {self.heure_depart_standard}"
