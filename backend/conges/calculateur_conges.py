"""
CalculateurConges — Conformité Code du Travail camerounais
Loi n°92/007 du 14 août 1992 — Articles 84, 89-93 (texte : OIT, bureau de Yaoundé).

  Art. 89 (1) 1,5 jour OUVRABLE par mois de service effectif. Jours ouvrables =
              tous les jours sauf le dimanche (repos hebdomadaire) et les jours fériés :
              18 jours ouvrables = 3 semaines.
  Art. 90 (1) 2,5 jours par mois pour les moins de 18 ans
  Art. 90 (2) mères salariées : +2 jours ouvrables par enfant de moins de 6 ans,
              ou +1 jour seulement si le congé principal n'excède pas 6 jours
  Art. 90 (3) ancienneté : +2 jours ouvrables par période entière de 5 ans de service
  Art. 92 (1) droit de jouissance acquis après 1 an de service
  Art. 93     allocation fixée par décret : 1/16 de la rémunération de la période
              de référence (= 0,75 mois pour 12 mois, cohérent avec 18 j / 24 j ouvrables)
"""
from datetime import date, timedelta
from decimal import Decimal


class CalculateurConges:
    # Art. 89 — taux d'accumulation mensuel
    JOURS_PAR_MOIS = Decimal("1.5")
    JOURS_PAR_MOIS_MOINS_18 = Decimal("2.5")

    # Art. 90 (2) — mères salariées
    JOURS_ENFANT_CHARGE        = 2
    JOURS_ENFANT_CONGE_COURT   = 1    # si le congé principal ≤ 6 jours
    SEUIL_CONGE_COURT          = 6
    # Art. 90 (3) — ancienneté
    JOURS_PAR_TRANCHE_ANCIENNETE = 2
    ANNEES_PAR_TRANCHE           = 5
    AGE_MAJORITE                 = 18

    # Jours ouvrables : lundi (0) → samedi (5) ; date de retour : jours travaillés lun → ven
    DIMANCHE = 6

    # Art. 93 — allocation de congé
    FRACTION_ALLOCATION = Decimal("1") / Decimal("16")

    # Jours fériés fixes camerounais (jour, mois)
    FERIES_FIXES = [
        (1,  1),   # Jour de l'An
        (11, 2),   # Fête de la Jeunesse
        (1,  5),   # Fête du Travail
        (20, 5),   # Fête Nationale
        (15, 8),   # Assomption
        (1,  10),  # Fête de l'Unité Nationale
        (25, 12),  # Noël
    ]

    # Dates approximatives des Aïds (Aïd el-Fitr, Aïd el-Adha)
    AID_DATES = {
        2024: [date(2024, 4, 10), date(2024, 6, 16)],
        2025: [date(2025, 3, 30), date(2025, 6,  6)],
        2026: [date(2026, 3, 20), date(2026, 5, 27)],
        2027: [date(2027, 3,  9), date(2027, 5, 16)],
        2028: [date(2028, 3, 28), date(2028, 5,  4)],
        2029: [date(2029, 3, 18), date(2029, 4, 23)],
        2030: [date(2030, 3,  7), date(2030, 4, 12)],
    }

    # ── Jours fériés ────────────────────────────────────────────────────────

    def _paques(self, annee):
        """Algorithme de Butcher — date de Pâques (calendrier grégorien)."""
        a = annee % 19
        b = annee // 100
        c = annee % 100
        d = b // 4
        e = b % 4
        f = (b + 8) // 25
        g = (b - f + 1) // 3
        h = (19 * a + b - d - g + 15) % 30
        i = c // 4
        k = c % 4
        l = (32 + 2 * e + 2 * i - h - k) % 7
        m = (a + 11 * h + 22 * l) // 451
        mois = (h + l - 7 * m + 114) // 31
        jour = ((h + l - 7 * m + 114) % 31) + 1
        return date(annee, mois, jour)

    def get_jours_feries(self, annee):
        """Retourne un set de date pour tous les jours fériés de l'année."""
        feries = set()

        for jour, mois in self.FERIES_FIXES:
            feries.add(date(annee, mois, jour))

        # Jours mobiles liés à Pâques
        paques = self._paques(annee)
        feries.add(paques - timedelta(days=2))   # Vendredi Saint
        feries.add(paques + timedelta(days=1))   # Lundi de Pâques
        feries.add(paques + timedelta(days=39))  # Ascension (Jeudi)
        feries.add(paques + timedelta(days=50))  # Lundi de Pentecôte

        # Aïds
        for d in self.AID_DATES.get(annee, []):
            feries.add(d)

        return feries

    def get_jours_feries_periode(self, date_debut, date_fin):
        """Retourne le set de fériés couvrant toute la période."""
        feries = self.get_jours_feries(date_debut.year)
        if date_fin.year != date_debut.year:
            feries |= self.get_jours_feries(date_fin.year)
        return feries

    # ── Calculs jours ouvrables ─────────────────────────────────────────────

    def calculer_jours_ouvrables(self, date_debut, date_fin):
        """
        Compte les jours ouvrables entre date_debut et date_fin (inclus) — art. 89.
        Exclut les dimanches et les jours fériés camerounais (le samedi est ouvrable).
        """
        feries = self.get_jours_feries_periode(date_debut, date_fin)
        count  = 0
        cur    = date_debut
        while cur <= date_fin:
            if cur.weekday() != self.DIMANCHE and cur not in feries:
                count += 1
            cur += timedelta(days=1)
        return count

    def calculer_date_retour(self, date_fin):
        """
        Retourne le premier jour ouvrable qui suit date_fin
        (premier jour de reprise après le congé).
        """
        feries = self.get_jours_feries(date_fin.year)
        retour = date_fin + timedelta(days=1)
        # Étendre aux fériés de l'année suivante si on déborde
        if retour.year != date_fin.year:
            feries |= self.get_jours_feries(retour.year)
        while retour.weekday() >= 5 or retour in feries:
            retour += timedelta(days=1)
            if retour.year not in {date_fin.year, date_fin.year + 1}:
                feries |= self.get_jours_feries(retour.year)
        return retour

    def lister_feries_pendant_conge(self, date_debut, date_fin):
        """Retourne la liste des jours fériés tombant un jour ouvrable pendant le congé."""
        feries = self.get_jours_feries_periode(date_debut, date_fin)
        result = []
        cur = date_debut
        while cur <= date_fin:
            if cur.weekday() != self.DIMANCHE and cur in feries:
                result.append(cur)
            cur += timedelta(days=1)
        return result

    # ── Solde légal annuel ──────────────────────────────────────────────────

    def calculer_solde_annuel(self, employe, annee, nb_enfants=0, aujourd_hui=None):
        """
        Calcule le droit au congé annuel (art. 89-90) pour un employé.
        nb_enfants : enfants de moins de 6 ans d'une MÈRE salariée (art. 90 al. 2) ;
        à laisser à 0 pour les autres salariés.
        Returns:
            dict: jours_base, majoration_enfants, majoration_anciennete,
                  total_jours_droit, mois_travailles, anciennete_annees, taux_mensuel
        """
        aujourd_hui = aujourd_hui or date.today()
        date_embauche = self._get_date_embauche(employe)
        mois_travailles = self._calculer_mois_travailles(date_embauche, annee, aujourd_hui)

        # Art. 89 / 90 (1) — 1,5 j/mois, 2,5 j/mois pour les moins de 18 ans
        fin_reference = min(date(annee, 12, 31), aujourd_hui)
        age = self._age(getattr(employe, "date_naissance", None), fin_reference)
        taux = (self.JOURS_PAR_MOIS_MOINS_18
                if age is not None and age < self.AGE_MAJORITE else self.JOURS_PAR_MOIS)

        jours_base = int(Decimal(str(mois_travailles)) * taux)  # arrondi inférieur

        # Art. 90 (2) — mères : +2 j par enfant de moins de 6 ans, +1 j seulement si congé ≤ 6 j
        if nb_enfants <= 0:
            majoration_enfants = 0
        elif jours_base <= self.SEUIL_CONGE_COURT:
            majoration_enfants = self.JOURS_ENFANT_CONGE_COURT
        else:
            majoration_enfants = nb_enfants * self.JOURS_ENFANT_CHARGE

        # Art. 90 (3) — ancienneté : +2 j par période entière de 5 ans
        anciennete = self._get_anciennete_annees(date_embauche, annee)
        majoration_anciennete = (anciennete // self.ANNEES_PAR_TRANCHE) * self.JOURS_PAR_TRANCHE_ANCIENNETE

        total = jours_base + majoration_enfants + majoration_anciennete

        return {
            "mois_travailles":      mois_travailles,
            "jours_base":           jours_base,
            "taux_mensuel":         float(taux),
            "majoration_enfants":   majoration_enfants,
            "nb_enfants":           nb_enfants,
            "majoration_anciennete": majoration_anciennete,
            "anciennete_annees":    anciennete,
            "total_jours_droit":    total,
        }

    # ── Éligibilité (Art. 92 — 12 mois de service) ─────────────────────────

    def verifier_droit_conge(self, employe, aujourd_hui=None):
        """
        Art. 92 : Le droit au congé est acquis après 12 mois de service.
        Returns: {'eligible': bool, 'mois_travailles': int, 'mois_restants': int}
        """
        date_embauche = self._get_date_embauche(employe)
        if date_embauche is None:
            return {"eligible": True, "mois_travailles": 12, "mois_restants": 0}

        today = aujourd_hui or date.today()
        mois  = max(0, self._mois_complets(date_embauche, today))
        eligible      = mois >= 12
        mois_restants = max(0, 12 - mois)
        return {
            "eligible":       eligible,
            "mois_travailles": mois,
            "mois_restants":  mois_restants,
        }

    # ── Allocation de congé (Art. 93) ───────────────────────────────────────

    def calculer_allocation_conge(self, employe, nb_mois=12):
        """
        Art. 93 : Allocation = (1/16) × salaire total sur nb_mois de référence.
        Utilise les bulletins de paie disponibles.
        """
        try:
            from paie.models import BulletinPaie
        except ImportError:
            return Decimal("0")

        bulletins = (
            BulletinPaie.objects
            .filter(employe=employe, statut__in=["VALIDE", "GENERE"])
            .order_by("-annee", "-mois")[:nb_mois]
        )
        salaire_total = Decimal("0")
        for b in bulletins:
            if hasattr(b, "total_brut") and b.total_brut:
                salaire_total += Decimal(str(b.total_brut))
            else:
                salaire_total += (
                    Decimal(str(b.salaire_brut or 0))
                    + Decimal(str(b.total_primes or 0))
                )
        return (salaire_total * self.FRACTION_ALLOCATION).quantize(Decimal("1"))

    # ── Helpers privés ──────────────────────────────────────────────────────

    def _get_date_embauche(self, employe):
        """Tente de retrouver la date d'embauche via le contrat le plus ancien."""
        try:
            from contrats.models import Contrat
            contrat = (
                Contrat.objects
                .filter(employe=employe)
                .order_by("date_debut")
                .first()
            )
            if contrat and contrat.date_debut:
                return contrat.date_debut
        except Exception:
            pass
        # Fallback : date_joined Django
        if getattr(employe, "date_joined", None):
            return employe.date_joined.date()
        return None

    @staticmethod
    def _mois_complets(debut, fin_exclue):
        """Mois entiers entre debut (inclus) et fin_exclue : 01/01 → 01/01 suivant = 12."""
        mois = (fin_exclue.year - debut.year) * 12 + fin_exclue.month - debut.month
        if fin_exclue.day < debut.day:
            mois -= 1
        return mois

    @staticmethod
    def _age(date_naissance, a_la_date):
        if not date_naissance:
            return None
        age = a_la_date.year - date_naissance.year
        if (a_la_date.month, a_la_date.day) < (date_naissance.month, date_naissance.day):
            age -= 1
        return age

    def _calculer_mois_travailles(self, date_embauche, annee, aujourd_hui=None):
        """Nombre de mois complets travaillés dans l'année (max 12)."""
        debut_periode = date(annee, 1, 1)
        if date_embauche and date_embauche > debut_periode:
            debut_periode = date_embauche

        fin_effective = min(date(annee, 12, 31), aujourd_hui or date.today())

        if debut_periode > fin_effective:
            return 0

        mois = self._mois_complets(debut_periode, fin_effective + timedelta(days=1))
        return min(12, max(0, mois))

    def _get_anciennete_annees(self, date_embauche, annee):
        """Années d'ancienneté complètes au 1er janvier de l'année."""
        if date_embauche is None:
            return 0
        ref = date(annee, 1, 1)
        if date_embauche >= ref:
            return 0
        annees = ref.year - date_embauche.year
        # Déduire 1 si l'anniversaire n'est pas encore atteint
        if (date_embauche.month, date_embauche.day) > (ref.month, ref.day):
            annees -= 1
        return max(0, annees)
