from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    destinataire_nom = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id", "type_notif", "categorie", "titre", "message", "lien",
            "lue", "date_lecture", "created_at", "destinataire_nom",
        ]
        read_only_fields = ["id", "created_at", "destinataire_nom"]

    def get_destinataire_nom(self, obj):
        return obj.destinataire.get_full_name()
