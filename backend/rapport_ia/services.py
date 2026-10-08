"""
Services Rapport IA Mensuel
- collecter_donnees_rh : collecte les métriques de tous les modules RH
- calculer_score_sans_ia : score santé RH sans IA (moyenne pondérée)
- generer_rapport_ia : appel IA (Gemini → Groq) + fallback sans clé
"""
import json
import logging
import threading
from datetime import date
from django.conf import settings
from django.db.models import Sum

from ia.client import appeler_ia, parser_json

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_RH = """
Tu es un expert en ressources humaines senior pour ACERFI SARL,
entreprise de formation numérique au Cameroun.

Tu analyses des données RH mensuelles agrégées et génères un rapport de santé RH complet.

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown.

Structure JSON obligatoire :
{
  "score_sante_rh": <entier 0-100>,
  "resume_executif": "<3 à 5 phrases résumant l'état RH du mois>",
  "indicateurs_cles": {
    "point_fort": "<principal point positif du mois>",
    "point_vigilance": "<principal point d'attention>",
    "tendance": "<HAUSSE|STABLE|BAISSE>"
  },
  "alertes": [
    {"titre": "...", "niveau": "CRITIQUE|IMPORTANT|INFO", "detail": "..."}
  ],
  "recommandations": [
    {"titre": "...", "action": "...", "priorite": "HAUTE|MOYENNE|BASSE"}
  ],
  "contenu_rapport": "<rapport détaillé en markdown, 300 à 500 mots>"
}

Barème score_sante_rh :
85-100 : Excellente santé RH — engagement fort, peu d'absences, objectifs atteints
70-84  : Bonne santé RH — quelques points à améliorer
55-69  : Santé RH correcte — vigilance requise sur certains indicateurs
40-54  : Santé RH fragile — actions correctrices nécessaires
0-39   : Santé RH critique — intervention urgente
"""


def _mois_bornes(mois, annee):
    debut = date(annee, mois, 1)
    if mois == 12:
        fin = date(annee + 1, 1, 1)
    else:
        fin = date(annee, mois + 1, 1)
    return debut, fin


