from rest_framework import serializers
from .models import RapportIAMensuel


class RapportIAMensuelSerializer(serializers.ModelSerializer):
    periode          = serializers.ReadOnlyField()
    genere_par_nom   = serializers.SerializerMethodField()
    departement_nom  = serializers.SerializerMethodField()
    employe_nom      = serializers.SerializerMethodField()

    class Meta:
        model  = RapportIAMensuel
        fields = [
            "id", "mois", "annee", "periode", "type_rapport",
            "departement", "departement_nom",
            "employe", "employe_nom",
            "score_sante_rh", "statut", "message_erreur",
            "resume_executif", "indicateurs_cles",
            "alertes_ia", "recommandations",
            "donnees_collectees", "contenu_rapport",
            "genere_par", "genere_par_nom",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "statut", "message_erreur", "score_sante_rh",
            "resume_executif", "indicateurs_cles", "alertes_ia",
            "recommandations", "donnees_collectees", "contenu_rapport",
            "created_at", "updated_at",
        ]

    def get_genere_par_nom(self, obj):
        if obj.genere_par:
            return obj.genere_par.get_full_name() or obj.genere_par.username
        return None

    def get_departement_nom(self, obj):
        return obj.departement.nom if obj.departement else None

    def get_employe_nom(self, obj):
        if obj.employe:
            return obj.employe.get_full_name() or obj.employe.username
        return None


class RapportIAListSerializer(serializers.ModelSerializer):
    periode         = serializers.ReadOnlyField()
    departement_nom = serializers.SerializerMethodField()
    employe_nom     = serializers.SerializerMethodField()

    class Meta:
        model  = RapportIAMensuel
        fields = [
            "id", "mois", "annee", "periode", "type_rapport",
            "departement", "departement_nom",
            "employe", "employe_nom",
            "score_sante_rh", "statut",
            "resume_executif", "indicateurs_cles",
            "alertes_ia", "recommandations",
            "created_at",
        ]

    def get_departement_nom(self, obj):
        return obj.departement.nom if obj.departement else None

    def get_employe_nom(self, obj):
        if obj.employe:
            return obj.employe.get_full_name() or obj.employe.username
        return None
