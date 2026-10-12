"""
Solde de congé annuel — source unique pour l'écran détaillé, la table SoldeConge
et le contrôle des demandes.

Règle (Code du travail art. 89 et 92, guide du travailleur OIT) : un congé pris
l'année N s'impute sur le droit acquis pendant la période de référence TERMINÉE,
c'est-à-dire l'année N-1. Le droit qui s'accumule pendant l'année N n'est
disponible qu'avec l'anticipation autorisée (accord de l'employeur ou convention
plus favorable) : réglage CONGES_ANTICIPATION_AUTORISEE.

Les types de congé déductibles du congé annuel (TypeConge.deductible_conge_annuel)
puisent tous dans ce même solde.
"""
from datetime import date

from django.conf import settings

from .calculateur_conges import CalculateurConges


def anticipation_autorisee():
    return bool(getattr(settings, "CONGES_ANTICIPATION_AUTORISEE", False))


def calculer_situation(employe, annee_depart, aujourd_hui=None, exclure_demande=None):
    """
    Situation du solde annuel pour un congé débutant en `annee_depart`.
    `exclure_demande` : pk d'une demande à ne pas compter (celle qu'on est en train de traiter).
    """
    from .models import DemandeConge

    calc = CalculateurConges()
    aujourd_hui = aujourd_hui or date.today()
    droit = calc.calculer_solde_annuel(employe, annee_depart - 1, aujourd_hui=aujourd_hui)
    droit_en_cours = calc.calculer_solde_annuel(employe, annee_depart, aujourd_hui=aujourd_hui)
    anticipation = anticipation_autorisee()

    demandes = DemandeConge.objects.filter(
        employe=employe,
        date_debut__year=annee_depart,
        type_conge__deductible_conge_annuel=True,
    )
    if exclure_demande:
        demandes = demandes.exclude(pk=exclure_demande)
    jours_pris = sum(d.nb_jours for d in demandes.filter(statut=DemandeConge.Statut.APPROUVE))
    jours_en_attente = sum(d.nb_jours for d in demandes.filter(statut=DemandeConge.Statut.EN_ATTENTE))

    jours_acquis = droit["total_jours_droit"] + (droit_en_cours["total_jours_droit"] if anticipation else 0)
    return {
        "periode_reference":      annee_depart - 1,
        "droit":                  droit,
        "droit_en_cours":         droit_en_cours,
        "anticipation_autorisee": anticipation,
        "jours_acquis":           jours_acquis,
        "jours_pris":             jours_pris,
        "jours_en_attente":       jours_en_attente,
        "jours_disponibles":      jours_acquis - jours_pris - jours_en_attente,
    }


def synchroniser_solde_annuel(employe, annee):
    """Écrit la situation dans SoldeConge pour les types « congé annuel » ; retourne la situation."""
    from .models import SoldeConge, TypeConge

    situation = calculer_situation(employe, annee)
    for type_conge in TypeConge.objects.filter(code_legal=TypeConge.CodeLegal.ANNUEL, actif=True):
        SoldeConge.objects.update_or_create(
            employe=employe, type_conge=type_conge, annee=annee,
            defaults={
                "jours_acquis":     situation["jours_acquis"],
                "jours_pris":       situation["jours_pris"],
                "jours_en_attente": situation["jours_en_attente"],
            },
        )
    return situation
