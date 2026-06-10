from rest_framework import serializers
from .models import TypeConge, DemandeConge, SoldeConge


class TypeCongeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TypeConge
        fields = "__all__"


class DemandeCongeSerializer(serializers.ModelSerializer):
    employe_detail  = serializers.SerializerMethodField()
    type_conge_detail = TypeCongeSerializer(source="type_conge", read_only=True)
    valideur_detail  = serializers.SerializerMethodField()
    statut_display   = serializers.CharField(source="get_statut_display", read_only=True)

    class Meta:
        model  = DemandeConge
        fields = "__all__"
        read_only_fields = ["nb_jours", "statut", "valideur", "commentaire_valideur",
                            "date_validation", "created_at", "updated_at"]

    def get_employe_detail(self, obj):
        from accounts.serializers import UserSerializer
        return UserSerializer(obj.employe).data

    def get_valideur_detail(self, obj):
        if obj.valideur:
            from accounts.serializers import UserSerializer
            return UserSerializer(obj.valideur).data
        return None

    def validate(self, data):
        debut = data.get("date_debut")
        fin   = data.get("date_fin")
        if debut and fin and fin < debut:
            raise serializers.ValidationError("La date de fin doit être >= à la date de début.")
        return data


class SoldeCongeSerializer(serializers.ModelSerializer):
    type_conge_detail = TypeCongeSerializer(source="type_conge", read_only=True)
    solde_restant     = serializers.ReadOnlyField()
    employe_nom       = serializers.SerializerMethodField()

    class Meta:
        model  = SoldeConge
        fields = "__all__"

    def get_employe_nom(self, obj):
        return obj.employe.get_full_name() or obj.employe.username
