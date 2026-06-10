from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class PeriodeEvaluation(models.Model):
    class TypePeriode(models.TextChoices):
        MENSUEL = "MENSUEL", "Mensuel"
        TRIMESTRIEL = "TRIMESTRIEL", "Trimestriel"
        SEMESTRIEL = "SEMESTRIEL", "Semestriel"
        ANNUEL = "ANNUEL", "Annuel"

    class Statut(models.TextChoices):
        EN_COURS = "EN_COURS", "En cours"
        CLOTURE = "CLOTURE", "Clôturé"
        ARCHIVE = "ARCHIVE", "Archivé"

    nom = models.CharField(max_length=100)
    type_periode = models.CharField(max_length=20, choices=TypePeriode.choices)
    date_debut = models.DateField()
    date_fin = models.DateField()
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_COURS)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_debut"]
        verbose_name = "Période d'évaluation"
        verbose_name_plural = "Périodes d'évaluation"

    def __str__(self):
        return f"{self.nom} ({self.get_type_periode_display()})"


class Objectif(models.Model):
    class Priorite(models.TextChoices):
        FAIBLE = "FAIBLE", "Faible"
        MOYENNE = "MOYENNE", "Moyenne"
        HAUTE = "HAUTE", "Haute"
        CRITIQUE = "CRITIQUE", "Critique"

    class Statut(models.TextChoices):
        NON_COMMENCE = "NON_COMMENCE", "Non commencé"
        EN_COURS = "EN_COURS", "En cours"
        ATTEINT = "ATTEINT", "Atteint"
        DEPASSE = "DEPASSE", "Dépassé"
        NON_ATTEINT = "NON_ATTEINT", "Non atteint"
        ABANDONNE = "ABANDONNE", "Abandonné"

    employe = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="objectifs",
    )
    assigne_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="objectifs_assignes",
    )
    periode = models.ForeignKey(
        PeriodeEvaluation,
        on_delete=models.CASCADE,
        related_name="objectifs",
    )
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    indicateur = models.CharField(max_length=200, blank=True)
    cible = models.CharField(max_length=100, blank=True)
    priorite = models.CharField(max_length=20, choices=Priorite.choices, default=Priorite.MOYENNE)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.NON_COMMENCE)
    progression = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    date_echeance = models.DateField(null=True, blank=True)
    commentaire_employe = models.TextField(blank=True)
    commentaire_manager = models.TextField(blank=True)
    entreprise = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="objectifs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Objectif"

    def __str__(self):
        return f"{self.titre} — {self.employe.get_full_name()}"


class NoteField(models.IntegerField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("validators", [MinValueValidator(1), MaxValueValidator(5)])
        kwargs.setdefault("null", True)
        kwargs.setdefault("blank", True)
        super().__init__(*args, **kwargs)


class EvaluationPerformance(models.Model):
    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        SIGNE = "SIGNE", "Signé"
        CONTESTE = "CONTESTE", "Contesté"

    employe = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="evaluations",
    )
    evaluateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evaluations_faites",
    )
    periode = models.ForeignKey(
        PeriodeEvaluation,
        on_delete=models.CASCADE,
        related_name="evaluations",
    )

    note_competences = NoteField()
    note_objectifs = NoteField()
    note_comportement = NoteField()
    note_initiative = NoteField()
    note_travail_equipe = NoteField()
    note_communication = NoteField()

    note_globale = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    points_forts = models.TextField(blank=True)
    axes_amelioration = models.TextField(blank=True)
    objectifs_periode_suiv = models.TextField(blank=True)
    commentaire_employe = models.TextField(blank=True)
    commentaire_rh = models.TextField(blank=True)

    analyse_ia = models.JSONField(null=True, blank=True)
    score_ia = models.IntegerField(null=True, blank=True)

    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.BROUILLON)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [["employe", "periode"]]
        ordering = ["-created_at"]
        verbose_name = "Évaluation de performance"
        verbose_name_plural = "Évaluations de performance"

    def save(self, *args, **kwargs):
        notes = [
            self.note_competences,
            self.note_objectifs,
            self.note_comportement,
            self.note_initiative,
            self.note_travail_equipe,
            self.note_communication,
        ]
        notes_valides = [n for n in notes if n is not None]
        if notes_valides:
            self.note_globale = round(sum(notes_valides) / len(notes_valides), 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Évaluation {self.employe.get_full_name()} — {self.periode}"
