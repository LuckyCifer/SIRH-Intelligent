"""
Modèle utilisateur personnalisé — SIRH
Quatre rôles : EMPLOYE / MANAGER / RH / ADMIN
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


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

    role       = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYE)
    filiere    = models.CharField(max_length=20, choices=Filiere.choices, default=Filiere.AUTRE, blank=True)
    telephone  = models.CharField(max_length=20, blank=True)
    photo      = models.ImageField(upload_to="photos/", null=True, blank=True)
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
