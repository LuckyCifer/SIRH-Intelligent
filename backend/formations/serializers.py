from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CategorieFormation, Formation, InscriptionFormation, CompetenceAcquise

User = get_user_model()


class UserMinSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "nom_complet", "email"]

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username


class CategorieFormationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategorieFormation
        fields = "__all__"


class FormationSerializer(serializers.ModelSerializer):
    nb_inscrits       = serializers.IntegerField(read_only=True)
    places_restantes  = serializers.IntegerField(read_only=True)
    categorie_detail  = CategorieFormationSerializer(source="categorie", read_only=True)
    cree_par_detail   = UserMinSerializer(source="cree_par", read_only=True)
    statut_display    = serializers.CharField(source="get_statut_display", read_only=True)
    modalite_display  = serializers.CharField(source="get_modalite_display", read_only=True)
    niveau_display    = serializers.CharField(source="get_niveau_display", read_only=True)

    class Meta:
        model = Formation
        fields = "__all__"
        read_only_fields = ["cree_par", "created_at", "updated_at"]


class InscriptionFormationSerializer(serializers.ModelSerializer):
    employe_detail    = UserMinSerializer(source="employe", read_only=True)
    formation_detail  = serializers.SerializerMethodField()
    valide_par_detail = UserMinSerializer(source="valide_par", read_only=True)
    statut_display    = serializers.CharField(source="get_statut_display", read_only=True)

    class Meta:
        model = InscriptionFormation
        fields = "__all__"
        read_only_fields = ["date_inscription", "created_at"]

    def get_formation_detail(self, obj):
        return {
            "id": obj.formation_id,
            "titre": obj.formation.titre,
            "date_debut": obj.formation.date_debut,
            "date_fin": obj.formation.date_fin,
            "modalite": obj.formation.modalite,
            "statut": obj.formation.statut,
            "categorie_detail": {
                "nom": obj.formation.categorie.nom if obj.formation.categorie else None,
                "icone": obj.formation.categorie.icone if obj.formation.categorie else None,
                "couleur": obj.formation.categorie.couleur if obj.formation.categorie else None,
            },
        }


class CompetenceAcquiseSerializer(serializers.ModelSerializer):
    employe_detail = UserMinSerializer(source="employe", read_only=True)

    class Meta:
        model = CompetenceAcquise
        fields = "__all__"
        read_only_fields = ["date_acquisition"]
