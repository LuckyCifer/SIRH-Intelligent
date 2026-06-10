from rest_framework import serializers
from .models import Departement, Poste


class PosteSerializer(serializers.ModelSerializer):
    departement_nom  = serializers.CharField(source="departement.nom",  read_only=True)
    departement_code = serializers.CharField(source="departement.code", read_only=True)
    niveau_display   = serializers.CharField(source="get_niveau_display", read_only=True)

    class Meta:
        model  = Poste
        fields = "__all__"
        read_only_fields = ["created_at"]


class DepartementSerializer(serializers.ModelSerializer):
    responsable_nom = serializers.SerializerMethodField()
    nb_employes     = serializers.SerializerMethodField()
    postes          = PosteSerializer(many=True, read_only=True)

    class Meta:
        model  = Departement
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def get_responsable_nom(self, obj):
        if obj.responsable:
            return obj.responsable.get_full_name() or obj.responsable.username
        return None

    def get_nb_employes(self, obj):
        return obj.employes.count()


class DepartementListSerializer(serializers.ModelSerializer):
    """Version légère pour les listes."""
    responsable_nom = serializers.SerializerMethodField()
    nb_employes     = serializers.SerializerMethodField()

    class Meta:
        model  = Departement
        fields = ["id", "nom", "code", "description", "couleur", "icone",
                  "actif", "responsable", "responsable_nom", "nb_employes"]

    def get_responsable_nom(self, obj):
        if obj.responsable:
            return obj.responsable.get_full_name() or obj.responsable.username
        return None

    def get_nb_employes(self, obj):
        return obj.employes.count()
