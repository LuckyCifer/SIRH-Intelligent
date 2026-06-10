from django.db import models
from django.conf import settings


class CategorieDocument(models.Model):
    nom         = models.CharField(max_length=100)
    code        = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    icone       = models.CharField(max_length=50, default="fas fa-file")
    couleur     = models.CharField(max_length=7, default="#2E74B5")

    class Meta:
        verbose_name        = "Catégorie de document"
        verbose_name_plural = "Catégories de documents"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class DocumentRH(models.Model):

    class Visibilite(models.TextChoices):
        PRIVE   = "PRIVE",   "Privé (RH uniquement)"
        EMPLOYE = "EMPLOYE", "Visible par l'employé"
        EQUIPE  = "EQUIPE",  "Visible par l'équipe"
        TOUS    = "TOUS",    "Visible par tous"

    employe     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents_rh",
        null=True, blank=True,
        help_text="Laisser vide pour document d'entreprise général",
    )
    categorie   = models.ForeignKey(
        CategorieDocument,
        on_delete=models.PROTECT,
        related_name="documents",
    )
    titre       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    fichier     = models.FileField(upload_to="documents_rh/%Y/%m/")
    taille_fichier = models.IntegerField(default=0, help_text="Taille en octets")
    type_mime   = models.CharField(max_length=100, blank=True)
    visibilite  = models.CharField(
        max_length=20,
        choices=Visibilite.choices,
        default=Visibilite.EMPLOYE,
    )
    date_expiration = models.DateField(
        null=True, blank=True,
        help_text="Date d'expiration du document (si applicable)",
    )
    uploade_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="documents_uploades",
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering        = ["-created_at"]
        verbose_name    = "Document RH"
        verbose_name_plural = "Documents RH"

    def __str__(self):
        return f"{self.titre} — {self.employe or 'Général'}"

    def save(self, *args, **kwargs):
        if self.fichier:
            try:
                self.taille_fichier = self.fichier.size
            except Exception:
                pass
            import mimetypes
            self.type_mime = mimetypes.guess_type(self.fichier.name)[0] or ""
        super().save(*args, **kwargs)

    @property
    def taille_lisible(self):
        t = self.taille_fichier
        if t < 1024:
            return f"{t} o"
        elif t < 1024 * 1024:
            return f"{t / 1024:.1f} Ko"
        else:
            return f"{t / 1024 / 1024:.1f} Mo"

    @property
    def expire_bientot(self):
        if self.date_expiration:
            from django.utils import timezone
            delta = (self.date_expiration - timezone.now().date()).days
            return 0 <= delta <= 30
        return False
