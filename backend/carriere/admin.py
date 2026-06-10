from django.contrib import admin
from .models import EvenementCarriere


@admin.register(EvenementCarriere)
class EvenementCarriereAdmin(admin.ModelAdmin):
    list_display = ["employe", "type_evenement", "date_evenement", "titre"]
    list_filter = ["type_evenement"]
    search_fields = ["employe__first_name", "employe__last_name", "titre"]
    date_hierarchy = "date_evenement"
