"""
Services Rapport IA Mensuel
- collecter_donnees_rh : collecte les métriques de tous les modules RH
- calculer_score_sans_ia : score santé RH sans IA (moyenne pondérée)
- generer_rapport_ia : appel IA (Gemini → Groq) + fallback sans clé
"""
import json
import logging
import threading
from datetime import date
from django.db.models import Q, Sum

from ia.client import IAIndisponible, appeler_ia, motif_plan_b, parser_json

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_RH = """
Tu es un expert en ressources humaines senior pour ACERFI SARL,
entreprise de formation numérique au Cameroun.

Tu analyses des données RH mensuelles agrégées et génères un rapport de santé RH complet.

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown.

Structure JSON obligatoire :
{
  "score_sante_rh": <entier 0-100>,
  "resume_executif": "<3 à 5 phrases résumant l'état RH du mois>",
  "indicateurs_cles": {
    "point_fort": "<principal point positif du mois>",
    "point_vigilance": "<principal point d'attention>",
    "tendance": "<HAUSSE|STABLE|BAISSE>"
  },
  "alertes": [
    {"titre": "...", "niveau": "CRITIQUE|IMPORTANT|INFO", "detail": "..."}
  ],
  "recommandations": [
    {"titre": "...", "action": "...", "priorite": "HAUTE|MOYENNE|BASSE"}
  ],
  "contenu_rapport": "<rapport détaillé en markdown, 300 à 500 mots>"
}

Barème score_sante_rh :
85-100 : Excellente santé RH — engagement fort, peu d'absences, objectifs atteints
70-84  : Bonne santé RH — quelques points à améliorer
55-69  : Santé RH correcte — vigilance requise sur certains indicateurs
40-54  : Santé RH fragile — actions correctrices nécessaires
0-39   : Santé RH critique — intervention urgente
"""


def _mois_bornes(mois, annee):
    debut = date(annee, mois, 1)
    if mois == 12:
        fin = date(annee + 1, 1, 1)
    else:
        fin = date(annee, mois + 1, 1)
    return debut, fin


def jours_ouvres_ecoules(debut, fin):
    """Jours travaillés (lundi → vendredi, hors fériés) du mois, jusqu'à aujourd'hui inclus."""
    from datetime import date, timedelta
    from conges.calculateur_conges import CalculateurConges
    borne = min(fin, date.today() + timedelta(days=1))
    if borne <= debut:
        return 0
    feries = CalculateurConges().get_jours_feries_periode(debut, borne)
    n, jour = 0, debut
    while jour < borne:
        if jour.weekday() < 5 and jour not in feries:
            n += 1
        jour += timedelta(days=1)
    return n


