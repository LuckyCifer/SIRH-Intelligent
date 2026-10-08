from django.db import models
from django.conf import settings
from django.core.validators import MaxValueValidator


class Sanction(models.Model):

    class TypeSanction(models.TextChoices):
        AVERTISSEMENT            = "AVERTISSEMENT",            "Avertissement écrit"
        BLAME                    = "BLAME",                    "Blâme"
        MISE_A_PIED              = "MISE_A_PIED",              "Mise à pied"
        LICENCIEMENT_FAUTE_GRAVE = "LICENCIEMENT_FAUTE_GRAVE", "Licenciement pour faute grave"
        LICENCIEMENT_FAUTE_LOURDE = "LICENCIEMENT_FAUTE_LOURDE", "Licenciement pour faute lourde"

    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        NOTIFIEE  = "NOTIFIEE",  "Notifiée à l'employé"
        ACCEPTEE  = "ACCEPTEE",  "Acceptée par l'employé"
        CONTESTEE = "CONTESTEE", "Contestée"
        ARCHIVEE  = "ARCHIVEE",  "Archivée"

    class IssueContestation(models.TextChoices):
        EN_COURS         = "EN_COURS",         "En cours d'instruction"
        MAINTENUE        = "MAINTENUE",        "Sanction maintenue"
        ANNULEE          = "ANNULEE",          "Sanction annulée"
        INDEMNITE_VERSEE = "INDEMNITE_VERSEE", "Indemnité compensatrice versée"

    # ── Champs de base ────────────────────────────────────────────────────────
    employe          = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sanctions"
    )
    type_sanction    = models.CharField(max_length=30, choices=TypeSanction.choices)
    motif            = models.CharField(max_length=500)
    description      = models.TextField()
    date_faits       = models.DateField()
    date_sanction    = models.DateField()
    date_debut_effet = models.DateField(null=True, blank=True)
    date_fin_effet   = models.DateField(null=True, blank=True)
    prononcee_par    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="sanctions_prononcees"
    )
    statut              = models.CharField(max_length=20, choices=Statut.choices, default=Statut.BROUILLON)
    document            = models.FileField(upload_to="sanctions/", null=True, blank=True)
    reponse_employe     = models.TextField(blank=True)
    date_reponse        = models.DateTimeField(null=True, blank=True)
    mesures_correctives = models.TextField(blank=True)
    entreprise          = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="sanctions",
    )

    # ── Mise à pied — conditions Art. 30 Loi 92/007 ──────────────────────────
    duree_mise_a_pied_jours = models.IntegerField(
        null=True, blank=True,
        validators=[MaxValueValidator(8)],
        help_text="Durée maximale légale : 8 jours ouvrables (Art. 30 al.3)"
    )
    date_debut_mise_a_pied = models.DateField(null=True, blank=True)
    date_fin_mise_a_pied   = models.DateField(null=True, blank=True)

    # ── Notification Inspecteur du Travail (Art. 30 al.3c — délai 48h) ───────
    notifie_it           = models.BooleanField(default=False)
    date_notification_it = models.DateField(null=True, blank=True)
    delai_48h_respecte   = models.BooleanField(default=False, editable=False)

    # ── Retenue sur salaire automatique (mise à pied uniquement) ─────────────
    montant_retenue_salaire = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    retenue_appliquee_paie  = models.BooleanField(default=False)

    # ── Droit de réponse (Art. 30) et suites ─────────────────────────────────
    delai_reponse_jours = models.IntegerField(default=8)
    conteste            = models.BooleanField(default=False)
    issue_contestation  = models.CharField(
        max_length=20, choices=IssueContestation.choices, blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering     = ["-date_sanction"]
        verbose_name = "Sanction disciplinaire"

    def __str__(self):
        return f"{self.get_type_sanction_display()} — {self.employe} ({self.date_sanction})"

    @property
    def gravite(self):
        niveaux = {
            "AVERTISSEMENT":             2,
            "BLAME":                     2,
            "MISE_A_PIED":               4,
            "LICENCIEMENT_FAUTE_GRAVE":  5,
            "LICENCIEMENT_FAUTE_LOURDE": 5,
        }
        return niveaux.get(self.type_sanction, 1)
