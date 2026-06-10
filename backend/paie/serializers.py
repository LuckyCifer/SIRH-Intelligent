from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ConfigurationPaie, ElementPaie, BulletinPaie

User = get_user_model()

MOIS_LABELS = ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
               "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]


class UserMinSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "nom_complet", "email", "username"]

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username


class ConfigurationPaieSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigurationPaie
        fields = "__all__"


class ElementPaieSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = ElementPaie
        fields = "__all__"


class BulletinPaieSerializer(serializers.ModelSerializer):
    employe_detail    = UserMinSerializer(source="employe", read_only=True)
    genere_par_detail = UserMinSerializer(source="genere_par", read_only=True)
    valide_par_detail = UserMinSerializer(source="valide_par", read_only=True)
    statut_display    = serializers.CharField(source="get_statut_display", read_only=True)
    periode           = serializers.SerializerMethodField()

    class Meta:
        model = BulletinPaie
        fields = "__all__"
        read_only_fields = [
            "genere_par", "valide_par", "date_validation",
            "cnps_employe", "irpp", "salaire_net", "details",
            "created_at", "updated_at",
        ]

    def get_periode(self, obj):
        return f"{MOIS_LABELS[obj.mois]} {obj.annee}"
