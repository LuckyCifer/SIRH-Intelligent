from rest_framework import serializers
from .models import Contrat


class ContratSerializer(serializers.ModelSerializer):
    employe_nom       = serializers.SerializerMethodField()
    type_contrat_display = serializers.CharField(source="get_type_contrat_display", read_only=True)
    statut_display    = serializers.CharField(source="get_statut_display",    read_only=True)
    jours_restants    = serializers.ReadOnlyField()
    expire_bientot    = serializers.ReadOnlyField()
    poste_titre       = serializers.CharField(source="poste.titre",           read_only=True)
    departement_nom   = serializers.CharField(source="poste.departement.nom", read_only=True)

    class Meta:
        model  = Contrat
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def get_employe_nom(self, obj):
        return obj.employe.get_full_name() or obj.employe.username
