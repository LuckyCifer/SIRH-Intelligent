"""
Tests du CalculateurConges — Code du travail camerounais (loi n° 92/007), art. 89 à 93.

Calculs : tests unitaires purs (SimpleTestCase), date d'embauche fournie par mock et
date du jour fixée. Contrôle du solde : tests d'API (TestCase, base de test temporaire).
Lancer :  python manage.py test conges
"""
from datetime import date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .calculateur_conges import CalculateurConges

AU_15_JANVIER_2026 = date(2026, 1, 15)


def droit(embauche, annee, aujourd_hui=AU_15_JANVIER_2026, date_naissance=None, nb_enfants=0):
    employe = SimpleNamespace(date_naissance=date_naissance)
    with mock.patch.object(CalculateurConges, "_get_date_embauche", return_value=embauche):
        return CalculateurConges().calculer_solde_annuel(
            employe, annee, nb_enfants=nb_enfants, aujourd_hui=aujourd_hui)


class DroitAnnuelTests(SimpleTestCase):
    """Art. 89 (1) : 1,5 jour ouvrable par mois de service effectif."""

    def test_annee_complete_donne_18_jours(self):
        d = droit(date(2022, 3, 1), 2025)
        self.assertEqual(d["mois_travailles"], 12)     # et non 11
        self.assertEqual(d["jours_base"], 18)
        self.assertEqual(d["total_jours_droit"], 18)   # 3 ans d'ancienneté : pas de majoration

    def test_embauche_en_cours_d_annee(self):
        # 15 mars → 31 décembre : 9 mois complets → 13,5 → 13 jours
        d = droit(date(2025, 3, 15), 2025)
        self.assertEqual(d["mois_travailles"], 9)
        self.assertEqual(d["jours_base"], 13)

    def test_annee_en_cours_acquis_a_date(self):
        # Au 12 octobre 2026 : 9 mois complets (janvier → septembre)
        d = droit(date(2020, 1, 1), 2026, aujourd_hui=date(2026, 10, 12))
        self.assertEqual(d["mois_travailles"], 9)
        self.assertEqual(d["jours_base"], 13)

    def test_aucun_droit_avant_embauche(self):
        self.assertEqual(droit(date(2027, 1, 1), 2026)["total_jours_droit"], 0)


class MajorationsTests(SimpleTestCase):

    def test_moins_de_18_ans_2_5_jours_par_mois(self):
        # Art. 90 (1) : né en 2009 → 16 ans en 2025 → 12 × 2,5 = 30
        d = droit(date(2024, 1, 1), 2025, date_naissance=date(2009, 5, 1))
        self.assertEqual(d["taux_mensuel"], 2.5)
        self.assertEqual(d["jours_base"], 30)

    def test_majeur_1_5_jour_par_mois(self):
        d = droit(date(2024, 1, 1), 2025, date_naissance=date(1990, 5, 1))
        self.assertEqual(d["taux_mensuel"], 1.5)

    def test_anciennete_2_jours_par_tranche_de_5_ans(self):
        # Art. 90 (3) : embauche 1er janvier 2019 → 6 ans au 1er janvier 2025 → 1 tranche → +2
        d = droit(date(2019, 1, 1), 2025)
        self.assertEqual(d["anciennete_annees"], 6)
        self.assertEqual(d["majoration_anciennete"], 2)
        self.assertEqual(d["total_jours_droit"], 20)

    def test_anciennete_deux_tranches(self):
        # Embauche juin 2014 → 10 ans révolus au 1er janvier 2025 → +4
        d = droit(date(2014, 6, 1), 2025)
        self.assertEqual(d["anciennete_annees"], 10)
        self.assertEqual(d["majoration_anciennete"], 4)
        self.assertEqual(d["total_jours_droit"], 22)

    def test_mere_2_jours_par_enfant_sans_plafond(self):
        # Art. 90 (2) : 6 enfants de moins de 6 ans → +12 (le texte ne prévoit pas de plafond)
        d = droit(date(2022, 1, 1), 2025, nb_enfants=6)
        self.assertEqual(d["majoration_enfants"], 12)
        self.assertEqual(d["total_jours_droit"], 30)

    def test_mere_conge_court_1_jour_seulement(self):
        # Congé principal ≤ 6 jours (4 mois → 6 j) : +1 jour, quel que soit le nombre d'enfants
        d = droit(date(2025, 9, 1), 2025, nb_enfants=3)
        self.assertEqual(d["jours_base"], 6)
        self.assertEqual(d["majoration_enfants"], 1)


