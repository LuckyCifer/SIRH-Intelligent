"""
Modèles — Congés & Absences (SIRH)
Conformité Code du Travail camerounais — Loi n°92/007 du 14 août 1992.
"""
from django.db import models
from django.conf import settings


class TypeConge(models.Model):

    class CodeLegal(models.TextChoices):
        ANNUEL    = "ANNUEL",    "Congé annuel ordinaire"
        MATERNITE = "MATERNITE", "Congé de maternité"
        MALADIE   = "MALADIE",   "Congé maladie"
        PERMISSION = "PERMISSION", "Permission exceptionnelle d'absence"
        SYNDICAL  = "SYNDICAL",  "Congé syndical"
        SANS_SOLDE = "SANS_SOLDE", "Congé sans solde"
        PATERNITE = "PATERNITE", "Congé de paternité"

    nom            = models.CharField(max_length=100)
    code           = models.CharField(max_length=20, unique=True)
    jours_par_an   = models.IntegerField(default=30, help_text="Nombre de jours alloués par an")
    est_paye       = models.BooleanField(default=True)
    necessite_justificatif = models.BooleanField(default=False)
    couleur        = models.CharField(max_length=7, default="#2E74B5")
    description    = models.TextField(blank=True)
    actif          = models.BooleanField(default=True)
    # Champs légaux (Art. 89-93 Code du Travail)
    code_legal     = models.CharField(
        max_length=30,
        choices=CodeLegal.choices,
        default=CodeLegal.ANNUEL,
    )
    deductible_conge_annuel = models.BooleanField(
        default=True,
        help_text="Ce type de congé se déduit-il du solde de congé annuel ?",
    )

    class Meta:
        verbose_name        = "Type de congé"
        verbose_name_plural = "Types de congé"
        ordering = ["nom"]

    def __str__(self):
        return f"{self.nom} ({self.jours_par_an}j/an)"


class DemandeConge(models.Model):

    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        APPROUVE   = "APPROUVE",   "Approuvé"
        REFUSE     = "REFUSE",     "Refusé"
        ANNULE     = "ANNULE",     "Annulé"

    employe    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="demandes_conge",
    )
    type_conge = models.ForeignKey(
        TypeConge,
        on_delete=models.PROTECT,
        related_name="demandes",
    )
    date_debut = models.DateField()
    date_fin   = models.DateField()
    nb_jours   = models.IntegerField(help_text="Calculé automatiquement")
    motif      = models.TextField(help_text="Raison de la demande")
    justificatif = models.FileField(
        upload_to="conges/justificatifs/",
        null=True, blank=True,
    )
    statut     = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.EN_ATTENTE,
    )
    valideur   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="conges_valides",
    )
    commentaire_valideur = models.TextField(blank=True)
    date_validation      = models.DateTimeField(null=True, blank=True)
    entreprise = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="demandes_conge",
    )
    # Champs calculés — conformité Art. 89-93
    allocation_conge      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    date_retour_prevue    = models.DateField(null=True, blank=True)
    jours_ouvrable_pauses = models.IntegerField(default=0, help_text="Jours fériés tombant en semaine pendant le congé")
    majoration_enfants    = models.IntegerField(default=0)
    majoration_anciennete = models.IntegerField(default=0)
    notifie_valideur      = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = "Demande de congé"
        verbose_name_plural = "Demandes de congé"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employe} — {self.type_conge.nom} ({self.date_debut} → {self.date_fin})"

    def save(self, *args, **kwargs):
        if self.date_debut and self.date_fin:
            from .calculateur_conges import CalculateurConges
            from datetime import timedelta
            calc = CalculateurConges()
            self.nb_jours = calc.calculer_jours_ouvrables(self.date_debut, self.date_fin)
            # Nombre de jours fériés tombant en semaine pendant le congé
            feries = calc.get_jours_feries(self.date_debut.year)
            if self.date_fin.year != self.date_debut.year:
                feries |= calc.get_jours_feries(self.date_fin.year)
            self.jours_ouvrable_pauses = sum(
                1 for i in range((self.date_fin - self.date_debut).days + 1)
                if (self.date_debut + timedelta(days=i)).weekday() < 5
                and (self.date_debut + timedelta(days=i)) in feries
            )
            self.date_retour_prevue = calc.calculer_date_retour(self.date_fin)
        super().save(*args, **kwargs)


class SoldeConge(models.Model):
    employe    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="soldes_conge",
    )
    type_conge = models.ForeignKey(
        TypeConge,
        on_delete=models.CASCADE,
        related_name="soldes",
    )
    annee          = models.IntegerField(help_text="Année concernée ex: 2026")
    jours_acquis   = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    jours_pris     = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    jours_en_attente = models.DecimalField(max_digits=5, decimal_places=1, default=0)

    class Meta:
        unique_together     = ["employe", "type_conge", "annee"]
        verbose_name        = "Solde de congé"
        verbose_name_plural = "Soldes de congé"

    def __str__(self):
        return f"{self.employe} — {self.type_conge.nom} {self.annee} : {self.solde_restant}j restants"

    @property
    def solde_restant(self):
        return float(self.jours_acquis) - float(self.jours_pris) - float(self.jours_en_attente)
