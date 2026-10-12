"""
Plan B quand l'IA est indisponible (pas d'Internet, quota épuisé, clé absente,
réponse illisible) : chaque module produit un résultat calculé sans IA, signalé
comme tel, au lieu d'échouer ou de rester vide.

Aucun appel réseau réel : les fournisseurs sont simulés.
Lancer :  python manage.py test rapport_ia
"""
from datetime import datetime
from types import SimpleNamespace
from unittest import mock

import httpx
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone

from ia import client
from ia.client import IAIndisponible, motif_plan_b

COUPURE_RESEAU = httpx.ConnectError("[Errno 11001] getaddrinfo failed")


@override_settings(GEMINI_API_KEY="cle-test", OPENROUTER_API_KEY="cle-test")
class ClientIATests(SimpleTestCase):

    def test_sans_reseau_echec_immediat_sans_cascade(self):
        with mock.patch.object(client, "_appeler_gemini", side_effect=COUPURE_RESEAU), \
                mock.patch.object(client, "_appeler_openrouter_model") as openrouter, \
                mock.patch.object(client.time, "sleep") as attente:
            with self.assertRaises(IAIndisponible) as ctx:
                client.appeler_ia("Bonjour")
        openrouter.assert_not_called()   # inutile d'essayer 5 modèles sans réseau
        attente.assert_not_called()
        self.assertEqual(motif_plan_b(ctx.exception), "pas de connexion Internet vers le service d'IA")

    def test_bascule_sur_openrouter_si_gemini_surcharge(self):
        with mock.patch.object(client, "_appeler_gemini", side_effect=RuntimeError("503 UNAVAILABLE")), \
                mock.patch.object(client, "_appeler_openrouter_model", return_value="OK"), \
                mock.patch.object(client.time, "sleep"):
            texte, modele = client.appeler_ia_complet("Bonjour")
        self.assertEqual(texte, "OK")

    def test_tous_les_fournisseurs_en_echec(self):
        with mock.patch.object(client, "_appeler_gemini", side_effect=RuntimeError("429 quota")), \
                mock.patch.object(client, "_appeler_openrouter_model", side_effect=RuntimeError("429")), \
                mock.patch.object(client.time, "sleep"):
            with self.assertRaises(IAIndisponible):
                client.appeler_ia("Bonjour")

    @override_settings(GEMINI_API_KEY="", OPENROUTER_API_KEY="")
    def test_aucune_cle(self):
        with self.assertRaises(IAIndisponible) as ctx:
            client.appeler_ia("Bonjour")
        self.assertEqual(motif_plan_b(ctx.exception), "aucune clé d'API d'IA n'est configurée")