class EligibiliteTests(SimpleTestCase):
    """Art. 92 (1) : droit de jouissance acquis après 1 an de service."""

    def _verifier(self, embauche, aujourd_hui):
        with mock.patch.object(CalculateurConges, "_get_date_embauche", return_value=embauche):
            return CalculateurConges().verifier_droit_conge(SimpleNamespace(), aujourd_hui=aujourd_hui)

    def test_onze_mois_et_vingt_deux_jours_pas_encore_eligible(self):
        r = self._verifier(date(2025, 10, 20), date(2026, 10, 12))
        self.assertFalse(r["eligible"])
        self.assertEqual(r["mois_travailles"], 11)
        self.assertEqual(r["mois_restants"], 1)

    def test_eligible_au_premier_anniversaire(self):
        self.assertTrue(self._verifier(date(2025, 10, 20), date(2026, 10, 20))["eligible"])


class JoursOuvrablesTests(SimpleTestCase):
    """Art. 89 : les jours de congé se comptent en jours ouvrables (le samedi compte)."""
    calc = CalculateurConges()

    def test_trois_semaines_egalent_18_jours_ouvrables(self):
        # Lundi 5 → samedi 24 octobre 2026 (dimanches exclus)
        self.assertEqual(self.calc.calculer_jours_ouvrables(date(2026, 10, 5), date(2026, 10, 24)), 18)

    def test_samedi_compte_dimanche_non(self):
        # Lundi 5 → dimanche 11 octobre 2026 : 6 jours ouvrables
        self.assertEqual(self.calc.calculer_jours_ouvrables(date(2026, 10, 5), date(2026, 10, 11)), 6)

    def test_jour_ferie_non_decompte(self):
        # Lundi 18 → samedi 23 mai 2026 : le 20 mai (Fête nationale) n'est pas décompté
        self.assertEqual(self.calc.calculer_jours_ouvrables(date(2026, 5, 18), date(2026, 5, 23)), 5)
        self.assertEqual(self.calc.lister_feries_pendant_conge(date(2026, 5, 18), date(2026, 5, 23)),
                         [date(2026, 5, 20)])

    def test_date_de_retour_premier_jour_travaille(self):
        # Fin le samedi 24 octobre → reprise le lundi 26
        self.assertEqual(self.calc.calculer_date_retour(date(2026, 10, 24)), date(2026, 10, 26))
        # Fin le jeudi 24 décembre → 25 férié, puis week-end → reprise le lundi 28
        self.assertEqual(self.calc.calculer_date_retour(date(2026, 12, 24)), date(2026, 12, 28))