def collecter_donnees_rh(mois, annee, departement=None, employe=None, entreprise=None):
    """Données agrégées d'UNE entreprise (jamais celles des autres clientes de la plateforme)."""
    from accounts.models import User

    debut, fin = _mois_bornes(mois, annee)

    employes_qs = User.objects.filter(role="EMPLOYE", is_active=True, entreprise=entreprise)
    if departement:
        employes_qs = employes_qs.filter(departement=departement)
    if employe:
        employes_qs = employes_qs.filter(pk=employe.pk)

    nb_employes = employes_qs.count()

    from datetime import date as _date
    data = {
        "periode": f"{annee}-{str(mois).zfill(2)}",
        "mois_termine": fin <= _date.today(),
        "nb_employes": nb_employes,
        "presences": {},
        "conges": {},
        "objectifs": {},
        "formations": {},
        "recrutements": {},
        "paie": {},
        "sanctions": {},
    }

    # 1. Présences
    try:
        from presences.models import Pointage
        pts = Pointage.objects.filter(employe__in=employes_qs, date__gte=debut, date__lt=fin)
        total = pts.count()
        presences = pts.filter(statut__in=["PRESENT", "RETARD"]).count()
        # Couverture : pointages enregistrés / pointages attendus (employés × jours ouvrés écoulés)
        attendus = nb_employes * jours_ouvres_ecoules(debut, fin)
        data["presences"] = {
            "total_pointages": total,
            "pointages_attendus": attendus,
            # plafonnée à 100 % : l'effectif de référence est l'effectif actif actuel
            "couverture": min(100.0, round(total / attendus * 100, 1)) if attendus else None,
            "presences": presences,
            "absences": pts.filter(statut="ABSENT").count(),
            "retards": pts.filter(statut="RETARD").count(),
            "taux_presence": round(presences / max(1, total) * 100, 1),
        }
    except Exception as exc:
        logger.warning("presences data collection failed: %s", exc)

    # 2. Congés
    try:
        from conges.models import DemandeConge
        cq = DemandeConge.objects.filter(employe__in=employes_qs, date_debut__gte=debut, date_debut__lt=fin)
        total_c = cq.count()
        approuves = cq.filter(statut="APPROUVE").count()
        traites = cq.exclude(statut="EN_ATTENTE").count()
        data["conges"] = {
            "total": total_c,
            "en_attente": cq.filter(statut="EN_ATTENTE").count(),
            "approuves": approuves,
            "refuses": cq.filter(statut="REFUSE").count(),
            "jours_pris": cq.filter(statut="APPROUVE").aggregate(s=Sum("nb_jours"))["s"] or 0,
            "taux_approbation": round(approuves / max(1, traites) * 100, 1),
        }
    except Exception as exc:
        logger.warning("conges data collection failed: %s", exc)

    # 3. Objectifs
    try:
        from objectifs.models import Objectif
        # Objectifs dont la période d'évaluation couvre le mois
        oq = Objectif.objects.filter(employe__in=employes_qs,
                                     periode__date_debut__lt=fin, periode__date_fin__gte=debut)
        total_o = oq.count()
        atteints = oq.filter(statut__in=["ATTEINT", "DEPASSE"]).count()
        data["objectifs"] = {
            "total": total_o,
            "atteints": atteints,
            "en_cours": oq.filter(statut="EN_COURS").count(),
            "non_atteints": oq.filter(statut="NON_ATTEINT").count(),
            "taux_atteinte": round(atteints / max(1, total_o) * 100, 1),
        }
    except Exception as exc:
        logger.warning("objectifs data collection failed: %s", exc)

    # 4. Formations
    try:
        from formations.models import Formation, InscriptionFormation
        # Formations qui se déroulent pendant le mois
        fq = Formation.objects.filter(entreprise=entreprise, date_debut__lt=fin).filter(
            Q(date_fin__gte=debut) | Q(date_fin__isnull=True, date_debut__gte=debut))
        iq = InscriptionFormation.objects.filter(employe__in=employes_qs, formation__in=fq)
        presents = iq.filter(statut="PRESENT").count()
        data["formations"] = {
            "total": fq.count(),
            "planifiees": fq.filter(statut="PLANIFIEE").count(),
            "en_cours": fq.filter(statut="EN_COURS").count(),
            "terminees": fq.filter(statut="TERMINEE").count(),
            "inscrits": iq.count(),
            "taux_completion": round(presents / max(1, iq.count()) * 100, 1),
        }
    except Exception as exc:
        logger.warning("formations data collection failed: %s", exc)

    # 5. Recrutements
    try:
        from recrutements.models import OffreEmploi, Candidature
        data["recrutements"] = {
            "postes_ouverts": OffreEmploi.objects.filter(statut="PUBLIEE", entreprise=entreprise).count(),
            "total_candidatures": Candidature.objects.filter(offre__entreprise=entreprise).count(),
            "en_cours": Candidature.objects.filter(
                offre__entreprise=entreprise,
                statut__in=["RECUE", "EN_COURS", "ENTRETIEN_RH", "ENTRETIEN_TECH"]
            ).count(),
        }
    except Exception as exc:
        logger.warning("recrutements data collection failed: %s", exc)

    # 6. Paie
    try:
        from paie.models import BulletinPaie
        bq = BulletinPaie.objects.filter(employe__in=employes_qs, mois=mois, annee=annee)
        valides = bq.filter(statut__in=["VALIDE", "PAYE"])
        data["paie"] = {
            "total_bulletins": bq.count(),
            "valides": valides.count(),
            "payes": bq.filter(statut="PAYE").count(),
            "masse_brute": float(valides.aggregate(s=Sum("salaire_brut"))["s"] or 0),
            "masse_nette": float(valides.aggregate(s=Sum("salaire_net"))["s"] or 0),
        }
    except Exception as exc:
        logger.warning("paie data collection failed: %s", exc)

    # 7. Sanctions
    try:
        from sanctions.models import Sanction
        sq = Sanction.objects.filter(employe__in=employes_qs)
        data["sanctions"] = {
            "total": sq.count(),
            # date légale de la sanction (et non date de saisie)
            "ce_mois": sq.filter(date_sanction__gte=debut, date_sanction__lt=fin).count(),
            "en_cours": sq.filter(statut__in=["NOTIFIEE", "ACCEPTEE", "CONTESTEE"]).count(),
        }
    except Exception as exc:
        logger.warning("sanctions data collection failed: %s", exc)

    return data


