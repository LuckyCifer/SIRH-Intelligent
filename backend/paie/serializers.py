from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ConfigurationPaie, ElementPaie, BulletinPaie, VirementMobile

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
            # Workflow
            "genere_par", "valide_par", "date_validation", "created_at", "updated_at",
            # Cotisations salariales calculées
            "cnps_employe", "irpp", "cac", "cfc_salarie", "rav", "tdl",
            "total_retenues",
            # Charges patronales calculées
            "cnps_patronal_pension", "cnps_patronal_famille", "cnps_patronal_at",
            "cfc_patronal", "fne", "cout_total_employeur",
            # Récapitulatif calculé
            "salaire_brut", "total_primes",
            "salaire_brut_imposable", "salaire_brut_cotisable",
            "revenu_net_categoriel", "total_brut", "salaire_net",
            # Détails JSON
            "details",
        ]

    def get_periode(self, obj):
        return f"{MOIS_LABELS[obj.mois]} {obj.annee}"


class VirementMobileSerializer(serializers.ModelSerializer):
    employe_detail   = UserMinSerializer(source="employe",    read_only=True)
    initie_par_detail = UserMinSerializer(source="initie_par", read_only=True)
    statut_display   = serializers.CharField(source="get_statut_display",   read_only=True)
    operateur_display = serializers.CharField(source="get_operateur_display", read_only=True)

    class Meta:
        model  = VirementMobile
        fields = "__all__"
        read_only_fields = [
            "statut", "transaction_id", "message_erreur", "mode_demo",
            "initie_par", "date_confirmation", "created_at", "updated_at",
        ]