def collecter_donnees_rh(mois, annee, departement=None, employe=None):
    from accounts.models import User

    debut, fin = _mois_bornes(mois, annee)

    employes_qs = User.objects.filter(role="EMPLOYE", is_active=True)
    if departement:
        employes_qs = employes_qs.filter(departement=departement)
    if employe:
        employes_qs = employes_qs.filter(pk=employe.pk)

    nb_employes = employes_qs.count()

    data = {
        "periode": f"{annee}-{str(mois).zfill(2)}",
        "nb_employes": nb_employes,
        "presences": {},
        "conges": {},
        "objectifs": {},
        "formations": {},
        "recrutements": {},
        "paie": {},
        "sanctions": {},
    }

    # 1. Présences
    try:
        from presences.models import Pointage
        pts = Pointage.objects.filter(employe__in=employes_qs, date__gte=debut, date__lt=fin)
        total = pts.count()
        presences = pts.filter(statut__in=["PRESENT", "RETARD"]).count()
        data["presences"] = {
            "total_pointages": total,
            "presences": presences,
            "absences": pts.filter(statut="ABSENT").count(),
            "retards": pts.filter(statut="RETARD").count(),
            "taux_presence": round(presences / max(1, total) * 100, 1),
        }
    except Exception as exc:
        logger.warning("presences data collection failed: %s", exc)

    # 2. Congés
    try:
        from conges.models import DemandeConge
        cq = DemandeConge.objects.filter(employe__in=employes_qs, date_debut__gte=debut, date_debut__lt=fin)
        total_c = cq.count()
        approuves = cq.filter(statut="APPROUVE").count()
        traites = cq.exclude(statut="EN_ATTENTE").count()
        data["conges"] = {
            "total": total_c,
            "en_attente": cq.filter(statut="EN_ATTENTE").count(),
            "approuves": approuves,
            "refuses": cq.filter(statut="REFUSE").count(),
            "jours_pris": cq.filter(statut="APPROUVE").aggregate(s=Sum("nb_jours"))["s"] or 0,
            "taux_approbation": round(approuves / max(1, traites) * 100, 1),
        }
    except Exception as exc:
        logger.warning("conges data collection failed: %s", exc)

    # 3. Objectifs
    try:
        from objectifs.models import Objectif
        oq = Objectif.objects.filter(employe__in=employes_qs)
        total_o = oq.count()
        atteints = oq.filter(statut__in=["ATTEINT", "DEPASSE"]).count()
        data["objectifs"] = {
            "total": total_o,
            "atteints": atteints,
            "en_cours": oq.filter(statut="EN_COURS").count(),
            "non_atteints": oq.filter(statut="NON_ATTEINT").count(),
            "taux_atteinte": round(atteints / max(1, total_o) * 100, 1),
        }
    except Exception as exc:
        logger.warning("objectifs data collection failed: %s", exc)

    # 4. Formations
    try:
        from formations.models import Formation, InscriptionFormation
        fq = Formation.objects.all()
        iq = InscriptionFormation.objects.filter(employe__in=employes_qs)
        presents = iq.filter(statut="PRESENT").count()
        data["formations"] = {
            "total": fq.count(),
            "planifiees": fq.filter(statut="PLANIFIEE").count(),
            "en_cours": fq.filter(statut="EN_COURS").count(),
            "terminees": fq.filter(statut="TERMINEE").count(),
            "inscrits": iq.count(),
            "taux_completion": round(presents / max(1, iq.count()) * 100, 1),
        }
    except Exception as exc:
        logger.warning("formations data collection failed: %s", exc)

    # 5. Recrutements
    try:
        from recrutements.models import OffreEmploi, Candidature
        data["recrutements"] = {
            "postes_ouverts": OffreEmploi.objects.filter(statut="PUBLIEE").count(),
            "total_candidatures": Candidature.objects.count(),
            "en_cours": Candidature.objects.filter(
                statut__in=["RECUE", "EN_COURS", "ENTRETIEN_RH", "ENTRETIEN_TECH"]
            ).count(),
        }
    except Exception as exc:
        logger.warning("recrutements data collection failed: %s", exc)

    # 6. Paie
    try:
        from paie.models import BulletinPaie
        bq = BulletinPaie.objects.filter(employe__in=employes_qs, mois=mois, annee=annee)
        valides = bq.filter(statut__in=["VALIDE", "PAYE"])
        data["paie"] = {
            "total_bulletins": bq.count(),
            "valides": valides.count(),
            "payes": bq.filter(statut="PAYE").count(),
            "masse_brute": float(valides.aggregate(s=Sum("salaire_brut"))["s"] or 0),
            "masse_nette": float(valides.aggregate(s=Sum("salaire_net"))["s"] or 0),
        }
    except Exception as exc:
        logger.warning("paie data collection failed: %s", exc)

    # 7. Sanctions
    try:
        from sanctions.models import Sanction
        from django.utils import timezone
        import datetime as dt
        tz = timezone.get_current_timezone()
        mois_debut = timezone.make_aware(dt.datetime(annee, mois, 1), tz)
        mois_fin_val = fin
        mois_fin_dt = timezone.make_aware(dt.datetime(mois_fin_val.year, mois_fin_val.month, 1), tz)
        sq = Sanction.objects.filter(employe__in=employes_qs)
        data["sanctions"] = {
            "total": sq.count(),
            "ce_mois": sq.filter(created_at__gte=mois_debut, created_at__lt=mois_fin_dt).count(),
            "en_cours": sq.filter(statut__in=["NOTIFIEE", "ACCEPTEE", "CONTESTEE"]).count(),
        }
    except Exception as exc:
        logger.warning("sanctions data collection failed: %s", exc)

    return data


