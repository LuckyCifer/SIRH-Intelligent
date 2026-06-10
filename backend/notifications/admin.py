from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["destinataire", "type_notif", "categorie", "titre", "lue", "created_at"]
    list_filter = ["type_notif", "categorie", "lue"]
    search_fields = ["titre", "message", "destinataire__username"]
    readonly_fields = ["created_at", "date_lecture"]