class JoursFeriesTests(SimpleTestCase):
    """Loi n° 73/5 du 7 décembre 1973 modifiée : 4 fêtes civiles + fêtes religieuses."""
    calc = CalculateurConges()

    def test_calendrier_2026_dix_jours_legaux(self):
        self.assertEqual(self.calc._paques(2026), date(2026, 4, 5))
        self.assertEqual(self.calc.get_jours_feries(2026), {
            date(2026, 1, 1),    # Jour de l'An
            date(2026, 2, 11),   # Fête de la Jeunesse
            date(2026, 3, 20),   # Aïd el-Fitr
            date(2026, 4, 3),    # Vendredi saint
            date(2026, 5, 1),    # Fête du Travail
            date(2026, 5, 14),   # Ascension
            date(2026, 5, 20),   # Fête nationale
            date(2026, 5, 27),   # Aïd el-Adha (Tabaski)
            date(2026, 8, 15),   # Assomption
            date(2026, 12, 25),  # Noël
        })

    def test_jours_non_feries_au_cameroun(self):
        feries = self.calc.get_jours_feries(2026)
        for d, nom in ((date(2026, 4, 6), "lundi de Pâques"), (date(2026, 5, 25), "lundi de Pentecôte"),
                       (date(2026, 10, 1), "1er octobre")):
            with self.subTest(jour=nom):
                self.assertNotIn(d, feries)

    def test_fete_civile_un_dimanche_reportee_au_lundi(self):
        # 20 mai 2029 = dimanche → le lundi 21 mai est chômé
        self.assertEqual(date(2029, 5, 20).weekday(), 6)
        self.assertEqual(self.calc.est_jour_ferie(date(2029, 5, 21))["nom"],
                         "Fête nationale (report du dimanche)")

    def test_fete_religieuse_un_dimanche_non_reportee(self):
        # Noël 2022 = dimanche : pas de report (seules les fêtes civiles le sont)
        self.assertNotIn(date(2022, 12, 26), self.calc.get_jours_feries(2022))

    def test_ajustements_admin_ajout_et_retrait(self):
        # Aïd el-Fitr 2026 constaté le 21 mars au lieu du 20, et un « pont » décrété le 21 mai
        ajustements = {
            date(2026, 3, 20): SimpleNamespace(chome=False, nom="Aïd el-Fitr (date indicative)"),
            date(2026, 3, 21): SimpleNamespace(chome=True, nom="Aïd el-Fitr"),
            date(2026, 5, 21): SimpleNamespace(chome=True, nom="Pont — Fête nationale"),
        }
        with mock.patch.object(CalculateurConges, "_ajustements", return_value=ajustements):
            feries = CalculateurConges().get_jours_feries(2026)
        self.assertNotIn(date(2026, 3, 20), feries)
        self.assertIn(date(2026, 3, 21), feries)
        self.assertIn(date(2026, 5, 21), feries)


class MeresSalarieesTests(SimpleTestCase):
    """Art. 90 al. 2 et 3 : majorations déduites de la fiche employé."""

    def _droit(self, **fiche):
        employe = SimpleNamespace(date_naissance=None, **fiche)
        with mock.patch.object(CalculateurConges, "_get_date_embauche", return_value=date(2017, 1, 1)):
            return CalculateurConges().calculer_solde_annuel(employe, 2025, aujourd_hui=AU_15_JANVIER_2026)

    def test_cas_oit_mere_deux_enfants_de_moins_de_6_ans_8_ans_anciennete(self):
        # Guide du travailleur (OIT) : 6 enfants dont 2 de moins de 6 ans, 8 ans → 18 + 4 + 2 = 24
        d = self._droit(sexe="F", nb_enfants_moins_6_ans=2)
        self.assertEqual(d["anciennete_annees"], 8)
        self.assertEqual((d["jours_base"], d["majoration_enfants"], d["majoration_anciennete"]), (18, 4, 2))
        self.assertEqual(d["total_jours_droit"], 24)

    def test_pere_pas_de_majoration_enfants(self):
        d = self._droit(sexe="M", nb_enfants_moins_6_ans=2)
        self.assertEqual(d["majoration_enfants"], 0)
        self.assertEqual(d["total_jours_droit"], 20)

    def test_sexe_non_renseigne_pas_de_majoration(self):
        self.assertEqual(self._droit(sexe="", nb_enfants_moins_6_ans=2)["majoration_enfants"], 0)


class AllocationTests(SimpleTestCase):

    def test_fraction_1_16_vaut_trois_quarts_de_mois(self):
        # Art. 93 : 12 mois à 200 000 → 2 400 000 / 16 = 150 000 = 0,75 mois (18 j / 24 j ouvrables)
        self.assertEqual(Decimal("2400000") * CalculateurConges.FRACTION_ALLOCATION, Decimal("150000"))


