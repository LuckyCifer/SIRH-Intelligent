"""
Tests des heures supplémentaires — décret n° 95/677/PM, art. 12 à 14.
Tests unitaires purs (SimpleTestCase) : aucune base de données n'est créée.
Lancer :  python manage.py test presences
"""
from decimal import Decimal

from django.test import SimpleTestCase

from .calculateur_hs import CalculateurHeuresSupplementaires as CHS

D = Decimal


class TranchesHeuresSupTests(SimpleTestCase):

    def test_repartition_8_8_reste(self):
        cas = {
            0:  (0, 0, 0),
            5:  (5, 0, 0),
            8:  (8, 0, 0),
            12: (8, 4, 0),
            16: (8, 8, 0),
            20: (8, 8, 4),     # 60 h/semaine : plafond légal
        }
        for hs, attendu in cas.items():
            with self.subTest(heures_sup=hs):
                self.assertEqual(CHS.repartir_tranches(hs), tuple(D(x) for x in attendu))

    def test_heures_negatives_ignorees(self):
        self.assertEqual(CHS.repartir_tranches(-3), (D(0), D(0), D(0)))


class TauxLegauxTests(SimpleTestCase):

    def test_taux_article_12(self):
        self.assertEqual(CHS.TAUX_HS_JOUR_8PREMIERES, D("0.20"))
        self.assertEqual(CHS.TAUX_HS_JOUR_AUDELÀ, D("0.30"))
        self.assertEqual(CHS.TAUX_HS_JOUR_17_20, D("0.40"))
        self.assertEqual(CHS.TAUX_HS_DIMANCHE, D("0.40"))
        self.assertEqual(CHS.TAUX_HS_NUIT, D("0.50"))

    def test_diviseur_article_14(self):
        self.assertEqual(CHS.HEURES_MENSUELLES, D(520) / D(3))
        self.assertEqual((D(300000) / CHS.HEURES_MENSUELLES).quantize(D("0.01")), D("1730.77"))

    def test_seuil_hebdomadaire_40h(self):
        self.assertEqual(CHS.DUREE_LEGALE_SEMAINE, D("40"))
