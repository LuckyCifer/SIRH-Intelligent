from django.db import models
from django.conf import settings


class Notification(models.Model):

    class Type(models.TextChoices):
        INFO    = "INFO",    "Information"
        SUCCES  = "SUCCES",  "Succès"
        ALERTE  = "ALERTE",  "Alerte"
        URGENT  = "URGENT",  "Urgent"

    class Categorie(models.TextChoices):
        CONGE       = "CONGE",       "Congés & Absences"
        EVALUATION  = "EVALUATION",  "Évaluation & Objectifs"
        CONTRAT     = "CONTRAT",     "Contrats"
        PAIE        = "PAIE",        "Paie & Bulletins"
        FORMATION   = "FORMATION",   "Formations"
        RECRUTEMENT = "RECRUTEMENT", "Recrutements"
        SYSTEME     = "SYSTEME",     "Système"

    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type_notif    = models.CharField(max_length=10, choices=Type.choices, default=Type.INFO)
    categorie     = models.CharField(max_length=15, choices=Categorie.choices, default=Categorie.SYSTEME)
    titre         = models.CharField(max_length=200)
    message       = models.TextField()
    lien          = models.CharField(max_length=300, blank=True, help_text="URL relative vers la page concernée")
    lue           = models.BooleanField(default=False)
    date_lecture  = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering     = ["-created_at"]
        verbose_name = "Notification"

    def __str__(self):
        return f"[{self.type_notif}] {self.titre} → {self.destinataire}"
