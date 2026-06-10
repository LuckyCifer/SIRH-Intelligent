from django.contrib import admin
from .models import StagePeriode, ProjetSoutenance

@admin.register(StagePeriode)
class StagePeriodeAdmin(admin.ModelAdmin):
    list_display  = ["stagiaire", "encadreur", "date_debut", "date_fin", "statut"]
    list_filter   = ["statut", "date_debut"]
    search_fields = ["stagiaire__username", "encadreur__username"]

@admin.register(ProjetSoutenance)
class ProjetSoutenanceAdmin(admin.ModelAdmin):
    list_display  = ["stagiaire", "theme", "statut", "date_soutenance", "note"]
    list_filter   = ["statut"]
    search_fields = ["stagiaire__username", "theme"]
