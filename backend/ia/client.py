"""
Client IA centralisé — Gemini (principal, SDK officiel google-genai) + OpenRouter (secours)

Usage :
    from ia.client import appeler_ia, parser_json, IAIndisponible

    raw  = appeler_ia(prompt, system=SYSTEM_PROMPT, temperature=0.3)
    data = parser_json(raw)

Plan B : si aucun fournisseur ne répond (pas de réseau, quotas épuisés, clés absentes),
appeler_ia lève IAIndisponible ; chaque module produit alors un résultat calculé
sans IA, marqué comme tel, au lieu d'échouer. Sans réseau, l'échec est immédiat
(pas de cascade de tentatives inutiles).
"""
import json
import logging
import time

from django.conf import settings

logger = logging.getLogger(__name__)

DELAI_REPONSE_S = 60   # délai maximal d'une réponse de fournisseur


class IAIndisponible(RuntimeError):
    """Aucun fournisseur d'IA n'a répondu : utiliser le calcul sans IA."""


def motif_plan_b(exc) -> str:
    """Phrase destinée à l'utilisateur expliquant pourquoi l'IA n'a pas été utilisée."""
    texte = str(exc).lower()
    if "aucune clé" in texte:
        return "aucune clé d'API d'IA n'est configurée"
    if "pas de connexion" in texte:
        return "pas de connexion Internet vers le service d'IA"
    if isinstance(exc, ValueError):
        return "la réponse du service d'IA était inexploitable"
    return "le service d'IA n'a pas répondu (surcharge ou quota épuisé)"


def _erreur_reseau(exc) -> bool:
    """Absence de réseau / DNS / connexion refusée : inutile d'essayer d'autres modèles."""
    texte = f"{type(exc).__name__} {exc}".lower()
    return any(m in texte for m in (
        "connecterror", "apiconnectionerror", "connectionerror", "connecttimeout",
        "getaddrinfo", "name or service not known", "nodename nor servname",
        "failed to establish", "network is unreachable", "temporary failure in name resolution",
        "no address associated", "connection refused",
    ))


def parser_json(raw: str) -> dict:
    """Nettoie un bloc markdown optionnel et parse le JSON."""
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    # Ignore un éventuel texte avant/après l'objet JSON
    debut, fin = raw.find("{"), raw.rfind("}")
    if debut != -1 and fin > debut:
        raw = raw[debut:fin + 1]
    return json.loads(raw)


# ─── Fournisseurs ────────────────────────────────────────────

def _appeler_gemini(prompt: str, system: str | None, temperature: float) -> str:
    # SDK officiel google-genai (remplace google.generativeai, abandonné par Google)
    from google import genai
    from google.genai import types

    client = genai.Client(
        api_key=settings.GEMINI_API_KEY,
        http_options=types.HttpOptions(timeout=DELAI_REPONSE_S * 1000),   # millisecondes
    )
    model_name = getattr(settings, "GEMINI_MODEL", "gemini-flash-latest")
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system or None,
            temperature=temperature,
            # Les modèles Gemini récents consomment aussi ce budget pour leur raisonnement
            max_output_tokens=8192,
        ),
    )
    if not response.text:
        raise RuntimeError(f"Réponse vide du modèle {model_name}")
    return response.text


def _appeler_openrouter_model(prompt: str, system: str | None, temperature: float, model: str) -> str:
    from openai import OpenAI

    client = OpenAI(
        api_key=settings.OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1",
        timeout=DELAI_REPONSE_S,   # 600 s par défaut dans le SDK
        max_retries=0,             # les nouvelles tentatives sont gérées ci-dessous
    )

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    completion = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=4096,
    )
    choice = completion.choices[0]
    content = choice.message.content
    if not content:
        raise RuntimeError(f"Réponse vide du modèle {model}")
    if choice.finish_reason == "length":
        raise RuntimeError(f"Réponse tronquée du modèle {model} (limite de tokens atteinte)")
    return content.strip()


def _appeler_openrouter(prompt: str, system: str | None, temperature: float) -> str:
    model = getattr(settings, "OPENROUTER_MODEL", "google/gemma-4-26b-a4b-it:free")
    return _appeler_openrouter_model(prompt, system, temperature, model)


