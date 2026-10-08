"""
Tests du CalculateurPaie — fiscalité et cotisations sociales Cameroun.

Tests unitaires purs (SimpleTestCase) : aucune base de données n'est créée.
Lancer :  python manage.py test paie
"""
from decimal import Decimal
from types import SimpleNamespace

from django.test import SimpleTestCase

from .calculateur import CalculateurPaie

D = Decimal


def bulletin(**champs):
    """Bulletin minimal : tous les éléments de paie à 0 sauf ceux fournis."""
    base = dict(
        salaire_categoriel=0, sursalaire=0, prime_anciennete=0,
        prime_responsabilite=0, prime_assiduite=0, prime_rendement=0,
        gratification=0, avantages_nature=0,
        nb_heures_sup_20=0, nb_heures_sup_30=0, nb_heures_sup_40=0,
        nb_heures_sup_50=0, taux_horaire=0,
        indemnite_transport=0, indemnite_logement=0,
        indemnite_representation=0, allocations_familiales=0,
        avances_salaire=0, autres_retenues=0,
    )
    base.update(champs)
    return SimpleNamespace(**base)


class BulletinDeReferenceTests(SimpleTestCase):
    """
    Bulletin calculé à la main (voir docs/BULLETIN_PAIE_PAS_A_PAS.md).

    Salaire catégoriel 300 000 · ancienneté 2 ans · prime de responsabilité 20 000
    · indemnité de transport 25 000 (non imposable).
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        calc = CalculateurPaie()
        cls.b = bulletin(
            salaire_categoriel=300_000,
            prime_anciennete=calc.calculer_prime_anciennete(300_000, 2),  # 2 % × 2 ans
            prime_responsabilite=20_000,
            indemnite_transport=25_000,
        )
        calc.calculer(cls.b)

    def test_1_bruts(self):
        self.assertEqual(self.b.prime_anciennete, D("12000"))         # 300 000 × 2 % × 2
        self.assertEqual(self.b.salaire_brut_imposable, D("332000"))  # 300 000 + 12 000 + 20 000
        self.assertEqual(self.b.total_brut, D("357000"))              # + 25 000 transport

    def test_2_cnps(self):
        self.assertEqual(self.b.salaire_brut_cotisable, D("332000"))  # < plafond 750 000
        self.assertEqual(self.b.cnps_employe, D("13944"))             # 332 000 × 4,2 %
        self.assertEqual(self.b.cnps_patronal_pension, D("13944"))    # 332 000 × 4,2 %
        self.assertEqual(self.b.cnps_patronal_famille, D("23240"))    # 332 000 × 7 %
        self.assertEqual(self.b.cnps_patronal_at, D("5810"))          # 332 000 × 1,75 %

    def test_3_irpp_et_cac(self):
        # SNC = 332 000 × 70 % − 13 944 − 41 667 = 176 789
        self.assertEqual(self.b.revenu_net_categoriel, D("176789"))
        # 166 667 × 10 % + (176 789 − 166 667) × 15 % = 16 666,7 + 1 518,3 = 18 185
        self.assertEqual(self.b.irpp, D("18185"))
        self.assertEqual(self.b.cac, D("1819"))                        # 18 185 × 10 % = 1 818,5

    def test_4_cfc_fne(self):
        self.assertEqual(self.b.cfc_salarie, D("3320"))               # 332 000 × 1 %
        self.assertEqual(self.b.cfc_patronal, D("4980"))              # 332 000 × 1,5 %
        self.assertEqual(self.b.fne, D("3320"))                       # 332 000 × 1 %

    def test_5_forfaits(self):
        self.assertEqual(self.b.rav, D("4550"))   # brut 357 000 ∈ ]300 000 ; 400 000]
        self.assertEqual(self.b.tdl, D("2000"))   # base 300 000 ∈ ]250 000 ; 300 000]

    def test_6_net_a_payer(self):
        # 13 944 + 18 185 + 1 819 + 3 320 + 4 550 + 2 000
        self.assertEqual(self.b.total_retenues, D("43818"))
        self.assertEqual(self.b.salaire_net, D("313182"))              # 357 000 − 43 818

    def test_7_cout_employeur(self):
        # 357 000 + 13 944 + 23 240 + 5 810 + 4 980 + 3 320 (transport compté une seule fois)
        self.assertEqual(self.b.cout_total_employeur, D("408294"))


class CnpsTests(SimpleTestCase):
    calc = CalculateurPaie()

    def test_plafond_750000(self):
        cnps = self.calc.calculer_cnps(D("1000000"))
        self.assertEqual(cnps["base"], D("750000"))
        self.assertEqual(cnps["salarie"], D("31500"))                 # 750 000 × 4,2 %
        self.assertEqual(cnps["patronal_famille"], D("52500"))        # 750 000 × 7 %

    def test_cfc_et_fne_non_plafonnes(self):
        b = bulletin(salaire_categoriel=1_000_000)
        self.calc.calculer(b)
        self.assertEqual(b.cnps_employe, D("31500"))                  # plafonné
        self.assertEqual(b.cfc_salarie, D("10000"))                   # 1 000 000 × 1 %, pas 7 500
        self.assertEqual(b.cfc_patronal, D("15000"))
        self.assertEqual(b.fne, D("10000"))


class IrppTests(SimpleTestCase):
    calc = CalculateurPaie()

    def test_petit_salaire_exonere(self):
        # 60 000 × 70 % − 2 520 − 41 667 < 0 → aucun impôt
        irpp = self.calc.calculer_irpp(D("60000"), D("2520"))
        self.assertEqual((irpp["snc"], irpp["irpp"], irpp["cac"]), (D("0"), D("0"), D("0")))

    def test_premiere_tranche(self):
        # SNC = 200 000 × 70 % − 0 − 41 667 = 98 333 → 10 %
        irpp = self.calc.calculer_irpp(D("200000"), D("0"))
        self.assertEqual(irpp["snc"], D("98333"))
        self.assertEqual(irpp["irpp"], D("9833"))

    def test_quatre_tranches(self):
        # SNC = 773 810 × 70 % − 41 667 = 500 000
        # 16 666,7 + 12 500 + 41 666,75 + 29 166,55 = 100 000
        irpp = self.calc.calculer_irpp(D("773810"), D("0"))
        self.assertEqual(irpp["snc"], D("500000"))
        self.assertEqual(irpp["irpp"], D("100000"))
        self.assertEqual(irpp["cac"], D("10000"))

    def test_plafond_frais_professionnels(self):
        # LF 2024 : 30 % plafonné à 400 000/mois. SBT 2 000 000 → abattement 400 000 (et non 600 000)
        # SNC = 2 000 000 − 400 000 − 31 500 − 41 667 = 1 526 833
        irpp = self.calc.calculer_irpp(D("2000000"), D("31500"))
        self.assertEqual(irpp["snc"], D("1526833"))

    def test_frais_professionnels_sous_le_plafond(self):
        # 1 000 000 × 30 % = 300 000 < 400 000 → abattement entier
        irpp = self.calc.calculer_irpp(D("1000000"), D("0"))
        self.assertEqual(irpp["snc"], D("658333"))   # 1 000 000 − 300 000 − 41 667

    def test_abattement_mensuel(self):
        self.assertEqual(CalculateurPaie.ABATTEMENT_MENSUEL, D("41667"))  # 500 000 / 12


class ForfaitsTests(SimpleTestCase):
    calc = CalculateurPaie()

    def test_rav_bornes(self):
        cas = {
            50_000: 0, 50_001: 750, 100_000: 750, 100_001: 1_950,
            300_000: 3_250, 300_001: 4_550, 1_000_000: 12_350, 1_000_001: 13_000,
        }
        for brut, attendu in cas.items():
            with self.subTest(brut=brut):
                self.assertEqual(self.calc.calculer_rav(D(brut)), D(attendu))

    def test_tdl_bornes(self):
        cas = {
            62_000: 0, 62_001: 250, 75_000: 250, 75_001: 500,
            150_001: 1_250, 300_001: 2_250, 500_000: 2_250, 500_001: 2_500, 2_000_000: 2_500,
        }
        for base, attendu in cas.items():
            with self.subTest(base=base):
                self.assertEqual(self.calc.calculer_tdl(D(base)), D(attendu))


class ElementsDuBrutTests(SimpleTestCase):
    calc = CalculateurPaie()

    def test_prime_anciennete(self):
        cas = {0: 0, 1: 0, 2: 12_000, 3: 18_000, 10: 60_000}   # base 300 000
        for annees, attendu in cas.items():
            with self.subTest(annees=annees):
                self.assertEqual(self.calc.calculer_prime_anciennete(300_000, annees), D(attendu))

    def test_heures_supplementaires_decret_95_677(self):
        # Art. 12 : heure payée + 20 / 30 / 40 / 50 %
        hs = self.calc.calculer_heures_sup(8, 8, 4, 2, 2_000)
        self.assertEqual(hs["h20"], D("19200"))   # 8 h × 2 000 × 1,20
        self.assertEqual(hs["h30"], D("20800"))   # 8 h × 2 000 × 1,30
        self.assertEqual(hs["h40"], D("11200"))   # 4 h × 2 000 × 1,40
        self.assertEqual(hs["h50"], D("6000"))    # 2 h × 2 000 × 1,50
        self.assertEqual(hs["total"], D("57200"))

    def test_taux_horaire_diviseur_173_un_tiers(self):
        # Art. 14 : 300 000 / (520/3) = 1 730,77 ; 1 h à +20 % = 2 076,92 → 2 077
        th = self.calc.calculer_taux_horaire(300_000)
        self.assertEqual(th, D("1730.77"))
        self.assertEqual(self.calc.calculer_heures_sup(1, 0, 0, 0, th)["h20"], D("2077"))

    def test_heures_sup_dans_le_brut_cotisable(self):
        b = bulletin(salaire_categoriel=200_000, nb_heures_sup_20=8, taux_horaire=1_000)
        self.calc.calculer(b)
        self.assertEqual(b.salaire_brut_imposable, D("209600"))   # + 8 × 1 000 × 1,20
        self.assertEqual(b.details["heures_sup_20"], "9600")

    def test_indemnites_non_imposables_hors_cotisations(self):
        b = bulletin(salaire_categoriel=200_000, indemnite_transport=30_000,
                     indemnite_logement=50_000)
        self.calc.calculer(b)
        self.assertEqual(b.salaire_brut_imposable, D("200000"))
        self.assertEqual(b.total_brut, D("280000"))
        self.assertEqual(b.cnps_employe, D("8400"))   # sur 200 000 seulement

    def test_net_jamais_negatif(self):
        b = bulletin(salaire_categoriel=100_000, avances_salaire=500_000)
        self.calc.calculer(b)
        self.assertEqual(b.salaire_net, D("0"))
