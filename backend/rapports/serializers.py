from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import RapportHebdomadaire


class RapportHebdomadaireSerializer(serializers.ModelSerializer):
    stagiaire_detail = UserSerializer(source="stagiaire", read_only=True)
    analyse          = serializers.SerializerMethodField()

    class Meta:
        model  = RapportHebdomadaire
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "date_soumission", "date_validation"]

    def get_analyse(self, obj):
        # Import ici pour éviter les imports circulaires
        from analyse_ia.serializers import AnalyseIASerializer
        if hasattr(obj, "analyse_ia"):
            return AnalyseIASerializer(obj.analyse_ia).data
        return None
