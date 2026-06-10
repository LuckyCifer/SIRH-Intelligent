import json
import threading
from groq import Groq
from django.conf import settings

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
        client = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=800,
        )

        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        data = json.loads(content)
        Candidature.objects.filter(pk=candidature_id).update(
            analyse_cv_ia=json.dumps(data, ensure_ascii=False),
            score_cv_ia=data.get("score_correspondance"),
        )
    except Exception:
        pass
