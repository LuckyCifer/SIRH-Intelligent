from rest_framework import serializers
from .models import PeriodeEvaluation, Objectif, EvaluationPerformance
from django.contrib.auth import get_user_model

User = get_user_model()


class UtilisateurMinimalSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "nom_complet", "email"]

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username


class PeriodeEvaluationSerializer(serializers.ModelSerializer):
    nb_objectifs = serializers.SerializerMethodField()
    nb_evaluations = serializers.SerializerMethodField()

    class Meta:
        model = PeriodeEvaluation
        fields = "__all__"

    def get_nb_objectifs(self, obj):
        return obj.objectifs.count()

    def get_nb_evaluations(self, obj):
        return obj.evaluations.count()


class ObjectifSerializer(serializers.ModelSerializer):
    employe_detail = UtilisateurMinimalSerializer(source="employe", read_only=True)
    assigne_par_detail = UtilisateurMinimalSerializer(source="assigne_par", read_only=True)
    periode_detail = PeriodeEvaluationSerializer(source="periode", read_only=True)
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    priorite_display = serializers.CharField(source="get_priorite_display", read_only=True)

    class Meta:
        model = Objectif
        fields = "__all__"
        read_only_fields = ["employe", "assigne_par", "created_at", "updated_at"]


class EvaluationPerformanceSerializer(serializers.ModelSerializer):
    employe_detail = UtilisateurMinimalSerializer(source="employe", read_only=True)
    evaluateur_detail = UtilisateurMinimalSerializer(source="evaluateur", read_only=True)
    periode_detail = PeriodeEvaluationSerializer(source="periode", read_only=True)
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)

    class Meta:
        model = EvaluationPerformance
        fields = "__all__"
        read_only_fields = [
            "employe", "evaluateur", "note_globale",
            "analyse_ia", "score_ia", "created_at", "updated_at",
        ]
