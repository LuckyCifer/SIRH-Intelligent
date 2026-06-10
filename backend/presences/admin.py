from django.contrib import admin
from .models import Pointage, ConfigPresence


@admin.register(Pointage)
class PointageAdmin(admin.ModelAdmin):
    list_display  = ["employe", "date", "heure_arrivee", "heure_depart",
                     "statut", "heures_travaillees", "heures_supplementaires"]
    list_filter   = ["statut", "date"]
    search_fields = ["employe__username", "employe__first_name", "employe__last_name"]
    date_hierarchy = "date"
    raw_id_fields  = ["employe", "valide_par"]


@admin.register(ConfigPresence)
class ConfigPresenceAdmin(admin.ModelAdmin):
    list_display = ["heure_arrivee_standard", "heure_depart_standard",
                    "tolerance_retard_minutes", "heures_journee_standard"]
