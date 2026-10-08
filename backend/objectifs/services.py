import logging
import threading
from ia.client import appeler_ia, parser_json

logger = logging.getLogger(__name__)


def _construire_prompt(evaluation):
    employe = evaluation.employe
    periode = evaluation.periode

    notes = {
        "Compétences techniques":      evaluation.note_competences,
        "Atteinte des objectifs":      evaluation.note_objectifs,
        "Comportement professionnel":  evaluation.note_comportement,
        "Initiative & proactivité":    evaluation.note_initiative,
        "Travail en équipe":           evaluation.note_travail_equipe,
        "Communication":               evaluation.note_communication,
    }
    notes_str = "\n".join(
        f"- {label}: {note}/5" for label, note in notes.items() if note is not None
    )

    return f"""Tu es un expert RH. Analyse cette évaluation de performance et fournis une analyse JSON structurée.

Employé: {employe.get_full_name()}
Poste: {getattr(employe, 'poste', 'Non renseigné')}
Période: {periode.nom}

Notes (sur 5):
{notes_str}

Note globale: {evaluation.note_globale}/5

Points forts (déclarés): {evaluation.points_forts or 'Non renseigné'}
Axes d'amélioration (déclarés): {evaluation.axes_amelioration or 'Non renseigné'}
Objectifs période suivante: {evaluation.objectifs_periode_suiv or 'Non renseigné'}

Réponds UNIQUEMENT avec un JSON valide (sans markdown) ayant exactement ces clés:
{{
  "score_global_100": <entier 0-100>,
  "niveau_performance": "<Insuffisant|En développement|Satisfaisant|Très bien|Excellent>",
  "synthese": "<2-3 phrases résumant la performance>",
  "points_forts": ["<point 1>", "<point 2>", "<point 3>"],
  "axes_developpement": ["<axe 1>", "<axe 2>"],
  "recommandation_rh": "<action RH concrète recommandée>",
  "risque_depart": "<Faible|Modéré|Élevé>",
  "potentiel_evolution": "<Faible|Moyen|Élevé|Très élevé>"
}}"""


def analyser_evaluation_async(evaluation_id):
    thread = threading.Thread(target=_run_analyse, args=(evaluation_id,), daemon=True)
    thread.start()


def _run_analyse(evaluation_id):
    from objectifs.models import EvaluationPerformance

    try:
        evaluation = EvaluationPerformance.objects.get(pk=evaluation_id)
    except EvaluationPerformance.DoesNotExist:
        return

    try:
        prompt = _construire_prompt(evaluation)
        raw    = appeler_ia(prompt, temperature=0.3)
        data   = parser_json(raw)

        EvaluationPerformance.objects.filter(pk=evaluation_id).update(
            analyse_ia=data,
            score_ia=data.get("score_global_100"),
        )
        logger.info(
            "Analyse IA évaluation #%d — score %s/100",
            evaluation_id, data.get("score_global_100"),
        )
    except Exception as exc:
        logger.error("Analyse IA abandonnée évaluation #%d : %s", evaluation_id, exc)
