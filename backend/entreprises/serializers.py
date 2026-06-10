from rest_framework import serializers
from .models import Entreprise


class EntrepriseSerializer(serializers.ModelSerializer):
    abonnement_actif = serializers.ReadOnlyField()
    jours_restants_abonnement = serializers.ReadOnlyField()
    nb_employes_actifs = serializers.SerializerMethodField()

    class Meta:
        model = Entreprise
        fields = "__all__"

    def get_nb_employes_actifs(self, obj):
        return obj.employes.filter(is_active=True).count()


class EntreprisePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Entreprise
        fields = [
            "id", "nom", "slug", "sigle", "logo",
            "couleur_primaire", "couleur_secondaire",
            "ville", "pays", "telephone", "email", "site_web",
        ]
