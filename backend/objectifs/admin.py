from django.contrib import admin
from .models import PeriodeEvaluation, Objectif, EvaluationPerformance


@admin.register(PeriodeEvaluation)
class PeriodeEvaluationAdmin(admin.ModelAdmin):
    list_display = ["nom", "type_periode", "date_debut", "date_fin", "statut"]
    list_filter = ["statut", "type_periode"]
    search_fields = ["nom"]


@admin.register(Objectif)
class ObjectifAdmin(admin.ModelAdmin):
    list_display = ["titre", "employe", "periode", "priorite", "statut", "progression"]
    list_filter = ["statut", "priorite", "periode"]
    search_fields = ["titre", "employe__first_name", "employe__last_name"]
    autocomplete_fields = ["employe", "assigne_par"]


@admin.register(EvaluationPerformance)
class EvaluationPerformanceAdmin(admin.ModelAdmin):
    list_display = ["employe", "periode", "note_globale", "score_ia", "statut"]
    list_filter = ["statut", "periode"]
    search_fields = ["employe__first_name", "employe__last_name"]
    readonly_fields = ["note_globale", "analyse_ia", "score_ia"]
