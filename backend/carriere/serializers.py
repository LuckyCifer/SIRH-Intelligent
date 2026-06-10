from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import EvenementCarriere

User = get_user_model()


class UserMinSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "nom_complet", "email"]

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username


class DepartementMinSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nom = serializers.CharField()
    code = serializers.CharField()


class PosteMinSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    titre = serializers.CharField()


class EvenementCarriereSerializer(serializers.ModelSerializer):
    employe_detail = UserMinSerializer(source="employe", read_only=True)
    enregistre_par_detail = UserMinSerializer(source="enregistre_par", read_only=True)
    departement_avant_detail = DepartementMinSerializer(source="departement_avant", read_only=True)
    departement_apres_detail = DepartementMinSerializer(source="departement_apres", read_only=True)
    poste_avant_detail = PosteMinSerializer(source="poste_avant", read_only=True)
    poste_apres_detail = PosteMinSerializer(source="poste_apres", read_only=True)
    type_display = serializers.CharField(source="get_type_evenement_display", read_only=True)
    augmentation_pct = serializers.SerializerMethodField()

    class Meta:
        model = EvenementCarriere
        fields = "__all__"
        read_only_fields = ["enregistre_par", "created_at"]

    def get_augmentation_pct(self, obj):
        if obj.salaire_avant and obj.salaire_apres and obj.salaire_avant > 0:
            delta = float(obj.salaire_apres) - float(obj.salaire_avant)
            return round(delta / float(obj.salaire_avant) * 100, 1)
        return None
