import json
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import OffreEmploi, Candidature, Entretien

User = get_user_model()


class UserMinSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "nom_complet", "email"]

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username


class OffreEmploiSerializer(serializers.ModelSerializer):
    nb_candidatures = serializers.IntegerField(read_only=True)
    cree_par_detail = UserMinSerializer(source="cree_par", read_only=True)
    departement_nom = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    type_contrat_display = serializers.CharField(source="get_type_contrat_display", read_only=True)

    class Meta:
        model = OffreEmploi
        fields = "__all__"
        read_only_fields = ["cree_par", "created_at", "updated_at"]

    def get_departement_nom(self, obj):
        return obj.departement.nom if obj.departement else None


class CandidatureSerializer(serializers.ModelSerializer):
    offre_detail = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    analyse_cv_parsed = serializers.SerializerMethodField()
    nb_entretiens = serializers.SerializerMethodField()

    class Meta:
        model = Candidature
        fields = "__all__"
        read_only_fields = ["date_candidature", "updated_at", "analyse_cv_ia", "score_cv_ia"]

    def get_offre_detail(self, obj):
        return {"id": obj.offre_id, "titre": obj.offre.titre}

    def get_analyse_cv_parsed(self, obj):
        if not obj.analyse_cv_ia:
            return None
        try:
            return json.loads(obj.analyse_cv_ia)
        except (json.JSONDecodeError, ValueError):
            return None

    def get_nb_entretiens(self, obj):
        return obj.entretiens.count()


class EntretienSerializer(serializers.ModelSerializer):
    candidature_detail = serializers.SerializerMethodField()
    intervieweur_detail = UserMinSerializer(source="intervieweur", read_only=True)
    type_display = serializers.CharField(source="get_type_entretien_display", read_only=True)
    resultat_display = serializers.CharField(source="get_resultat_display", read_only=True)

    class Meta:
        model = Entretien
        fields = "__all__"
        read_only_fields = ["created_at"]

    def get_candidature_detail(self, obj):
        return {
            "id": obj.candidature_id,
            "nom_complet": obj.candidature.nom_complet,
            "offre_titre": obj.candidature.offre.titre,
        }