class ControleSoldeApiTests(TestCase):
    """
    Demande de congé annuel : le solde disponible est le droit acquis sur la période de
    référence terminée (2025 → 18 j pour un départ en 2026), moins les jours pris ou en
    attente. Dépassement bloqué, sauf dérogation motivée d'un RH (tracée sur la demande).
    """

    @classmethod
    def setUpTestData(cls):
        from accounts.models import User
        from .models import TypeConge

        cls.annuel = TypeConge.objects.create(
            nom="Congé annuel", code="ANNUEL", jours_par_an=18,
            code_legal=TypeConge.CodeLegal.ANNUEL, deductible_conge_annuel=True,
        )
        embauche = timezone.make_aware(datetime(2022, 1, 1))   # 3 ans au 1er janvier 2025 : pas de majoration
        cls.employe = User.objects.create_user("employe.test", password="x", role="EMPLOYE",
                                               first_name="Awa", last_name="TEST")
        cls.rh = User.objects.create_user("rh.test", password="x", role="RH")
        User.objects.filter(pk__in=[cls.employe.pk, cls.rh.pk]).update(date_joined=embauche)
        cls.employe.refresh_from_db()

    def _client(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def _demander(self, user, debut, fin, **extra):
        data = {"type_conge": self.annuel.pk, "date_debut": debut, "date_fin": fin,
                "motif": "Congé annuel", "employe": self.employe.pk, **extra}
        return self._client(user).post("/api/conges/demandes/", data, format="json")

    def _solde(self):
        return self._client(self.employe).get("/api/conges/demandes/solde-detaille/?annee=2026").data

    def test_demande_dans_le_solde_acceptee_et_soldes_coherents(self):
        r = self._demander(self.employe, "2026-11-02", "2026-11-12")   # 10 jours ouvrables
        self.assertEqual(r.status_code, 201, r.data)
        solde = self._solde()
        self.assertEqual(solde["periode_reference"], 2025)
        self.assertEqual(solde["droit_calcule"]["total_jours_droit"], 18)
        self.assertEqual((solde["jours_en_attente"], solde["jours_restants"]), (10, 8))
        # La table des soldes affiche les mêmes chiffres que l'écran détaillé
        lignes = self._client(self.employe).get("/api/conges/soldes/?annee=2026").data
        lignes = lignes.get("results", lignes)
        annuel = next(l for l in lignes if l["type_conge"] == self.annuel.pk)
        self.assertEqual((float(annuel["jours_acquis"]), float(annuel["jours_en_attente"])), (18, 10))
        self.assertEqual(annuel["solde_restant"], 8)

    def test_depassement_refuse(self):
        r = self._demander(self.employe, "2026-11-02", "2026-11-23")   # 19 jours > 18
        self.assertEqual(r.status_code, 400)
        self.assertIn("Solde insuffisant", str(r.data))

    def test_jours_en_attente_comptent(self):
        self.assertEqual(self._demander(self.employe, "2026-11-02", "2026-11-12").status_code, 201)
        r = self._demander(self.employe, "2026-12-01", "2026-12-11")   # 10 jours, il en reste 8
        self.assertEqual(r.status_code, 400)

    def test_approbation_met_a_jour_le_solde(self):
        r = self._demander(self.employe, "2026-11-02", "2026-11-12")
        self._client(self.rh).post(f"/api/conges/demandes/{r.data['id']}/approuver/", {}, format="json")
        solde = self._solde()
        self.assertEqual((solde["jours_pris"], solde["jours_en_attente"], solde["jours_restants"]), (10, 0, 8))

    def test_derogation_rh_motivee_acceptee_et_tracee(self):
        r = self._demander(self.rh, "2026-11-02", "2026-11-23",
                           derogation_solde=True, motif_derogation="Accord de la direction (deuil)")
        self.assertEqual(r.status_code, 201, r.data)
        from .models import DemandeConge
        d = DemandeConge.objects.get(pk=r.data["id"])
        self.assertTrue(d.derogation_solde)
        self.assertEqual(d.derogation_par, self.rh)
        self.assertEqual(d.motif_derogation, "Accord de la direction (deuil)")

    def test_derogation_sans_motif_refusee(self):
        r = self._demander(self.rh, "2026-11-02", "2026-11-23", derogation_solde=True)
        self.assertEqual(r.status_code, 400)

    def test_employe_ne_peut_pas_s_accorder_une_derogation(self):
        r = self._demander(self.employe, "2026-11-02", "2026-11-23",
                           derogation_solde=True, motif_derogation="Je le veux")
        self.assertEqual(r.status_code, 400)