COUVERTURE_MINIMALE = 50   # % de pointages attendus en dessous duquel la présence n'est pas interprétée


def presence_exploitable(pres):
    couverture = pres.get("couverture")
    return couverture is None or couverture >= COUVERTURE_MINIMALE


def calculer_score_sans_ia(donnees):
    composantes = []

    # Présence (30) : taux de présence si les pointages sont représentatifs ; sinon la
    # couverture des pointages elle-même (un suivi absent n'est pas une bonne santé RH)
    pres = donnees.get("presences", {})
    if pres.get("pointages_attendus") or pres.get("total_pointages", 0) > 0:
        if pres.get("total_pointages", 0) > 0 and presence_exploitable(pres):
            composantes.append((pres["taux_presence"], 30))
        else:
            composantes.append((pres.get("couverture") or 0, 30))

    conges = donnees.get("conges", {})
    if conges.get("total", 0) > 0:
        composantes.append((conges.get("taux_approbation", 80), 20))

    obj = donnees.get("objectifs", {})
    if obj.get("total", 0) > 0:
        composantes.append((obj["taux_atteinte"], 25))

    form = donnees.get("formations", {})
    if form.get("inscrits", 0) > 0:
        composantes.append((form["taux_completion"], 15))

    # Paie (15) : part des employés ayant un bulletin, pour un mois terminé
    if donnees.get("mois_termine") and donnees.get("nb_employes", 0) > 0:
        bulletins = donnees.get("paie", {}).get("total_bulletins", 0)
        composantes.append((min(100, bulletins / donnees["nb_employes"] * 100), 15))

    nb = max(1, donnees.get("nb_employes", 1))
    sanc_mois = donnees.get("sanctions", {}).get("ce_mois", 0)
    taux_sanc = min(100, sanc_mois / nb * 100)
    composantes.append((100 - taux_sanc, 10))

    if not composantes:
        return 70.0

    total_poids = sum(p for _, p in composantes)
    score = sum(v * p for v, p in composantes) / total_poids
    return round(score, 1)


