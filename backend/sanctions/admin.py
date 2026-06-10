from django.contrib import admin
from .models import Sanction


@admin.register(Sanction)
class SanctionAdmin(admin.ModelAdmin):
    list_display = ["employe", "type_sanction", "date_sanction", "statut", "prononcee_par"]
    list_filter = ["type_sanction", "statut"]
    search_fields = ["employe__first_name", "employe__last_name", "motif"]
    date_hierarchy = "date_sanction"
