from django.contrib import admin
from .models import OffreEmploi, Candidature, Entretien


@admin.register(OffreEmploi)
class OffreEmploiAdmin(admin.ModelAdmin):
    list_display = ["titre", "departement", "type_contrat", "statut", "date_publication", "cree_par"]
    list_filter = ["statut", "type_contrat", "niveau_experience"]
    search_fields = ["titre", "description"]
    date_hierarchy = "created_at"


@admin.register(Candidature)
class CandidatureAdmin(admin.ModelAdmin):
    list_display = ["nom_complet", "email", "offre", "statut", "score_cv_ia", "date_candidature"]
    list_filter = ["statut"]
    search_fields = ["nom_complet", "email"]
    date_hierarchy = "date_candidature"


@admin.register(Entretien)
class EntretienAdmin(admin.ModelAdmin):
    list_display = ["candidature", "type_entretien", "date_heure", "intervieweur", "resultat"]
    list_filter = ["type_entretien", "resultat"]
