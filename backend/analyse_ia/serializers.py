from rest_framework import serializers
from .models import AnalyseIA


class AnalyseIASerializer(serializers.ModelSerializer):
    progression_estimee_display = serializers.SerializerMethodField()

    class Meta:
        model  = AnalyseIA
        fields = "__all__"
        read_only_fields = ["date_analyse"]

    def get_progression_estimee_display(self, obj):
        return dict(obj._meta.get_field("progression_estimee").choices).get(
            obj.progression_estimee, obj.progression_estimee
        )
