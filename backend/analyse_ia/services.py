"""
Service d'analyse IA — Groq / Llama 3.3-70b-versatile
Appele automatiquement a la soumission d'un rapport.
"""
import json
import logging
import time
from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
Tu es un expert en pédagogie et en suivi de stagiaires pour ACERFI,
institution de formation numérique au Cameroun avec 30 ans d'expérience.

Tu analyses des rapports hebdomadaires de stagiaires issus de 8 filières :
- Bureautique & Productivité
- Marketing Digital
- Développement Web & App
- Cybersécurité
- Gestion de Projet
- Infrastructures & Réseaux
- Intelligence Artificielle
- Cloud Computing

Adapte ton analyse au contexte de la filière du stagiaire.
Par exemple, pour un stagiaire IA : évalue la rigueur technique,
la compréhension des modèles, la qualité des expérimentations.
Pour un stagiaire Marketing : évalue la créativité, la stratégie,
la maîtrise des outils digitaux.

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après,
sans balises markdown, sans commentaires.

Structure JSON obligatoire :
{
  "score_engagement": <entier 0-100>,
  "points_forts": [<2 à 4 phrases courtes en français>],
  "points_amelioration": [<1 à 3 phrases courtes en français>],
  "synthese": "<paragraphe de 2-3 phrases résumant objectivement le rapport>",
  "recommandation": "<conseil actionnable pour l'encadreur, 2-3 phrases>",
  "niveau_alerte": "<AUCUNE|FAIBLE|MOYENNE|ELEVEE>",
  "motif_alerte": "<vide si AUCUNE, sinon explication en 1-2 phrases>",
  "competences_detectees": [<liste de 2-4 compétences techniques ou soft skills détectées>],
  "progression_estimee": "<FAIBLE|MOYENNE|BONNE|EXCELLENTE>"
}

Barème score_engagement :
80-100 : Rapport riche, activités concrètes, progression claire
60-79  : Bon travail, quelques points à développer
40-59  : Rapport acceptable mais insuffisamment détaillé
0-39   : Rapport très insuffisant ou vide

Niveaux d'alerte :
ELEVEE  : Rapport < 50 mots, aucune activité, détresse signalée
MOYENNE : Peu d'activités, difficultés répétées sans tentative de résolution
FAIBLE  : Rapport léger, objectifs vagues ou absents
AUCUNE  : Rapport satisfaisant au regard du niveau attendu
"""


def _parse_groq_response(raw: str) -> dict:
    """Nettoie et parse la réponse JSON de Groq."""
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def analyser_rapport(rapport) -> None:
    """
    Analyse un rapport hebdomadaire via l'API Groq et enregistre le résultat.
    Retry automatique jusqu'à 3 tentatives (délais : 0s, 2s, 5s).
    Ne bloque jamais la soumission en cas d'échec.
    """
    from .models import AnalyseIA

    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY non configurée — analyse IA ignorée.")
        return

    contenu = f"""
RAPPORT HEBDOMADAIRE — Semaine {rapport.semaine_numero}
Stagiaire : {rapport.stagiaire.get_full_name()} (Filière : {rapport.stagiaire.filiere})
Période   : {rapport.date_debut_semaine} → {rapport.date_fin_semaine}

--- ACTIVITÉS RÉALISÉES ---
{rapport.activites_realisees}

--- PROJETS EN COURS ---
{rapport.projets_en_cours or "Non renseigné"}

--- DIFFICULTÉS RENCONTRÉES ---
{rapport.difficultes or "Aucune difficulté signalée"}

--- OBJECTIFS SEMAINE SUIVANTE ---
{rapport.objectifs_semaine_suiv or "Non renseigné"}
    """.strip()

    delays = [0, 2, 5]
    last_error = None

    for attempt, delay in enumerate(delays, start=1):
        if delay:
            time.sleep(delay)
        try:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            completion = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": f"Analyse ce rapport :\n\n{contenu}"},
                ],
                temperature=0.3,
                max_tokens=900,
            )

            raw  = completion.choices[0].message.content.strip()
            data = _parse_groq_response(raw)

            AnalyseIA.objects.update_or_create(
                rapport=rapport,
                defaults={
                    "score_engagement":     int(data.get("score_engagement", 50)),
                    "points_forts":         data.get("points_forts", []),
                    "points_amelioration":  data.get("points_amelioration", []),
                    "synthese":             data.get("synthese", ""),
                    "recommandation":       data.get("recommandation", ""),
                    "niveau_alerte":        data.get("niveau_alerte", "AUCUNE"),
                    "motif_alerte":         data.get("motif_alerte", ""),
                    "competences_detectees": data.get("competences_detectees", []),
                    "progression_estimee":  data.get("progression_estimee", "MOYENNE"),
                    "modele_utilise":       settings.GROQ_MODEL,
                    "tokens_utilises":      completion.usage.total_tokens if completion.usage else 0,
                },
            )
            logger.info(
                f"Analyse IA créée rapport #{rapport.pk} — "
                f"score {data.get('score_engagement')}/100 "
                f"(tentative {attempt})"
            )
            return

        except json.JSONDecodeError as e:
            last_error = e
            logger.warning(f"Parsing JSON Groq rapport #{rapport.pk} tentative {attempt}: {e}")
        except Exception as e:
            last_error = e
            logger.warning(f"Erreur Groq rapport #{rapport.pk} tentative {attempt}: {e}")

    logger.error(
        f"Analyse IA abandonnée rapport #{rapport.pk} après {len(delays)} tentatives. "
        f"Dernière erreur : {last_error}"
    )
