from django.contrib import admin
from .models import CategorieDocument, DocumentRH


@admin.register(CategorieDocument)
class CategorieDocumentAdmin(admin.ModelAdmin):
    list_display  = ["nom", "code", "icone", "couleur"]
    search_fields = ["nom", "code"]


@admin.register(DocumentRH)
class DocumentRHAdmin(admin.ModelAdmin):
    list_display   = ["titre", "employe", "categorie", "visibilite",
                      "taille_fichier", "date_expiration", "created_at"]
    list_filter    = ["categorie", "visibilite"]
    search_fields  = ["titre", "employe__username", "employe__first_name"]
    raw_id_fields  = ["employe", "uploade_par"]
    date_hierarchy = "created_at"