def alertes_sans_ia(donnees):
    """Alertes et recommandations par règles explicites (plan B, sans IA)."""
    alertes, recommandations = [], []
    pres = donnees.get("presences", {})
    attendus = pres.get("pointages_attendus") or 0
    if attendus and pres.get("total_pointages", 0) == 0:
        alertes.append({"titre": "Aucun pointage enregistré", "niveau": "IMPORTANT",
                        "detail": f"0 pointage sur {attendus} attendus : la présence ne peut pas être évaluée."})
        recommandations.append({"titre": "Rétablir le pointage",
                                "action": "Vérifier que les employés pointent chaque jour et saisir les pointages manquants.",
                                "priorite": "HAUTE"})
    elif not presence_exploitable(pres):
        alertes.append({"titre": "Pointages incomplets", "niveau": "IMPORTANT",
                        "detail": f"{pres['total_pointages']} pointage(s) sur {attendus} attendus "
                                  f"({pres['couverture']} %) : le taux de présence n'est pas représentatif "
                                  f"et n'entre pas dans le score."})
        recommandations.append({"titre": "Compléter les pointages",
                                "action": "Saisir les pointages manquants avant d'interpréter la présence du mois.",
                                "priorite": "HAUTE"})
    if pres.get("total_pointages", 0) > 0 and presence_exploitable(pres):
        taux = pres.get("taux_presence", 100)
        if taux < 90:
            alertes.append({"titre": "Présence en baisse",
                            "niveau": "CRITIQUE" if taux < 80 else "IMPORTANT",
                            "detail": f"Taux de présence de {taux} % sur le mois."})
            recommandations.append({"titre": "Analyser les absences",
                                    "action": "Identifier les absences répétées et en rechercher les causes avec les managers.",
                                    "priorite": "HAUTE" if taux < 80 else "MOYENNE"})
    if pres.get("retards", 0) > 0 and pres.get("presences", 0) > 0:
        part = round(pres["retards"] / pres["presences"] * 100)
        alertes.append({"titre": "Retards", "niveau": "IMPORTANT" if part >= 20 else "INFO",
                        "detail": f"{pres['retards']} arrivée(s) en retard sur {pres['presences']} présence(s) ({part} %)."})
    conges = donnees.get("conges", {})
    if conges.get("en_attente", 0) > 0:
        alertes.append({"titre": "Congés à traiter", "niveau": "INFO",
                        "detail": f"{conges['en_attente']} demande(s) de congé en attente de validation."})
        recommandations.append({"titre": "Traiter les demandes de congé",
                                "action": "Valider ou refuser les demandes en attente avant le départ prévu.",
                                "priorite": "MOYENNE"})
    obj = donnees.get("objectifs", {})
    if obj.get("total", 0) > 0 and obj.get("taux_atteinte", 100) < 50:
        alertes.append({"titre": "Objectifs peu atteints", "niveau": "IMPORTANT",
                        "detail": f"Taux d'atteinte des objectifs : {obj['taux_atteinte']} %."})
        recommandations.append({"titre": "Revoir les objectifs",
                                "action": "Faire un point d'étape avec chaque manager sur les objectifs en retard.",
                                "priorite": "HAUTE"})
    paie = donnees.get("paie", {})
    nb = donnees.get("nb_employes", 0)
    if donnees.get("mois_termine") and nb:
        if paie.get("total_bulletins", 0) == 0:
            alertes.append({"titre": "Paie non établie", "niveau": "IMPORTANT",
                            "detail": f"Aucun bulletin de paie pour {nb} employé(s) sur ce mois."})
            recommandations.append({"titre": "Établir la paie",
                                    "action": "Générer et valider les bulletins du mois (obligations CNPS et DGI).",
                                    "priorite": "HAUTE"})
        elif paie["total_bulletins"] < nb:
            alertes.append({"titre": "Paie incomplète", "niveau": "INFO",
                            "detail": f"{paie['total_bulletins']} bulletin(s) pour {nb} employé(s)."})
    if donnees.get("sanctions", {}).get("en_cours", 0) > 0:
        alertes.append({"titre": "Procédures disciplinaires", "niveau": "INFO",
                        "detail": f"{donnees['sanctions']['en_cours']} sanction(s) en cours de procédure."})
    return alertes, recommandations


ECART_TENDANCE = 5   # points de score


def tendance(rapport, score):
    """HAUSSE / BAISSE / STABLE par rapport au rapport généré du mois précédent."""
    from .models import RapportIAMensuel
    mois, annee = (12, rapport.annee - 1) if rapport.mois == 1 else (rapport.mois - 1, rapport.annee)
    precedent = RapportIAMensuel.objects.filter(
        entreprise=rapport.entreprise, mois=mois, annee=annee, type_rapport=rapport.type_rapport,
        departement=rapport.departement, employe=rapport.employe,
        statut=RapportIAMensuel.Statut.GENERE,
    ).first()
    if precedent is None or precedent.score_sante_rh is None:
        return "STABLE"
    ecart = score - float(precedent.score_sante_rh)
    if ecart >= ECART_TENDANCE:
        return "HAUSSE"
    if ecart <= -ECART_TENDANCE:
        return "BAISSE"
    return "STABLE"


