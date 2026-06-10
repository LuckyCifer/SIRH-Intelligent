from django.contrib import admin
from .models import ConfigurationPaie, ElementPaie, BulletinPaie


@admin.register(ConfigurationPaie)
class ConfigurationPaieAdmin(admin.ModelAdmin):
    list_display = ["nom", "salaire_minimum", "taux_cnps_employe", "taux_cnps_employeur", "active"]
    list_filter  = ["active"]


@admin.register(ElementPaie)
class ElementPaieAdmin(admin.ModelAdmin):
    list_display = ["code", "libelle", "type", "montant_fixe", "taux", "imposable", "is_actif"]
    list_filter  = ["type", "is_actif"]


@admin.register(BulletinPaie)
class BulletinPaieAdmin(admin.ModelAdmin):
    list_display  = ["employe", "mois", "annee", "salaire_brut", "salaire_net", "statut"]
    list_filter   = ["statut", "annee", "mois"]
    search_fields = ["employe__first_name", "employe__last_name", "employe__username"]
    readonly_fields = ["cnps_employe", "irpp", "salaire_net", "details", "created_at", "updated_at"]
