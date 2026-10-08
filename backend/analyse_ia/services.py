"""
Service d'analyse IA — stagiaires ACERFI
Utilise ia.client (Gemini principal, Groq fallback).
"""
import logging
from django.conf import settings
from ia.client import appeler_ia_complet, parser_json

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


def analyser_rapport(rapport) -> None:
    """
    Analyse un rapport hebdomadaire via l'agent IA (Gemini ou Groq).
    Ne bloque jamais la soumission en cas d'échec.
    """
    from .models import AnalyseIA

    gemini_key     = getattr(settings, "GEMINI_API_KEY", "")
    openrouter_key = getattr(settings, "OPENROUTER_API_KEY", "")
    if not gemini_key and not openrouter_key:
        logger.warning("Aucune clé IA configurée — analyse ignorée.")
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

    try:
        raw, modele = appeler_ia_complet(f"Analyse ce rapport :\n\n{contenu}", system=SYSTEM_PROMPT, temperature=0.3)
        data = parser_json(raw)
        AnalyseIA.objects.update_or_create(
            rapport=rapport,
            defaults={
                "score_engagement":      int(data.get("score_engagement", 50)),
                "points_forts":          data.get("points_forts", []),
                "points_amelioration":   data.get("points_amelioration", []),
                "synthese":              data.get("synthese", ""),
                "recommandation":        data.get("recommandation", ""),
                "niveau_alerte":         data.get("niveau_alerte", "AUCUNE"),
                "motif_alerte":          data.get("motif_alerte", ""),
                "competences_detectees": data.get("competences_detectees", []),
                "progression_estimee":   data.get("progression_estimee", "MOYENNE"),
                "modele_utilise":        modele,
                "tokens_utilises":       0,
            },
        )
        logger.info(
            "Analyse IA rapport #%d — score %s/100",
            rapport.pk, data.get("score_engagement"),
        )
    except Exception as exc:
        logger.error("Analyse IA abandonnée rapport #%d : %s", rapport.pk, exc)