def _remplir_sans_ia(rapport, donnees, raison):
    """Plan B : rapport complet calculé sans IA, clairement signalé, régénérable plus tard."""
    score = calculer_score_sans_ia(donnees)
    alertes, recommandations = alertes_sans_ia(donnees)
    pres = donnees.get("presences", {})
    conges = donnees.get("conges", {})
    obj = donnees.get("objectifs", {})
    rapport.score_sante_rh   = score
    rapport.resume_executif  = (
        f"Rapport calculé sans analyse IA ({raison}). Score de santé RH : {score}/100, "
        f"établi à partir des présences, des congés, des objectifs, des formations et des sanctions."
    )
    rapport.alertes_ia       = alertes
    rapport.recommandations  = recommandations
    rapport.indicateurs_cles = {
        "point_fort":      "Indicateurs calculés à partir des données réelles du mois",
        "point_vigilance": alertes[0]["titre"] if alertes else "Aucune alerte détectée",
        "tendance":        tendance(rapport, score),
        "source":          "calcul sans IA",
    }
    lignes = [
        f"# Rapport RH — {donnees['periode']}",
        "",
        f"> Analyse IA indisponible : {raison}. Ce rapport est calculé par règles ; "
        "il peut être régénéré avec l'IA dès que le service est de nouveau accessible.",
        "",
        f"**Score de santé RH : {score}/100** — effectif : {donnees.get('nb_employes', 0)} employé(s)",
        "",
        "| Indicateur | Valeur |",
        "|---|---|",
        f"| Pointages enregistrés / attendus | {pres.get('total_pointages', 0)} / {pres.get('pointages_attendus', '—')} |",
        f"| Taux de présence | {pres.get('taux_presence', '—') if presence_exploitable(pres) and pres.get('total_pointages') else 'non représentatif'} % |",
        f"| Absences / retards | {pres.get('absences', 0)} / {pres.get('retards', 0)} |",
        f"| Congés pris (jours) | {conges.get('jours_pris', 0)} |",
        f"| Demandes de congé en attente | {conges.get('en_attente', 0)} |",
        f"| Objectifs atteints | {obj.get('taux_atteinte', '—')} % |",
    ]
    if alertes:
        lignes += ["", "## Alertes", ""] + [f"- **{a['titre']}** ({a['niveau']}) : {a['detail']}" for a in alertes]
    rapport.contenu_rapport = "\n".join(lignes)


def generer_rapport_ia(rapport_id: int) -> None:
    from .models import RapportIAMensuel

    try:
        rapport = RapportIAMensuel.objects.get(pk=rapport_id)
    except RapportIAMensuel.DoesNotExist:
        logger.error("RapportIAMensuel #%d introuvable", rapport_id)
        return

    try:
        donnees = collecter_donnees_rh(
            mois=rapport.mois,
            annee=rapport.annee,
            departement=rapport.departement,
            employe=rapport.employe,
            entreprise=rapport.entreprise,
        )
        rapport.donnees_collectees = donnees

        try:
            prompt = (
                f"Données RH du mois {donnees['periode']} :\n\n"
                + json.dumps(donnees, ensure_ascii=False, indent=2)
            )
            raw = appeler_ia(prompt, system=SYSTEM_PROMPT_RH, temperature=0.3)
            ia_result = parser_json(raw)
        except (IAIndisponible, ValueError) as exc:
            # Plan B : pas de réseau, quota épuisé, clé absente ou réponse illisible
            logger.warning("Rapport IA #%d : plan B sans IA (%s)", rapport_id, exc)
            _remplir_sans_ia(rapport, donnees, motif_plan_b(exc))
        else:
            rapport.score_sante_rh   = float(ia_result.get("score_sante_rh", calculer_score_sans_ia(donnees)))
            rapport.resume_executif  = ia_result.get("resume_executif", "")
            rapport.indicateurs_cles = ia_result.get("indicateurs_cles", {})
            rapport.alertes_ia       = ia_result.get("alertes", [])
            rapport.recommandations  = ia_result.get("recommandations", [])
            rapport.contenu_rapport  = ia_result.get("contenu_rapport", "")

        rapport.statut = RapportIAMensuel.Statut.GENERE
        rapport.message_erreur = ""
        rapport.save()
        logger.info("Rapport IA #%d généré — score %.1f", rapport_id, rapport.score_sante_rh)

    except Exception as exc:
        logger.error("Génération rapport IA #%d échouée : %s", rapport_id, exc)
        try:
            rapport.statut = RapportIAMensuel.Statut.ERREUR
            rapport.message_erreur = str(exc)
            rapport.save(update_fields=["statut", "message_erreur", "updated_at"])
        except Exception:
            pass


def lancer_generation_async(rapport_id: int) -> None:
    t = threading.Thread(target=generer_rapport_ia, args=(rapport_id,), daemon=True)
    t.start()
