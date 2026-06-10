from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class OffreEmploi(models.Model):

    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        PUBLIEE   = "PUBLIEE",   "Publiée"
        EN_PAUSE  = "EN_PAUSE",  "En pause"
        CLOTUREE  = "CLOTUREE",  "Clôturée"
        POURVUE   = "POURVUE",   "Poste pourvu"

    class TypeContrat(models.TextChoices):
        CDI       = "CDI",       "CDI"
        CDD       = "CDD",       "CDD"
        STAGE     = "STAGE",     "Stage"
        FREELANCE = "FREELANCE", "Freelance"

    class NiveauExperience(models.TextChoices):
        DEBUTANT = "DEBUTANT", "Débutant (0-2 ans)"
        JUNIOR   = "JUNIOR",   "Junior (2-5 ans)"
        CONFIRME = "CONFIRME", "Confirmé (5-10 ans)"
        SENIOR   = "SENIOR",   "Senior (10+ ans)"

    titre = models.CharField(max_length=300)
    departement = models.ForeignKey(
        "departements.Departement",
        on_delete=models.SET_NULL,
        null=True,
        related_name="offres",
    )
    poste = models.ForeignKey(
        "departements.Poste",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="offres",
    )
    type_contrat = models.CharField(
        max_length=20, choices=TypeContrat.choices, default=TypeContrat.CDI
    )
    niveau_experience = models.CharField(
        max_length=20, choices=NiveauExperience.choices, default=NiveauExperience.JUNIOR
    )
    description = models.TextField()
    competences_requises = models.TextField(help_text="Liste des compétences requises")
    salaire_min = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    salaire_max = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    lieu = models.CharField(max_length=200, default="Yaoundé, Cameroun")
    date_publication = models.DateField(null=True, blank=True)
    date_cloture = models.DateField(null=True, blank=True)
    nb_postes = models.IntegerField(default=1)
    statut = models.CharField(
        max_length=20, choices=Statut.choices, default=Statut.BROUILLON
    )
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="offres_creees",
    )
    entreprise = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="offres_emploi",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_publication", "-created_at"]
        verbose_name = "Offre d'emploi"
        verbose_name_plural = "Offres d'emploi"

    def __str__(self):
        return f"{self.titre} ({self.statut})"

    @property
    def nb_candidatures(self):
        return self.candidatures.count()


class Candidature(models.Model):

    class Statut(models.TextChoices):
        RECUE          = "RECUE",          "Reçue"
        EN_COURS       = "EN_COURS",       "En cours d'examen"
        ENTRETIEN_RH   = "ENTRETIEN_RH",   "Entretien RH"
        ENTRETIEN_TECH = "ENTRETIEN_TECH", "Entretien technique"
        OFFRE_FAITE    = "OFFRE_FAITE",    "Offre faite"
        ACCEPTEE       = "ACCEPTEE",       "Acceptée"
        REFUSEE        = "REFUSEE",        "Refusée"
        ABANDONNEE     = "ABANDONNEE",     "Abandonnée"

    offre = models.ForeignKey(
        OffreEmploi, on_delete=models.CASCADE, related_name="candidatures"
    )
    nom_complet = models.CharField(max_length=200)
    email = models.EmailField()
    telephone = models.CharField(max_length=20, blank=True)
    cv = models.FileField(upload_to="recrutements/cv/")
    lettre_motivation = models.FileField(
        upload_to="recrutements/lettres/", null=True, blank=True
    )
    linkedin = models.URLField(blank=True)
    source = models.CharField(max_length=100, blank=True)
    statut = models.CharField(
        max_length=20, choices=Statut.choices, default=Statut.RECUE
    )
    note_interne = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    commentaire_rh = models.TextField(blank=True)
    analyse_cv_ia = models.TextField(blank=True)
    score_cv_ia = models.IntegerField(null=True, blank=True)
    date_candidature = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_candidature"]
        verbose_name = "Candidature"
        unique_together = [["offre", "email"]]

    def __str__(self):
        return f"{self.nom_complet} → {self.offre.titre}"


class Entretien(models.Model):

    class Type(models.TextChoices):
        RH           = "RH",           "Entretien RH"
        TECHNIQUE    = "TECHNIQUE",    "Entretien technique"
        DIRECTION    = "DIRECTION",    "Entretien direction"
        TELEPHONIQUE = "TELEPHONIQUE", "Entretien téléphonique"

    class Resultat(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        POSITIF    = "POSITIF",    "Positif"
        NEGATIF    = "NEGATIF",    "Négatif"
        A_REVOIR   = "A_REVOIR",   "À revoir"

    candidature = models.ForeignKey(
        Candidature, on_delete=models.CASCADE, related_name="entretiens"
    )
    type_entretien = models.CharField(max_length=20, choices=Type.choices)
    date_heure = models.DateTimeField()
    duree_minutes = models.IntegerField(default=60)
    lieu = models.CharField(max_length=200, default="Bureaux de l'entreprise")
    intervieweur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="entretiens_menes",
    )
    resultat = models.CharField(
        max_length=20, choices=Resultat.choices, default=Resultat.EN_ATTENTE
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date_heure"]
        verbose_name = "Entretien"

    def __str__(self):
        return (
            f"{self.candidature.nom_complet} — "
            f"{self.get_type_entretien_display()} "
            f"({self.date_heure.strftime('%d/%m/%Y')})"
        )