def calculer_score_sans_ia(donnees):
    composantes = []

    pres = donnees.get("presences", {})
    if pres.get("total_pointages", 0) > 0:
        composantes.append((pres["taux_presence"], 30))

    conges = donnees.get("conges", {})
    if conges.get("total", 0) > 0:
        composantes.append((conges.get("taux_approbation", 80), 20))

    obj = donnees.get("objectifs", {})
    if obj.get("total", 0) > 0:
        composantes.append((obj["taux_atteinte"], 25))

    form = donnees.get("formations", {})
    if form.get("inscrits", 0) > 0:
        composantes.append((form["taux_completion"], 15))

    nb = max(1, donnees.get("nb_employes", 1))
    sanc_mois = donnees.get("sanctions", {}).get("ce_mois", 0)
    taux_sanc = min(100, sanc_mois / nb * 100)
    composantes.append((100 - taux_sanc, 10))

    if not composantes:
        return 70.0

    total_poids = sum(p for _, p in composantes)
    score = sum(v * p for v, p in composantes) / total_poids
    return round(score, 1)


def generer_rapport_ia(rapport_id: int) -> None:
    from .models import RapportIAMensuel

    try:
        rapport = RapportIAMensuel.objects.get(pk=rapport_id)
    except RapportIAMensuel.DoesNotExist:
        logger.error("RapportIAMensuel #%d introuvable", rapport_id)
        return

    try:
        donnees = collecter_donnees_rh(
            mois=rapport.mois,
            annee=rapport.annee,
            departement=rapport.departement,
            employe=rapport.employe,
        )
        rapport.donnees_collectees = donnees

        gemini_key     = getattr(settings, "GEMINI_API_KEY", "")
        openrouter_key = getattr(settings, "OPENROUTER_API_KEY", "")
        aucune_cle     = not gemini_key and not openrouter_key

        if aucune_cle:
            logger.warning("Aucune clé IA configurée — rapport sans IA")
            score = calculer_score_sans_ia(donnees)
            rapport.score_sante_rh   = score
            rapport.resume_executif  = "Rapport généré sans IA (aucune clé configurée)"
            rapport.recommandations  = []
            rapport.alertes_ia       = []
            rapport.indicateurs_cles = {
                "point_fort":      "Données collectées avec succès",
                "point_vigilance": "Analyse IA non disponible",
                "tendance":        "STABLE",
            }
            rapport.contenu_rapport = (
                f"# Rapport RH — {donnees['periode']}\n\n"
                f"**Score santé RH : {score}/100**\n\n"
                "Ce rapport a été généré sans analyse IA (aucune clé configurée). "
                "Les données brutes sont disponibles ci-dessous.\n\n"
                f"```json\n{json.dumps(donnees, ensure_ascii=False, indent=2)}\n```"
            )
        else:
            prompt = (
                f"Données RH du mois {donnees['periode']} :\n\n"
                + json.dumps(donnees, ensure_ascii=False, indent=2)
            )
            raw = appeler_ia(prompt, system=SYSTEM_PROMPT_RH, temperature=0.3)
            ia_result = parser_json(raw)

            rapport.score_sante_rh   = float(ia_result.get("score_sante_rh", calculer_score_sans_ia(donnees)))
            rapport.resume_executif  = ia_result.get("resume_executif", "")
            rapport.indicateurs_cles = ia_result.get("indicateurs_cles", {})
            rapport.alertes_ia       = ia_result.get("alertes", [])
            rapport.recommandations  = ia_result.get("recommandations", [])
            rapport.contenu_rapport  = ia_result.get("contenu_rapport", "")

        rapport.statut = RapportIAMensuel.Statut.GENERE
        rapport.message_erreur = ""
        rapport.save()
        logger.info("Rapport IA #%d généré — score %.1f", rapport_id, rapport.score_sante_rh)

    except Exception as exc:
        logger.error("Génération rapport IA #%d échouée : %s", rapport_id, exc)
        try:
            rapport.statut = RapportIAMensuel.Statut.ERREUR
            rapport.message_erreur = str(exc)
            rapport.save(update_fields=["statut", "message_erreur", "updated_at"])
        except Exception:
            pass


def lancer_generation_async(rapport_id: int) -> None:
    t = threading.Thread(target=generer_rapport_ia, args=(rapport_id,), daemon=True)
    t.start()
