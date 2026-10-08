import json
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import OffreEmploi, Candidature, Entretien

User = get_user_model()


class UserMinSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "nom_complet", "email"]

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username


class OffreEmploiSerializer(serializers.ModelSerializer):
    nb_candidatures = serializers.IntegerField(read_only=True)
    cree_par_detail = UserMinSerializer(source="cree_par", read_only=True)
    departement_nom = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    type_contrat_display = serializers.CharField(source="get_type_contrat_display", read_only=True)

    class Meta:
        model = OffreEmploi
        fields = "__all__"
        read_only_fields = ["cree_par", "created_at", "updated_at"]

    def get_departement_nom(self, obj):
        return obj.departement.nom if obj.departement else None


class CandidatureSerializer(serializers.ModelSerializer):
    offre_detail         = serializers.SerializerMethodField()
    statut_display       = serializers.CharField(source="get_statut_display", read_only=True)
    analyse_cv_parsed    = serializers.SerializerMethodField()
    nb_entretiens        = serializers.SerializerMethodField()
    checklist_onboarding = serializers.SerializerMethodField()

    class Meta:
        model = Candidature
        fields = "__all__"
        read_only_fields = [
            "date_candidature", "updated_at", "analyse_cv_ia", "score_cv_ia",
            "delai_cnps_respecte",
        ]

    def get_offre_detail(self, obj):
        return {"id": obj.offre_id, "titre": obj.offre.titre}

    def get_analyse_cv_parsed(self, obj):
        if not obj.analyse_cv_ia:
            return None
        try:
            return json.loads(obj.analyse_cv_ia)
        except (json.JSONDecodeError, ValueError):
            return None

    def get_nb_entretiens(self, obj):
        return obj.entretiens.count()

    def get_checklist_onboarding(self, obj):
        if obj.statut != "ACCEPTEE":
            return None
        from datetime import date, timedelta
        today = date.today()

        deadline_cnps = None
        cnps_en_retard = False
        if obj.date_embauche_effective:
            deadline_cnps  = obj.date_embauche_effective + timedelta(days=8)
            cnps_en_retard = today > deadline_cnps and not obj.cnps_declare

        items = [
            {
                "cle":      "cnps",
                "label":    "Déclaration CNPS (délai : 8 jours)",
                "done":     obj.cnps_declare,
                "deadline": deadline_cnps.isoformat() if deadline_cnps else None,
                "en_retard": cnps_en_retard,
                "extra":    {"numero": obj.numero_cnps_attribue, "date_fait": obj.date_declaration_cnps.isoformat() if obj.date_declaration_cnps else None},
            },
            {
                "cle":      "registre",
                "label":    "Inscription au registre du personnel",
                "done":     obj.inscrit_registre_personnel,
                "deadline": None,
                "en_retard": False,
                "extra":    {"numero": obj.numero_registre},
            },
            {
                "cle":      "visite_medicale",
                "label":    "Visite médicale d'embauche",
                "done":     obj.visite_medicale_faite,
                "deadline": None,
                "en_retard": False,
                "extra":    {"aptitude": obj.aptitude_medicale, "date_fait": obj.date_visite_medicale.isoformat() if obj.date_visite_medicale else None},
            },
        ]
        if obj.est_etranger:
            items.append({
                "cle":      "visa_mintss",
                "label":    "Visa MINTSS (travailleur étranger)",
                "done":     obj.visa_mintss_obtenu,
                "deadline": None,
                "en_retard": False,
                "extra":    {},
            })

        nb_done = sum(1 for i in items if i["done"])
        return {
            "items":    items,
            "nb_done":  nb_done,
            "nb_total": len(items),
            "complete": nb_done == len(items),
        }


class EntretienSerializer(serializers.ModelSerializer):
    candidature_detail = serializers.SerializerMethodField()
    intervieweur_detail = UserMinSerializer(source="intervieweur", read_only=True)
    type_display = serializers.CharField(source="get_type_entretien_display", read_only=True)
    resultat_display = serializers.CharField(source="get_resultat_display", read_only=True)

    class Meta:
        model = Entretien
        fields = "__all__"
        read_only_fields = ["created_at"]

    def get_candidature_detail(self, obj):
        return {
            "id": obj.candidature_id,
            "nom_complet": obj.candidature.nom_complet,
            "offre_titre": obj.candidature.offre.titre,
        }