class RapportMensuelPlanBTests(TestCase):

    def _rapport(self):
        from accounts.models import User
        from entreprises.models import Entreprise
        from presences.models import Pointage
        from rapport_ia.models import RapportIAMensuel
        e = Entreprise.objects.create(nom="ACERFI Test", slug="acerfi-test")
        rh = User.objects.create_user("rh.planb", password="x", role="RH", entreprise=e)
        employe = User.objects.create_user("employe.planb", password="x", role="EMPLOYE", entreprise=e)
        for jour, statut in ((5, "PRESENT"), (6, "ABSENT"), (7, "ABSENT")):
            Pointage.objects.create(employe=employe, date=datetime(2026, 10, jour).date(), statut=statut)
        return RapportIAMensuel.objects.create(entreprise=e, mois=10, annee=2026, genere_par=rh)

    def _generer(self, rapport, erreur, jours_ouvres=3):
        # jours ouvrés écoulés fixés : le test ne dépend pas de la date du jour
        from rapport_ia.services import generer_rapport_ia
        with mock.patch("rapport_ia.services.appeler_ia", side_effect=erreur),                 mock.patch("rapport_ia.services.jours_ouvres_ecoules", return_value=jours_ouvres):
            generer_rapport_ia(rapport.pk)
        rapport.refresh_from_db()
        return rapport

    def test_sans_internet_rapport_genere_par_regles(self):
        rapport = self._generer(self._rapport(), IAIndisponible("Pas de connexion au service d'IA : x"))
        self.assertEqual(rapport.statut, "GENERE")                    # et non ERREUR
        self.assertIn("pas de connexion Internet", rapport.resume_executif)
        self.assertEqual(rapport.indicateurs_cles["source"], "calcul sans IA")
        self.assertGreater(rapport.score_sante_rh, 0)
        # 1 présence sur 3 pointages → alerte critique sur la présence
        self.assertEqual(rapport.alertes_ia[0]["niveau"], "CRITIQUE")
        self.assertIn("Analyse IA indisponible", rapport.contenu_rapport)

    def test_pointages_incomplets_signales_et_hors_score(self):
        # 3 pointages pour 1 employé sur 20 jours ouvrés : couverture 15 %
        rapport = self._generer(self._rapport(), IAIndisponible("x"), jours_ouvres=20)
        alertes = {a["titre"]: a for a in rapport.alertes_ia}
        self.assertIn("Pointages incomplets", alertes)
        self.assertIn("3 pointage(s) sur 20 attendus", alertes["Pointages incomplets"]["detail"])
        self.assertNotIn("Présence en baisse", alertes)        # taux non interprété
        self.assertIn("non représentatif", rapport.contenu_rapport)

    def test_tendance_par_rapport_au_mois_precedent(self):
        from rapport_ia.models import RapportIAMensuel
        rapport = self._rapport()
        RapportIAMensuel.objects.create(entreprise=rapport.entreprise, mois=9, annee=2026,
                                        statut="GENERE", score_sante_rh=95)
        rapport = self._generer(rapport, IAIndisponible("x"))
        self.assertEqual(rapport.indicateurs_cles["tendance"], "BAISSE")

    def test_reponse_illisible_meme_plan_b(self):
        rapport = self._generer(self._rapport(), ValueError("Expecting value"))
        self.assertEqual(rapport.statut, "GENERE")
        self.assertIn("inexploitable", rapport.resume_executif)


class EvaluationPlanBTests(SimpleTestCase):

    def test_evaluation_score_calcule_depuis_les_notes(self):
        from objectifs.services import analyse_sans_ia
        evaluation = SimpleNamespace(note_competences=5, note_objectifs=4, note_comportement=4,
                                     note_initiative=3, note_travail_equipe=2, note_communication=4)
        data = analyse_sans_ia(evaluation, "pas de connexion Internet vers le service d'IA")
        self.assertEqual(data["score_global_100"], 73)                # moyenne 3,67/5
        self.assertEqual(data["niveau_performance"], "SATISFAISANT")
        self.assertIn("Compétences techniques", data["points_forts"])
        self.assertEqual(data["axes_developpement"], ["Travail en équipe"])
        self.assertEqual(data["source"], "calcul sans IA")


class ScoreSansIATests(SimpleTestCase):
    """Le score ne doit pas être flatteur quand les données manquent."""

    def test_mois_termine_sans_pointage_ni_paie_score_bas(self):
        from rapport_ia.services import alertes_sans_ia, calculer_score_sans_ia
        donnees = {"nb_employes": 15, "mois_termine": True,
                   "presences": {"total_pointages": 0, "pointages_attendus": 330, "couverture": 0.0},
                   "paie": {"total_bulletins": 0}, "sanctions": {"ce_mois": 0}}
        self.assertLess(calculer_score_sans_ia(donnees), 25)
        titres = [a["titre"] for a in alertes_sans_ia(donnees)[0]]
        self.assertEqual(titres[:2], ["Aucun pointage enregistré", "Paie non établie"])

    def test_paie_d_un_mois_en_cours_non_exigee(self):
        from rapport_ia.services import alertes_sans_ia
        donnees = {"nb_employes": 15, "mois_termine": False, "presences": {}, "paie": {"total_bulletins": 0}}
        self.assertNotIn("Paie non établie", [a["titre"] for a in alertes_sans_ia(donnees)[0]])
