"""
Validateurs légaux — Contrats (Code du Travail camerounais)
"""
from rest_framework.exceptions import ValidationError


def _duree_mois(d1, d2):
    return (d2.year - d1.year) * 12 + (d2.month - d1.month)


MAX_ESSAI_MOIS = {
    "CAT_I_VI":   1,
    "CAT_VII_X":  3,
    "CAT_XI_XII": 6,
}

PREAVIS_PALIERS = [
    (6,  15),   # < 6 mois → 15 jours
    (24, 30),   # 6–24 mois → 1 mois
    (60, 60),   # 24–60 mois → 2 mois
]


def valider_duree_cdd(data):
    """Art. 25 Code du Travail : CDD max 2 ans, renouvelable une fois."""
    if data.get("type_contrat") != "CDD":
        return

    renouvellement = int(data.get("renouvellement_numero") or 0)
    if renouvellement > 1:
        raise ValidationError({
            "renouvellement_numero": (
                "Un CDD ne peut être renouvelé qu'une seule fois au Cameroun "
                "(Art. 25 al.1 du Code du Travail)."
            )
        })

    date_debut = data.get("date_debut")
    date_fin   = data.get("date_fin")
    if date_debut and date_fin:
        duree = _duree_mois(date_debut, date_fin)
        if duree > 24:
            raise ValidationError({
                "date_fin": (
                    f"La durée totale du CDD est de {duree} mois. "
                    "Elle ne peut excéder 2 ans (24 mois) au Cameroun "
                    "(Art. 25 du Code du Travail)."
                )
            })


def valider_periode_essai(data):
    """Art. 27 Code du Travail : durée d'essai maximale par catégorie."""
    periode = int(data.get("periode_essai_mois") or 0)
    categorie = data.get("categorie_pro") or ""
    if not periode or not categorie:
        return
    max_mois = MAX_ESSAI_MOIS.get(categorie, 6)
    if periode > max_mois:
        raise ValidationError({
            "periode_essai_mois": (
                f"La période d'essai ne peut excéder {max_mois} mois pour cette "
                f"catégorie professionnelle (Art. 27 du Code du Travail camerounais)."
            )
        })


def valider_non_concurrence(data):
    """Art. 36 al.3 : rayon max 50 km, durée max 12 mois."""
    if not data.get("clause_non_concurrence"):
        return
    rayon = int(data.get("rayon_non_concurrence_km") or 50)
    duree = int(data.get("duree_non_concurrence_mois") or 12)
    if rayon > 50:
        raise ValidationError({
            "rayon_non_concurrence_km": (
                "Le rayon de non-concurrence ne peut excéder 50 km "
                "(Art. 36 du Code du Travail camerounais)."
            )
        })
    if duree > 12:
        raise ValidationError({
            "duree_non_concurrence_mois": (
                "La durée de la clause de non-concurrence ne peut excéder 12 mois "
                "(Art. 36 du Code du Travail camerounais)."
            )
        })


def calculer_preavis(anciennete_mois):
    """
    Arrêté n°015/MTPS/SG/CJ du 26 mai 1993 — Durée de préavis.
    Retourne le nombre de jours.
    """
    for seuil, jours in PREAVIS_PALIERS:
        if anciennete_mois < seuil:
            return jours
    return 90  # > 60 mois → 3 mois


def calculer_duree_essai(categorie_pro):
    """
    Art. 27 Code du Travail — Durée maximale légale de la période d'essai.
    Retourne le nombre de mois.
    """
    return MAX_ESSAI_MOIS.get(categorie_pro or "", 3)
