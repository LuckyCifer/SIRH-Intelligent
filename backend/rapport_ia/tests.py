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

    def _generer(self, rapport, erreur):
        from rapport_ia.services import generer_rapport_ia
        with mock.patch("rapport_ia.services.appeler_ia", side_effect=erreur):
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

    def test_reponse_illisible_meme_plan_b(self):
        rapport = self._generer(self._rapport(), ValueError("Expecting value"))
        self.assertEqual(rapport.statut, "GENERE")
        self.assertIn("inexploitable", rapport.resume_executif)


class EvaluationEtCvPlanBTests(SimpleTestCase):

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

    def test_cv_sans_score_invente(self):
        from recrutements import services
        candidature = SimpleNamespace(
            offre=SimpleNamespace(titre="Comptable", type_contrat="CDI", niveau_experience="JUNIOR",
                                  description="x", competences_requises="x"),
            nom_complet="A. Candidat", source="")
        with mock.patch("recrutements.models.Candidature.objects") as objets, \
                mock.patch.object(services, "appeler_ia", side_effect=IAIndisponible("Aucune clé d'API")):
            objets.select_related.return_value.get.return_value = candidature
            services._run_analyse(1)
        champs = objets.filter.return_value.update.call_args.kwargs
        self.assertIsNone(champs["score_cv_ia"])
        self.assertIn("évaluer manuellement", champs["analyse_cv_ia"])
