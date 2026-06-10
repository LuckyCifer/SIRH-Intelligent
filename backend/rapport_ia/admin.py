from django.contrib import admin
from .models import RapportIAMensuel


@admin.register(RapportIAMensuel)
class RapportIAMensuelAdmin(admin.ModelAdmin):
    list_display  = ["__str__", "statut", "score_sante_rh", "genere_par", "created_at"]
    list_filter   = ["statut", "type_rapport", "annee", "mois"]
    readonly_fields = [
        "donnees_collectees", "contenu_rapport", "resume_executif",
        "indicateurs_cles", "alertes_ia", "recommandations",
        "score_sante_rh", "statut", "message_erreur",
        "created_at", "updated_at",
    ]
