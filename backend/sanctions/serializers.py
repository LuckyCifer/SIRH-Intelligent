from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Sanction

User = get_user_model()


class UserMinSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "nom_complet", "email"]

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username


class SanctionSerializer(serializers.ModelSerializer):
    employe_detail       = UserMinSerializer(source="employe", read_only=True)
    prononcee_par_detail = UserMinSerializer(source="prononcee_par", read_only=True)
    type_sanction_display = serializers.CharField(source="get_type_sanction_display", read_only=True)
    statut_display       = serializers.CharField(source="get_statut_display", read_only=True)
    gravite              = serializers.IntegerField(read_only=True)
    duree_jours          = serializers.SerializerMethodField()

    class Meta:
        model = Sanction
        fields = "__all__"
        read_only_fields = ["prononcee_par", "created_at", "updated_at"]

    def get_duree_jours(self, obj):
        if obj.date_debut_effet and obj.date_fin_effet:
            return (obj.date_fin_effet - obj.date_debut_effet).days
        return None
