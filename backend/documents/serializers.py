from rest_framework import serializers
from .models import CategorieDocument, DocumentRH


class CategorieDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CategorieDocument
        fields = "__all__"


class DocumentRHSerializer(serializers.ModelSerializer):
    employe_detail    = serializers.SerializerMethodField()
    categorie_detail  = CategorieDocumentSerializer(source="categorie", read_only=True)
    uploade_par_detail = serializers.SerializerMethodField()
    taille_lisible    = serializers.ReadOnlyField()
    expire_bientot    = serializers.ReadOnlyField()

    class Meta:
        model  = DocumentRH
        fields = "__all__"
        read_only_fields = [
            "taille_fichier", "type_mime", "uploade_par",
            "created_at", "updated_at",
        ]

    def get_employe_detail(self, obj):
        if obj.employe:
            from accounts.serializers import UserSerializer
            return UserSerializer(obj.employe).data
        return None

    def get_uploade_par_detail(self, obj):
        if obj.uploade_par:
            from accounts.serializers import UserSerializer
            return UserSerializer(obj.uploade_par).data
        return None
