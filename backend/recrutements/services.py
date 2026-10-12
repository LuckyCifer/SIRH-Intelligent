"""
Analyse des CV par rapport à une offre d'emploi.

Chaîne : extraction locale du texte du CV → pseudonymisation → analyse par l'IA ;
sans IA (pas d'Internet, quota, clé absente) : correspondance locale des compétences.
Seuls les compétences et l'expérience, sans identité ni coordonnées, sont transmises au
service d'IA (loi n° 2024/017 : transfert hors du Cameroun soumis à autorisation de l'APDP).
"""
import json
import logging
import threading

from ia.client import IAIndisponible, appeler_ia, motif_plan_b, parser_json

from .cv import (
    MESSAGES, OK, correspondance_competences, extraire_texte, pseudonymiser,
    recommandation_sans_ia,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
Tu es un expert RH analysant la correspondance entre un CV et une offre d'emploi au Cameroun.
Le CV a été pseudonymisé : n'essaie pas de deviner l'identité du candidat et ne tiens compte
ni de son âge, ni de son sexe, ni de son origine. Évalue uniquement les compétences,
l'expérience et les formations au regard de l'offre.
Réponds uniquement en JSON valide (sans markdown) :
{
  "score_correspondance": <0-100>,
  "points_forts_cv": ["<point 1>", "<point 2>", "<point 3>"],
  "manques": ["<compétence manquante 1>", "<compétence manquante 2>"],
  "synthese": "<2-3 phrases d'évaluation>",
  "recommandation": "<REJETER|TELEPHONE|ENTRETIEN_RH|PRIORITAIRE>",
  "niveau_estime": "<DEBUTANT|JUNIOR|CONFIRME|SENIOR>"
}
"""


def analyser_cv_async(candidature_id):
    thread = threading.Thread(target=_run_analyse, args=(candidature_id,), daemon=True)
    thread.start()


def construire_prompt(offre, cv_pseudonymise):
    return f"""Offre d'emploi : {offre.titre}
Type de contrat : {offre.type_contrat}
Niveau requis : {offre.niveau_experience}
Description du poste : {offre.description[:800]}
Compétences requises : {offre.competences_requises[:600]}

CV du candidat (pseudonymisé) :
---
{cv_pseudonymise}
---

Analyse la correspondance entre ce CV et cette offre."""


def analyse_sans_ia(correspondance, raison):
    """Plan B : score de correspondance des compétences, explicable et calculé localement."""
    score = correspondance["score"]
    return {
        "source": "calcul sans IA",
        "score_correspondance": score,
        "points_forts_cv": correspondance["trouvees"],
        "manques": correspondance["manquantes"],
        "synthese": (
            f"Analyse IA indisponible ({raison}). Score calculé par correspondance : "
            f"{len(correspondance['trouvees'])} compétence(s) exigée(s) sur {correspondance['total']} "
            f"retrouvée(s) dans le CV. À confirmer par la lecture du CV."
        ) if correspondance["total"] else (
            f"Analyse IA indisponible ({raison}). L'offre ne liste pas de compétences : "
            f"le CV est à évaluer manuellement."
        ),
        "recommandation": recommandation_sans_ia(score),
        "niveau_estime": None,
    }


RECOMMANDATIONS = {"REJETER", "TELEPHONE", "ENTRETIEN_RH", "PRIORITAIRE"}
NIVEAUX = {"DEBUTANT", "JUNIOR", "CONFIRME", "SENIOR"}


def normaliser_reponse(data, correspondance):
    """Tolère les variantes du modèle (clé anglaise, casse, score hors bornes)."""
    if "recommandation" not in data and "recommendation" in data:
        data["recommandation"] = data.pop("recommendation")
    try:
        score = max(0, min(100, round(float(data.get("score_correspondance")))))
    except (TypeError, ValueError):
        score = correspondance["score"]
    data["score_correspondance"] = score
    reco = str(data.get("recommandation") or "").upper().replace(" ", "_")
    data["recommandation"] = reco if reco in RECOMMANDATIONS else recommandation_sans_ia(score)
    niveau = str(data.get("niveau_estime") or "").upper()
    data["niveau_estime"] = niveau if niveau in NIVEAUX else None
    return data


def _enregistrer(candidature_id, data):
    from recrutements.models import Candidature
    Candidature.objects.filter(pk=candidature_id).update(
        analyse_cv_ia=json.dumps(data, ensure_ascii=False),
        score_cv_ia=data.get("score_correspondance"),
    )


def _run_analyse(candidature_id):
    from recrutements.models import Candidature

    try:
        candidature = Candidature.objects.select_related("offre").get(pk=candidature_id)
    except Candidature.DoesNotExist:
        return

    # 1. Extraction locale du texte
    texte, statut = "", "ILLISIBLE"
    if candidature.cv:
        try:
            with candidature.cv.open("rb") as fichier:
                texte, statut = extraire_texte(fichier, candidature.cv.name)
        except (FileNotFoundError, OSError):
            statut = "ILLISIBLE"
    if statut != OK:
        _enregistrer(candidature_id, {
            "source": "cv non lisible",
            "score_correspondance": None,
            "synthese": MESSAGES.get(statut, MESSAGES["ILLISIBLE"]),
            "recommandation": "A_EXAMINER",
            "statut_cv": statut,
        })
        return

    offre = candidature.offre
    correspondance = correspondance_competences(texte, offre.competences_requises)

    # 2. Analyse IA sur le CV pseudonymisé
    try:
        cv_pseudonymise = pseudonymiser(texte, candidature.nom_complet, candidature.email)
        raw = appeler_ia(construire_prompt(offre, cv_pseudonymise), system=SYSTEM_PROMPT, temperature=0.2)
        data = normaliser_reponse(parser_json(raw), correspondance)
        data["source"] = "IA (CV pseudonymisé)"
        data["correspondance_competences"] = correspondance
        _enregistrer(candidature_id, data)
    except (IAIndisponible, ValueError) as exc:
        # 3. Plan B : correspondance locale des compétences
        logger.warning("CV candidature #%d : plan B sans IA (%s)", candidature_id, exc)
        _enregistrer(candidature_id, analyse_sans_ia(correspondance, motif_plan_b(exc)))
    except Exception as exc:
        logger.error("Analyse du CV abandonnée, candidature #%d : %s", candidature_id, exc)
