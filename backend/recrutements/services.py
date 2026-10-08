import json
import threading
from django.conf import settings
from ia.client import appeler_ia, parser_json

SYSTEM_PROMPT = """
Tu es un expert RH analysant la correspondance entre un CV et une offre d'emploi.
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


def _run_analyse(candidature_id):
    from recrutements.models import Candidature

    try:
        candidature = Candidature.objects.select_related("offre").get(pk=candidature_id)
    except Candidature.DoesNotExist:
        return

    offre = candidature.offre
    prompt = f"""Offre d'emploi : {offre.titre}
Type de contrat : {offre.type_contrat}
Niveau requis : {offre.niveau_experience}
Description du poste : {offre.description[:500]}
Compétences requises : {offre.competences_requises[:400]}

Candidat : {candidature.nom_complet}
Source : {candidature.source or 'Non précisée'}

Analyse la correspondance entre ce profil et cette offre."""

    try:
        raw  = appeler_ia(prompt, system=SYSTEM_PROMPT, temperature=0.2)
        data = parser_json(raw)
        Candidature.objects.filter(pk=candidature_id).update(
            analyse_cv_ia=json.dumps(data, ensure_ascii=False),
            score_cv_ia=data.get("score_correspondance"),
        )
    except Exception:
        pass
