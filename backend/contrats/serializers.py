from rest_framework import serializers
from .models import Contrat


class ContratSerializer(serializers.ModelSerializer):
    employe_nom          = serializers.SerializerMethodField()
    type_contrat_display = serializers.CharField(source="get_type_contrat_display", read_only=True)
    statut_display       = serializers.CharField(source="get_statut_display",       read_only=True)
    categorie_pro_display = serializers.CharField(source="get_categorie_pro_display", read_only=True)
    jours_restants       = serializers.ReadOnlyField()
    expire_bientot       = serializers.ReadOnlyField()
    en_periode_essai     = serializers.ReadOnlyField()
    jours_essai_restants = serializers.ReadOnlyField()
    poste_titre          = serializers.CharField(source="poste.titre",           read_only=True)
    departement_nom      = serializers.CharField(source="poste.departement.nom", read_only=True)
    avertissements_legaux = serializers.SerializerMethodField()

    class Meta:
        model  = Contrat
        fields = "__all__"
        read_only_fields = [
            "date_fin_essai", "duree_totale_cdd_mois", "duree_preavis_jours",
            "created_at", "updated_at",
        ]

    def get_employe_nom(self, obj):
        return obj.employe.get_full_name() or obj.employe.username

    def get_avertissements_legaux(self, obj):
        alertes = []
        if obj.type_contrat == "CDD":
            if obj.renouvellement_numero == 1:
                alertes.append("Dernier renouvellement légal autorisé (Art. 25 — max 1 renouvellement).")
            if obj.renouvellement_numero > 1:
                alertes.append("Renouvellement illégal : maximum 1 autorisé (Art. 25).")
            if obj.duree_totale_cdd_mois > 24:
                alertes.append(
                    f"Durée totale {obj.duree_totale_cdd_mois} mois > 24 mois maximum légal (Art. 25)."
                )
        if obj.clause_non_concurrence:
            if obj.rayon_non_concurrence_km > 50:
                alertes.append(
                    f"Rayon non-concurrence {obj.rayon_non_concurrence_km} km > 50 km max (Art. 36)."
                )
            if obj.duree_non_concurrence_mois > 12:
                alertes.append(
                    f"Durée non-concurrence {obj.duree_non_concurrence_mois} mois > 12 mois max (Art. 36)."
                )
        if obj.periode_essai_mois and obj.categorie_pro:
            max_essai = Contrat.MAX_ESSAI_PAR_CATEGORIE.get(obj.categorie_pro, 6)
            if obj.periode_essai_mois > max_essai:
                alertes.append(
                    f"Période d'essai {obj.periode_essai_mois} mois > {max_essai} mois max pour "
                    f"cette catégorie (Art. 27)."
                )
        return alertes
