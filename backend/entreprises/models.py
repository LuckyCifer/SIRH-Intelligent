from django.db import models


class Entreprise(models.Model):

    class Secteur(models.TextChoices):
        TECHNOLOGIE = "TECH",  "Technologie & Numérique"
        SANTE       = "SANTE", "Santé & Pharmacie"
        EDUCATION   = "EDU",   "Éducation & Formation"
        FINANCE     = "FIN",   "Finance & Assurance"
        COMMERCE    = "COM",   "Commerce & Distribution"
        INDUSTRIE   = "IND",   "Industrie & Production"
        BTP         = "BTP",   "BTP & Immobilier"
        AGRICULTURE = "AGR",   "Agriculture & Agroalimentaire"
        SERVICES    = "SRV",   "Services aux entreprises"
        ONG         = "ONG",   "ONG & Association"
        AUTRE       = "AUTRE", "Autre"

    class Taille(models.TextChoices):
        TPE = "TPE", "TPE (1-9 employés)"
        PME = "PME", "PME (10-249 employés)"
        ETI = "ETI", "ETI (250-4999 employés)"
        GE  = "GE",  "Grande entreprise (5000+)"

    class Statut(models.TextChoices):
        ACTIVE    = "ACTIVE",    "Active"
        SUSPENDUE = "SUSPENDUE", "Suspendue"
        EXPIREE   = "EXPIREE",   "Expirée"
        ESSAI     = "ESSAI",     "Période d'essai"

    # Identité
    nom              = models.CharField(max_length=300)
    slug             = models.SlugField(unique=True, help_text="Identifiant URL unique ex: acerfi-sarl")
    sigle            = models.CharField(max_length=20, blank=True, help_text="Sigle ou acronyme ex: ACERFI")
    logo             = models.ImageField(upload_to="entreprises/logos/", null=True, blank=True)
    couleur_primaire   = models.CharField(max_length=7, default="#1F3864", help_text="Couleur principale de la charte graphique")
    couleur_secondaire = models.CharField(max_length=7, default="#2E74B5")

    # Informations légales
    secteur              = models.CharField(max_length=10, choices=Secteur.choices, default=Secteur.SERVICES)
    taille               = models.CharField(max_length=10, choices=Taille.choices, default=Taille.PME)
    numero_contribuable  = models.CharField(max_length=50, blank=True)
    registre_commerce    = models.CharField(max_length=50, blank=True)
    date_creation        = models.DateField(null=True, blank=True)

    # Contact
    adresse   = models.TextField(blank=True)
    ville     = models.CharField(max_length=100, default="Yaoundé")
    pays      = models.CharField(max_length=100, default="Cameroun")
    telephone = models.CharField(max_length=20, blank=True)
    email     = models.EmailField(blank=True)
    site_web  = models.URLField(blank=True)

    # Abonnement
    statut                = models.CharField(max_length=20, choices=Statut.choices, default=Statut.ESSAI)
    date_debut_abonnement = models.DateField(null=True, blank=True)
    date_fin_abonnement   = models.DateField(null=True, blank=True)
    nb_employes_max       = models.IntegerField(default=50, help_text="Nombre max d'employés autorisés")

    # Configuration RH
    devise               = models.CharField(max_length=10, default="FCFA")
    fuseau_horaire       = models.CharField(max_length=50, default="Africa/Douala")
    heure_debut_travail  = models.TimeField(default="08:00")
    heure_fin_travail    = models.TimeField(default="17:00")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering     = ["nom"]
        verbose_name = "Entreprise"

    def __str__(self):
        return f"{self.nom} ({self.slug})"

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.nom)
        super().save(*args, **kwargs)

    @property
    def abonnement_actif(self):
        from django.utils import timezone
        if self.statut not in ("ACTIVE", "ESSAI"):
            return False
        if self.date_fin_abonnement:
            return self.date_fin_abonnement >= timezone.now().date()
        return True

    @property
    def jours_restants_abonnement(self):
        if self.date_fin_abonnement:
            from django.utils import timezone
            delta = self.date_fin_abonnement - timezone.now().date()
            return max(0, delta.days)
        return None
