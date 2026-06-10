from rest_framework import serializers
from .models import Pointage, ConfigPresence


class PointageSerializer(serializers.ModelSerializer):
    employe_detail = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    retard_minutes = serializers.SerializerMethodField()

    class Meta:
        model  = Pointage
        fields = "__all__"
        read_only_fields = [
            "heures_travaillees", "heures_supplementaires",
            "created_at", "updated_at",
        ]

    def get_employe_detail(self, obj):
        from accounts.serializers import UserSerializer
        return UserSerializer(obj.employe).data

    def get_retard_minutes(self, obj):
        if not obj.heure_arrivee:
            return 0
        try:
            config = ConfigPresence.objects.first()
            if not config:
                return 0
            from datetime import datetime, date as date_type
            arrivee  = datetime.combine(date_type.today(), obj.heure_arrivee)
            standard = datetime.combine(date_type.today(), config.heure_arrivee_standard)
            diff     = (arrivee - standard).total_seconds() / 60
            if diff > config.tolerance_retard_minutes:
                return round(diff)
        except Exception:
            pass
        return 0


class ConfigPresenceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ConfigPresence
        fields = "__all__"
