from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Sanction

User = get_user_model()


class UserMinSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ["id", "nom_complet", "email"]

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username


class SanctionSerializer(serializers.ModelSerializer):
    employe_detail        = UserMinSerializer(source="employe", read_only=True)
    prononcee_par_detail  = UserMinSerializer(source="prononcee_par", read_only=True)
    type_sanction_display = serializers.CharField(source="get_type_sanction_display", read_only=True)
    statut_display        = serializers.CharField(source="get_statut_display", read_only=True)
    gravite               = serializers.IntegerField(read_only=True)
    duree_jours           = serializers.SerializerMethodField()
    statut_legal          = serializers.SerializerMethodField()

    class Meta:
        model  = Sanction
        fields = "__all__"
        read_only_fields = [
            "prononcee_par", "delai_48h_respecte",
            "created_at", "updated_at",
        ]

    def get_duree_jours(self, obj):
        if obj.date_debut_effet and obj.date_fin_effet:
            return (obj.date_fin_effet - obj.date_debut_effet).days
        return None

    def get_statut_legal(self, obj):
        if obj.type_sanction != "MISE_A_PIED":
            return {"valide": True}

        avertissements = []
        duree_ok  = obj.duree_mise_a_pied_jours is not None and obj.duree_mise_a_pied_jours <= 8
        it_notifie = obj.notifie_it
        delai_ok   = obj.delai_48h_respecte

        if not duree_ok:
            avertissements.append("Durée non renseignée ou supérieure à 8 jours ouvrables (Art. 30).")
        if not it_notifie:
            avertissements.append(
                "L'Inspecteur du Travail n'a pas encore été notifié dans les 48h (Art. 30 al.3c)."
            )
        elif not delai_ok:
            avertissements.append("Notification IT hors délai (plus de 48h après la sanction).")

        return {
            "valide":          duree_ok and it_notifie and delai_ok,
            "duree_ok":        duree_ok,
            "it_notifie":      it_notifie,
            "delai_it_ok":     delai_ok,
            "avertissements":  avertissements,
        }
