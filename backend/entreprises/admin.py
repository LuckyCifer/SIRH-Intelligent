from django.contrib import admin
from .models import Entreprise


@admin.register(Entreprise)
class EntrepriseAdmin(admin.ModelAdmin):
    list_display = ["nom", "sigle", "ville", "statut", "nb_employes_max", "abonnement_actif"]
    list_filter = ["statut", "secteur", "taille", "pays"]
    search_fields = ["nom", "sigle", "email"]
    prepopulated_fields = {"slug": ("nom",)}
    readonly_fields = ["created_at", "updated_at", "abonnement_actif", "jours_restants_abonnement"]
