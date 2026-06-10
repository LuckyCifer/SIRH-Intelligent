from django.db import models
from django.conf import settings


class EvenementCarriere(models.Model):

    class TypeEvenement(models.TextChoices):
        EMBAUCHE          = "EMBAUCHE",          "Embauche"
        PROMOTION         = "PROMOTION",         "Promotion"
        MUTATION          = "MUTATION",          "Mutation département"
        CHANGEMENT_POSTE  = "CHANGEMENT_POSTE",  "Changement de poste"
        AUGMENTATION      = "AUGMENTATION",      "Augmentation salariale"
        FORMATION         = "FORMATION",         "Formation suivie"
        CONGE_LONG        = "CONGE_LONG",        "Congé longue durée"
        AVERTISSEMENT     = "AVERTISSEMENT",     "Avertissement"
        FELICITATION      = "FELICITATION",      "Félicitation / Award"
        DEPART            = "DEPART",            "Départ"
        AUTRE             = "AUTRE",             "Autre événement"

    employe = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="historique_carriere",
    )
    type_evenement = models.CharField(max_length=30, choices=TypeEvenement.choices)
    date_evenement = models.DateField()
    titre = models.CharField(max_length=300)
    description = models.TextField(blank=True)

    departement_avant = models.ForeignKey(
        "departements.Departement",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="departs_carriere",
    )
    departement_apres = models.ForeignKey(
        "departements.Departement",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="arrivees_carriere",
    )
    poste_avant = models.ForeignKey(
        "departements.Poste",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="departs_carriere",
    )
    poste_apres = models.ForeignKey(
        "departements.Poste",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="arrivees_carriere",
    )
    salaire_avant = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    salaire_apres = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    document = models.FileField(upload_to="carriere/", null=True, blank=True)
    enregistre_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="evenements_enregistres",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_evenement"]
        verbose_name = "Événement de carrière"
        verbose_name_plural = "Événements de carrière"

    def __str__(self):
        return (
            f"{self.employe} — "
            f"{self.get_type_evenement_display()} "
            f"({self.date_evenement})"
        )
