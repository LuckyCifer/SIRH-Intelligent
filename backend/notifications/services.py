from django.utils import timezone
from .models import Notification


def creer_notification(destinataire, titre, message, type_notif="INFO", categorie="SYSTEME", lien=""):
    return Notification.objects.create(
        destinataire=destinataire,
        titre=titre,
        message=message,
        type_notif=type_notif,
        categorie=categorie,
        lien=lien,
    )


def notifier_conge_soumis(demande):
    from accounts.models import User
    # RH/ADMIN : gestion globale des congés
    for user in User.objects.filter(role__in=("RH", "ADMIN"), is_active=True):
        creer_notification(
            destinataire=user,
            titre="Nouvelle demande de congé",
            message=f"{demande.employe.get_full_name()} a soumis une demande de congé "
                    f"du {demande.date_debut} au {demande.date_fin}.",
            type_notif="INFO",
            categorie="CONGE",
            lien="/rh/conges",
        )
    # Manager direct de l'employé uniquement, avec son propre lien
    responsable = getattr(getattr(demande.employe, "departement", None), "responsable", None)
    if responsable and responsable.role == "MANAGER" and responsable.is_active:
        creer_notification(
            destinataire=responsable,
            titre="Nouvelle demande de congé",
            message=f"{demande.employe.get_full_name()} a soumis une demande de congé "
                    f"du {demande.date_debut} au {demande.date_fin}.",
            type_notif="INFO",
            categorie="CONGE",
            lien="/manager/conges",
        )


def notifier_conge_valide(demande, approuve=True):
    statut = "approuvée" if approuve else "refusée"
    type_notif = "SUCCES" if approuve else "ALERTE"
    creer_notification(
        destinataire=demande.employe,
        titre=f"Demande de congé {statut}",
        message=f"Votre demande de congé du {demande.date_debut} au {demande.date_fin} a été {statut}.",
        type_notif=type_notif,
        categorie="CONGE",
        lien="/employe/conges",
    )


def notifier_evaluation_soumise(evaluation):
    from accounts.models import User
    managers_rh = User.objects.filter(role__in=("RH", "ADMIN"), is_active=True)
    for user in managers_rh:
        creer_notification(
            destinataire=user,
            titre="Nouvelle évaluation soumise",
            message=f"Une évaluation de performance a été soumise pour {evaluation.employe.get_full_name()}.",
            type_notif="INFO",
            categorie="EVALUATION",
            lien=f"/rh/objectifs",
        )


def notifier_contrat_expirant(contrat, jours_restants):
    from accounts.models import User
    rh_users = User.objects.filter(role__in=("RH", "ADMIN"), is_active=True)
    for user in rh_users:
        creer_notification(
            destinataire=user,
            titre="Contrat arrivant à expiration",
            message=f"Le contrat de {contrat.employe.get_full_name()} expire dans {jours_restants} jours "
                    f"(le {contrat.date_fin}).",
            type_notif="ALERTE" if jours_restants <= 7 else "INFO",
            categorie="CONTRAT",
            lien="/rh/contrats",
        )
    creer_notification(
        destinataire=contrat.employe,
        titre="Votre contrat arrive à expiration",
        message=f"Votre contrat de travail expire dans {jours_restants} jours (le {contrat.date_fin}). "
                f"Contactez les RH pour plus d'informations.",
        type_notif="ALERTE",
        categorie="CONTRAT",
        lien="/mon-profil",
    )


def notifier_bulletin_disponible(bulletin):
    creer_notification(
        destinataire=bulletin.employe,
        titre="Bulletin de paie disponible",
        message=f"Votre bulletin de paie pour {bulletin.mois:02d}/{bulletin.annee} est disponible.",
        type_notif="SUCCES",
        categorie="PAIE",
        lien="/paie/bulletins",
    )


def notifier_objectif_en_retard(objectif):
    creer_notification(
        destinataire=objectif.employe,
        titre="Objectif en retard",
        message=f"L'objectif « {objectif.titre} » était dû le {objectif.date_echeance} "
                f"et affiche une progression de {objectif.progression}%.",
        type_notif="ALERTE",
        categorie="EVALUATION",
        lien="/employe/mes-objectifs",
    )
    # RH/ADMIN : page de gestion RH
    from accounts.models import User
    for user in User.objects.filter(role__in=("RH", "ADMIN"), is_active=True):
        creer_notification(
            destinataire=user,
            titre="Objectif employé en retard",
            message=f"L'objectif « {objectif.titre} » de {objectif.employe.get_full_name()} "
                    f"est en retard ({objectif.progression}%).",
            type_notif="ALERTE",
            categorie="EVALUATION",
            lien="/rh/objectifs",
        )
    # Manager direct de l'employé uniquement, avec son propre lien
    responsable = getattr(getattr(objectif.employe, "departement", None), "responsable", None)
    if responsable and responsable.role == "MANAGER" and responsable.is_active:
        creer_notification(
            destinataire=responsable,
            titre="Objectif employé en retard",
            message=f"L'objectif « {objectif.titre} » de {objectif.employe.get_full_name()} "
                    f"est en retard ({objectif.progression}%).",
            type_notif="ALERTE",
            categorie="EVALUATION",
            lien="/manager/objectifs-equipe",
        )
