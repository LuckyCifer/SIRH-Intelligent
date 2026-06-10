from django.contrib import admin
from .models import CategorieFormation, Formation, InscriptionFormation, CompetenceAcquise


@admin.register(CategorieFormation)
class CategorieFormationAdmin(admin.ModelAdmin):
    list_display = ["nom", "code", "couleur"]
    search_fields = ["nom", "code"]


@admin.register(Formation)
class FormationAdmin(admin.ModelAdmin):
    list_display = ["titre", "categorie", "modalite", "statut", "date_debut", "nb_inscrits"]
    list_filter = ["statut", "modalite", "niveau", "categorie"]
    search_fields = ["titre", "formateur"]
    date_hierarchy = "date_debut"


@admin.register(InscriptionFormation)
class InscriptionFormationAdmin(admin.ModelAdmin):
    list_display = ["employe", "formation", "statut", "date_inscription", "note_formation"]
    list_filter = ["statut"]
    search_fields = ["employe__first_name", "employe__last_name"]


@admin.register(CompetenceAcquise)
class CompetenceAcquiseAdmin(admin.ModelAdmin):
    list_display = ["employe", "competence", "niveau_acquis", "date_acquisition"]
    list_filter = ["niveau_acquis"]
