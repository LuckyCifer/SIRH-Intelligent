from django.contrib import admin
from .models import RapportHebdomadaire

@admin.register(RapportHebdomadaire)
class RapportAdmin(admin.ModelAdmin):
    list_display  = ["stagiaire", "semaine_numero", "statut", "date_soumission", "date_validation"]
    list_filter   = ["statut", "date_debut_semaine"]
    search_fields = ["stagiaire__username"]
    readonly_fields = ["date_soumission", "date_validation", "created_at", "updated_at"]