# ─── Point d'entrée public ───────────────────────────────────

def appeler_ia_complet(
    prompt: str, system: str | None = None, temperature: float = 0.3
) -> tuple[str, str]:
    """
    Essaie Gemini en premier, bascule automatiquement sur OpenRouter si :
    - GEMINI_API_KEY est absente, ou
    - Gemini échoue après 2 tentatives.
    Retourne (texte_réponse, nom_modèle_utilisé).
    Lève IAIndisponible (sous-classe de RuntimeError) si aucun fournisseur ne répond.
    """
    gemini_key      = getattr(settings, "GEMINI_API_KEY", "")
    openrouter_key  = getattr(settings, "OPENROUTER_API_KEY", "")

    errors: list[str] = []

    # ── Tentative Gemini ──────────────────────────────────────
    if gemini_key:
        model_name = getattr(settings, "GEMINI_MODEL", "gemini-flash-latest")
        for attempt, delay in enumerate([0, 3], start=1):
            if delay:
                time.sleep(delay)
            try:
                result = _appeler_gemini(prompt, system, temperature)
                logger.info("IA Gemini OK (tentative %d)", attempt)
                return result, model_name
            except Exception as exc:
                errors.append(f"Gemini/{attempt}: {exc}")
                logger.warning("Gemini tentative %d échouée: %s", attempt, exc)
                if _erreur_reseau(exc):
                    raise IAIndisponible(f"Pas de connexion au service d'IA : {exc}") from exc
                # Quota/rate-limit (429) → inutile de réessayer, basculer immédiatement
                exc_str = str(exc).lower()
                if "429" in exc_str or "quota" in exc_str or "rate" in exc_str:
                    logger.info("Gemini quota dépassé — passage immédiat à OpenRouter")
                    break
                # Modèle inexistant/retiré (404) → inutile de réessayer
                if "404" in exc_str:
                    logger.error("Modèle Gemini %s indisponible — vérifier GEMINI_MODEL", model_name)
                    break
    else:
        logger.debug("GEMINI_API_KEY absente — passage direct à OpenRouter")

    # ── Fallback OpenRouter ───────────────────────────────────
    if openrouter_key:
        primary = getattr(settings, "OPENROUTER_MODEL", "google/gemma-4-26b-a4b-it:free")
        # cascade de modèles gratuits si le modèle principal est indisponible (404)
        free_cascade = [
            primary,
            "google/gemma-4-26b-a4b-it:free",
            "nvidia/nemotron-3-super-120b-a12b:free",
            "nvidia/nemotron-3-nano-30b-a3b:free",
            "tencent/hy3:free",
        ]
        tried_models: set[str] = set()
        for model_name in free_cascade:
            if model_name in tried_models:
                continue
            tried_models.add(model_name)
            for attempt, delay in enumerate([0, 2], start=1):
                if delay:
                    time.sleep(delay)
                try:
                    result = _appeler_openrouter_model(prompt, system, temperature, model_name)
                    logger.info("IA OpenRouter OK — modèle: %s (tentative %d)", model_name, attempt)
                    return result, model_name
                except Exception as exc:
                    exc_str = str(exc).lower()
                    errors.append(f"OpenRouter/{model_name}/{attempt}: {exc}")
                    logger.warning("OpenRouter %s tentative %d échouée: %s", model_name, attempt, exc)
                    if _erreur_reseau(exc):
                        raise IAIndisponible(f"Pas de connexion au service d'IA : {exc}") from exc
                    # modèle indisponible → passer au suivant immédiatement
                    if "404" in exc_str or "unavailable" in exc_str or "no endpoints" in exc_str:
                        logger.info("Modèle %s indisponible — cascade suivante", model_name)
                        break
    else:
        logger.debug("OPENROUTER_API_KEY absente")

    if not gemini_key and not openrouter_key:
        raise IAIndisponible("Aucune clé d'API d'IA configurée")
    raise IAIndisponible(f"Tous les agents IA ont échoué : {'; '.join(errors)}")


def appeler_ia(prompt: str, system: str | None = None, temperature: float = 0.3) -> str:
    """Wrapper rétrocompatible — retourne uniquement le texte."""
    text, _ = appeler_ia_complet(prompt, system, temperature)
    return text
