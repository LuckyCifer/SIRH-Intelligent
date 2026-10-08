"""
Modèles — Présences & Pointages (SIRH)
Conformité Code du Travail camerounais — Décret n°95/677/PM du 18/12/1995.
"""
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
        max_digits=5, decimal_places=2,
        null=True, blank=True,
        help_text="Heures travaillées dans la journée",
    )
    # Backward-compat (≈ heures au-delà de 8h/jour — approximation)
    heures_supplementaires = models.DecimalField(
        max_digits=5, decimal_places=2,
        default=0,
        help_text="HS brutes approximatives (>8h/jour). Utiliser les champs catégoriels.",
    )

    # ── Heures supplémentaires légales — Décret 95/677/PM ──────────────────
    # Calculées à la semaine ISO; distribuées sur chaque pointage.
    hs_jour_20  = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="HS de jour — 8 premières heures sup/semaine (+20%)")
    hs_jour_30  = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="HS de jour — au-delà de 8h sup/semaine (+30%)")
    hs_nuit     = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="HS de nuit 22h–6h (+50%)")
    hs_dimanche = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="Travail un dimanche (+40%)")
    hs_ferie    = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="Travail un jour férié officiel (+100%)")
    montant_hs_total = models.DecimalField(max_digits=10, decimal_places=2, default=0,
        help_text="Montant total des majorations HS (FCFA)")

    # ── Drapeaux automatiques ───────────────────────────────────────────────
    est_jour_ferie = models.BooleanField(default=False,
        help_text="True si la date est un jour férié officiel camerounais")
    est_dimanche   = models.BooleanField(default=False,
        help_text="True si la date est un dimanche")
    est_nuit       = models.BooleanField(default=False,
        help_text="True si l'heure d'arrivée ou de départ est entre 22h et 6h")
    est_retard     = models.BooleanField(default=False,
        help_text="True si l'arrivée dépasse 8h05 (tolérance 5 min)")
    minutes_retard = models.IntegerField(default=0,
        help_text="Minutes de retard par rapport à 8h00")

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
        from datetime import datetime, date as date_type, time as time_type

        # ── Calcul heures travaillées ──────────────────────────────────────
        if self.heure_arrivee and self.heure_depart:
            arrivee = datetime.combine(date_type.today(), self.heure_arrivee)
            depart  = datetime.combine(date_type.today(), self.heure_depart)
            diff    = (depart - arrivee).total_seconds() / 3600
            self.heures_travaillees     = round(max(0, diff), 2)
            self.heures_supplementaires = round(max(0, diff - 8), 2)

        # ── Drapeaux (jours fériés, dimanche, nuit) ──────────────────────
        if self.date:
            try:
                from .calculateur_hs import CalculateurHeuresSupplementaires
                info = CalculateurHeuresSupplementaires().est_jour_ferie(self.date)
                self.est_jour_ferie = info["est_ferie"]
            except Exception:
                self.est_jour_ferie = False
            self.est_dimanche = (self.date.weekday() == 6)

        h = self.heure_arrivee or self.heure_depart
        if h:
            self.est_nuit = (h.hour >= 22 or h.hour < 6)

        # ── Détection retard (seuil : 8h05, tolérance 5 min) ─────────────
        SEUIL_RETARD   = time_type(8, 5)
        DEBUT_OFFICIEL = time_type(8, 0)
        if (self.heure_arrivee
                and not self.est_jour_ferie
                and not self.est_dimanche
                and self.statut not in ("CONGE", "FERIE", "WEEKEND")):
            if self.heure_arrivee > SEUIL_RETARD:
                self.est_retard = True
                ref = datetime.combine(self.date or date_type.today(), DEBUT_OFFICIEL)
                arr = datetime.combine(self.date or date_type.today(), self.heure_arrivee)
                self.minutes_retard = int((arr - ref).total_seconds() // 60)
                self.statut = "RETARD"
            else:
                self.est_retard    = False
                self.minutes_retard = 0
                if self.statut == "RETARD":
                    self.statut = "PRESENT"
        else:
            self.est_retard    = False
            self.minutes_retard = 0

        # ── Catégories HS per-day (priorité : ferie > dimanche > nuit) ───
        heures = float(self.heures_travaillees or 0)
        if self.est_jour_ferie:
            self.hs_ferie    = heures
            self.hs_dimanche = 0
            self.hs_nuit     = 0
            self.hs_jour_20  = 0
            self.hs_jour_30  = 0
        elif self.est_dimanche:
            self.hs_ferie    = 0
            self.hs_dimanche = heures
            self.hs_nuit     = 0
            self.hs_jour_20  = 0
            self.hs_jour_30  = 0
        elif self.est_nuit:
            self.hs_ferie    = 0
            self.hs_dimanche = 0
            self.hs_nuit     = heures
            self.hs_jour_20  = 0
            self.hs_jour_30  = 0
        else:
            self.hs_ferie    = 0
            self.hs_dimanche = 0
            self.hs_nuit     = 0
            # HS de jour — approximation quotidienne (recalculée à la semaine par calculateur_hs)
            hs_brutes       = max(0.0, heures - 8)
            self.hs_jour_20 = round(min(hs_brutes, 8), 2)
            self.hs_jour_30 = round(max(0.0, hs_brutes - 8), 2)

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
