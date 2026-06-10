from django.contrib import admin
from .models import AnalyseIA

@admin.register(AnalyseIA)
class AnalyseIAAdmin(admin.ModelAdmin):
    list_display  = ["rapport", "score_engagement", "niveau_alerte", "modele_utilise", "date_analyse"]
    list_filter   = ["niveau_alerte", "modele_utilise"]
    readonly_fields = ["date_analyse", "tokens_utilises", "modele_utilise"]
