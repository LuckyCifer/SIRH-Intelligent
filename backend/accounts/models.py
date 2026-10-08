"""
Modèle utilisateur personnalisé — SIRH
Quatre rôles : EMPLOYE / MANAGER / RH / ADMIN
"""
import os
from django.contrib.auth.models import AbstractUser
from django.core.validators import FileExtensionValidator
from django.db import models


def user_photo_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    return f'photos_profil/user_{instance.id}/photo.{ext}'


class User(AbstractUser):

    class Role(models.TextChoices):
        EMPLOYE  = "EMPLOYE",  "Employé"
        MANAGER  = "MANAGER",  "Manager / Responsable"
        RH       = "RH",       "Responsable RH"
        ADMIN    = "ADMIN",    "Administrateur Système"

    class Filiere(models.TextChoices):
        BUREAUTIQUE    = "BUREAUTIQUE",    "Bureautique & Productivité"
        MARKETING      = "MARKETING",      "Marketing Digital"
        DEV_WEB        = "DEV_WEB",        "Développement Web & App"
        CYBERSEC       = "CYBERSEC",       "Cybersécurité"
        GESTION_PROJET = "GESTION_PROJET", "Gestion de Projet"
        INFRA_RESEAUX  = "INFRA_RESEAUX",  "Infrastructures & Réseaux"
        IA             = "IA",             "Intelligence Artificielle"
        CLOUD          = "CLOUD",          "Cloud Computing"
        AUTRE          = "AUTRE",          "Autre"

    class CategorieProf(models.TextChoices):
        I    = "I",    "Catégorie I"
        II   = "II",   "Catégorie II"
        III  = "III",  "Catégorie III"
        IV   = "IV",   "Catégorie IV"
        V    = "V",    "Catégorie V"
        VI   = "VI",   "Catégorie VI"
        VII  = "VII",  "Catégorie VII"
        VIII = "VIII", "Catégorie VIII"
        IX   = "IX",   "Catégorie IX"
        X    = "X",    "Catégorie X"
        XI   = "XI",   "Catégorie XI"
        XII  = "XII",  "Catégorie XII"

    class SituationMatrimoniale(models.TextChoices):
        CELIBATAIRE = "CELIBATAIRE", "Célibataire"
        MARIE       = "MARIE",       "Marié(e)"
        DIVORCE     = "DIVORCE",     "Divorcé(e)"
        VEUF        = "VEUF",        "Veuf/Veuve"

    role       = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYE)
    filiere    = models.CharField(max_length=20, choices=Filiere.choices, default=Filiere.AUTRE, blank=True)
    telephone  = models.CharField(max_length=20, blank=True)
    photo      = models.ImageField(upload_to="photos/", null=True, blank=True)
    photo_profil = models.ImageField(
        upload_to=user_photo_path,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png'])],
        help_text="Photo de profil — Format JPG/PNG — Max 2 Mo — Ratio 3×4",
    )
    bio        = models.TextField(blank=True)

    # Champs RH — FK ajoutées après création des apps (nullable pour rétrocompatibilité)
    departement = models.ForeignKey(
        "departements.Departement",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="employes",
    )
    poste = models.ForeignKey(
        "departements.Poste",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="employes",
    )
    entreprise = models.ForeignKey(
        "entreprises.Entreprise",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="employes",
    )

    # ── Identifiants légaux ──
    numero_cnps = models.CharField(max_length=20, blank=True)
    numero_cni  = models.CharField(max_length=20, blank=True)
    niu         = models.CharField(max_length=20, blank=True)

    # ── Classification professionnelle (grille salariale SMIG Cameroun) ──
    categorie_pro           = models.CharField(
        max_length=5, choices=CategorieProf.choices, blank=True,
    )
    echelon                 = models.IntegerField(default=1)
    coefficient             = models.IntegerField(default=100)
    date_dernier_avancement = models.DateField(null=True, blank=True)
    prochain_avancement     = models.DateField(null=True, blank=True)

    # ── Situation familiale (IRPP / CNPS) ──
    situation_matrimoniale  = models.CharField(
        max_length=15, choices=SituationMatrimoniale.choices,
        default=SituationMatrimoniale.CELIBATAIRE, blank=True,
    )
    nb_enfants_a_charge     = models.IntegerField(default=0)
    nb_enfants_moins_6_ans  = models.IntegerField(default=0)

    # ── Mobile Money ──
    numero_mobile    = models.CharField(
        max_length=25, blank=True,
        help_text="Numero MTN MoMo ou Orange Money (ex: 655123456)",
    )
    operateur_mobile = models.CharField(
        max_length=10, blank=True,
        choices=[("MTN", "MTN Mobile Money"), ("ORANGE", "Orange Money")],
        help_text="Operateur Mobile Money prefere",
    )

    # ── Coordonnées & état civil ──
    nationalite              = models.CharField(max_length=50, default="Camerounaise", blank=True)
    date_naissance           = models.DateField(null=True, blank=True)
    lieu_naissance           = models.CharField(max_length=100, blank=True)
    adresse                  = models.TextField(blank=True)
    personne_contact_urgence = models.CharField(max_length=200, blank=True)
    contact_urgence_tel      = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    # ── Aliases pour rétrocompatibilité avec le code existant ──
    @property
    def is_employe(self):
        return self.role == self.Role.EMPLOYE

    @property
    def is_manager(self):
        return self.role == self.Role.MANAGER

    @property
    def is_rh(self):
        return self.role == self.Role.RH

    @property
    def is_admin_sys(self):
        return self.role == self.Role.ADMIN

    # Aliases legacy (code existant utilise is_stagiaire / is_encadreur / is_admin_rh)
    @property
    def is_stagiaire(self):
        return self.role == self.Role.EMPLOYE

    @property
    def is_encadreur(self):
        return self.role == self.Role.MANAGER

    @property
    def is_admin_rh(self):
        return self.role in (self.Role.RH, self.Role.ADMIN)

    @property
    def anciennete_mois(self):
        from django.utils import timezone
        today  = timezone.now().date()
        joined = self.date_joined.date() if self.date_joined else today
        return (today.year - joined.year) * 12 + (today.month - joined.month)
