from django.contrib import admin
from .models import TypeConge, DemandeConge, SoldeConge


@admin.register(TypeConge)
class TypeCongeAdmin(admin.ModelAdmin):
    list_display = ["nom", "code", "jours_par_an", "est_paye", "necessite_justificatif", "actif"]
    list_filter  = ["est_paye", "actif"]
    search_fields = ["nom", "code"]


@admin.register(DemandeConge)
class DemandeCongeAdmin(admin.ModelAdmin):
    list_display  = ["employe", "type_conge", "date_debut", "date_fin", "nb_jours", "statut"]
    list_filter   = ["statut", "type_conge"]
    search_fields = ["employe__username", "employe__first_name", "employe__last_name"]
    date_hierarchy = "date_debut"


@admin.register(SoldeConge)
class SoldeCongeAdmin(admin.ModelAdmin):
    list_display  = ["employe", "type_conge", "annee", "jours_acquis", "jours_pris", "jours_en_attente"]
    list_filter   = ["annee", "type_conge"]
    search_fields = ["employe__username"]
