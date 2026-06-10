from django.db import models
from django.conf import settings


class CategorieFormation(models.Model):
    nom         = models.CharField(max_length=100)
    code        = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    icone       = models.CharField(max_length=50, default="fas fa-graduation-cap")
    couleur     = models.CharField(max_length=7, default="#7B2D8B")

    class Meta:
        verbose_name = "Catégorie de formation"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Formation(models.Model):

    class Modalite(models.TextChoices):
        PRESENTIEL = "PRESENTIEL", "Présentiel"
        DISTANCIEL = "DISTANCIEL", "À distance"
        HYBRIDE    = "HYBRIDE",    "Hybride"
        ELEARNING  = "ELEARNING",  "E-learning"

    class Statut(models.TextChoices):
        PLANIFIEE = "PLANIFIEE", "Planifiée"
        EN_COURS  = "EN_COURS",  "En cours"
        TERMINEE  = "TERMINEE",  "Terminée"
        ANNULEE   = "ANNULEE",   "Annulée"

    class Niveau(models.TextChoices):
        DEBUTANT      = "DEBUTANT",      "Débutant"
        INTERMEDIAIRE = "INTERMEDIAIRE", "Intermédiaire"
        AVANCE        = "AVANCE",        "Avancé"
        EXPERT        = "EXPERT",        "Expert"

    titre                  = models.CharField(max_length=300)
    categorie              = models.ForeignKey(
        CategorieFormation, on_delete=models.SET_NULL, null=True, related_name="formations"
    )
    description            = models.TextField()
    objectifs_pedagogiques = models.TextField(blank=True)
    modalite               = models.CharField(max_length=20, choices=Modalite.choices, default=Modalite.PRESENTIEL)
    niveau                 = models.CharField(max_length=20, choices=Niveau.choices, default=Niveau.INTERMEDIAIRE)
    duree_heures           = models.IntegerField(default=8)
    date_debut             = models.DateField(null=True, blank=True)
    date_fin               = models.DateField(null=True, blank=True)
    lieu                   = models.CharField(max_length=200, blank=True)
    formateur              = models.CharField(max_length=200, blank=True)
    cout                   = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    places_max             = models.IntegerField(default=20)
    statut                 = models.CharField(max_length=20, choices=Statut.choices, default=Statut.PLANIFIEE)
    cree_par               = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="formations_creees"
    )
    entreprise             = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="formations",
    )
    created_at             = models.DateTimeField(auto_now_add=True)
    updated_at             = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_debut"]
        verbose_name = "Formation"

    def __str__(self):
        return f"{self.titre} ({self.get_statut_display()})"

    @property
    def nb_inscrits(self):
        return self.inscriptions.filter(statut__in=["INSCRIT", "PRESENT"]).count()

    @property
    def places_restantes(self):
        return self.places_max - self.nb_inscrits


class InscriptionFormation(models.Model):

    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente de validation"
        INSCRIT    = "INSCRIT",    "Inscrit"
        PRESENT    = "PRESENT",    "Présent"
        ABSENT     = "ABSENT",     "Absent"
        ANNULE     = "ANNULE",     "Annulé"

    employe          = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="inscriptions_formations"
    )
    formation        = models.ForeignKey(
        Formation, on_delete=models.CASCADE, related_name="inscriptions"
    )
    statut           = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    date_inscription = models.DateTimeField(auto_now_add=True)
    valide_par       = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="inscriptions_validees"
    )
    note_formation   = models.IntegerField(null=True, blank=True)
    commentaire      = models.TextField(blank=True)
    certificat       = models.FileField(upload_to="formations/certificats/", null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["employe", "formation"]
        verbose_name = "Inscription à une formation"

    def __str__(self):
        return f"{self.employe} → {self.formation.titre}"


class CompetenceAcquise(models.Model):
    employe          = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="competences_acquises"
    )
    formation        = models.ForeignKey(
        Formation, on_delete=models.CASCADE, related_name="competences"
    )
    competence       = models.CharField(max_length=200)
    niveau_acquis    = models.CharField(
        max_length=20,
        choices=[
            ("NOTIONS", "Notions"), ("PRATIQUE", "Pratique"),
            ("MAITRISE", "Maîtrise"), ("EXPERTISE", "Expertise"),
        ],
        default="PRATIQUE",
    )
    date_acquisition = models.DateField(auto_now_add=True)

    class Meta:
        verbose_name = "Compétence acquise"

    def __str__(self):
        return f"{self.employe} — {self.competence}"
