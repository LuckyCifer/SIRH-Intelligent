from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import StagePeriode, ProjetSoutenance


class StagePeriodeSerializer(serializers.ModelSerializer):
    stagiaire_detail = UserSerializer(source="stagiaire", read_only=True)
    encadreur_detail = UserSerializer(source="encadreur", read_only=True)
    duree_semaines   = serializers.ReadOnlyField()

    class Meta:
        model  = StagePeriode
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class ProjetSoutenanceSerializer(serializers.ModelSerializer):
    stagiaire_detail = UserSerializer(source="stagiaire", read_only=True)

    class Meta:
        model  = ProjetSoutenance
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]
