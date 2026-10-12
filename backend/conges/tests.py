"""
Tests du CalculateurConges — Code du travail camerounais (loi n° 92/007), art. 89 à 93.

Tests unitaires purs (SimpleTestCase) : aucune base de données n'est créée ;
la date d'embauche est fournie par mock et la date du jour est fixée.
Lancer :  python manage.py test conges
"""
from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase

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
    calc = CalculateurConges()

    def test_paques_et_fetes_mobiles_2026(self):
        self.assertEqual(self.calc._paques(2026), date(2026, 4, 5))
        feries = self.calc.get_jours_feries(2026)
        self.assertIn(date(2026, 4, 3), feries)    # Vendredi saint
        self.assertIn(date(2026, 5, 14), feries)   # Ascension

    def test_fetes_fixes(self):
        feries = self.calc.get_jours_feries(2026)
        for d in (date(2026, 1, 1), date(2026, 2, 11), date(2026, 5, 1),
                  date(2026, 5, 20), date(2026, 8, 15), date(2026, 12, 25)):
            with self.subTest(jour=d):
                self.assertIn(d, feries)


class AllocationTests(SimpleTestCase):

    def test_fraction_1_16_vaut_trois_quarts_de_mois(self):
        # Art. 93 : 12 mois à 200 000 → 2 400 000 / 16 = 150 000 = 0,75 mois (18 j / 24 j ouvrables)
        self.assertEqual(Decimal("2400000") * CalculateurConges.FRACTION_ALLOCATION, Decimal("150000"))
