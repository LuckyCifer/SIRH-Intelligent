from django.db import models
from django.conf import settings


class Sanction(models.Model):

    class TypeSanction(models.TextChoices):
        AVERTISSEMENT_ORAL  = "AVERT_ORAL",     "Avertissement oral"
        AVERTISSEMENT_ECRIT = "AVERT_ECRIT",    "Avertissement écrit"
        BLAME               = "BLAME",          "Blâme"
        MISE_EN_GARDE       = "MISE_GARDE",     "Mise en garde"
        MISE_A_PIED         = "MISE_PIED",      "Mise à pied"
        RETROGRADATION      = "RETROGRADATION", "Rétrogradation"
        LICENCIEMENT        = "LICENCIEMENT",   "Licenciement"

    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        NOTIFIEE  = "NOTIFIEE",  "Notifiée à l'employé"
        ACCEPTEE  = "ACCEPTEE",  "Acceptée par l'employé"
        CONTESTEE = "CONTESTEE", "Contestée"
        ARCHIVEE  = "ARCHIVEE",  "Archivée"

    employe             = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sanctions"
    )
    type_sanction       = models.CharField(max_length=20, choices=TypeSanction.choices)
    motif               = models.CharField(max_length=500)
    description         = models.TextField()
    date_faits          = models.DateField()
    date_sanction       = models.DateField()
    date_debut_effet    = models.DateField(null=True, blank=True)
    date_fin_effet      = models.DateField(null=True, blank=True)
    prononcee_par       = models.ForeignKey(
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
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_sanction"]
        verbose_name = "Sanction disciplinaire"

    def __str__(self):
        return f"{self.get_type_sanction_display()} — {self.employe} ({self.date_sanction})"

    @property
    def gravite(self):
        niveaux = {
            "AVERT_ORAL": 1, "AVERT_ECRIT": 2, "BLAME": 2,
            "MISE_GARDE": 3, "MISE_PIED": 4, "RETROGRADATION": 4,
            "LICENCIEMENT": 5,
        }
        return niveaux.get(self.type_sanction, 1)
