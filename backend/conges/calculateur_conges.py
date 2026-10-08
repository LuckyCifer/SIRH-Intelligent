"""
CalculateurConges — Conformité Code du Travail camerounais
Loi n°92/007 du 14 août 1992 — Articles 84, 89-93.
"""
from datetime import date, timedelta
from decimal import Decimal


class CalculateurConges:
    # Art. 89 — taux d'accumulation mensuel
    JOURS_PAR_MOIS = Decimal("1.5")
    JOURS_PAR_MOIS_MOINS_18 = Decimal("2.5")

    # Art. 90 — mères de famille
    JOURS_ENFANT_CHARGE = 2
    MAX_JOURS_ENFANTS   = 10

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
        Compte les jours ouvrables entre date_debut et date_fin (inclus).
        Exclut samedis, dimanches et jours fériés camerounais.
        """
        feries = self.get_jours_feries_periode(date_debut, date_fin)
        count  = 0
        cur    = date_debut
        while cur <= date_fin:
            if cur.weekday() < 5 and cur not in feries:
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
        """Retourne la liste des jours fériés (semaine) tombant pendant le congé."""
        feries = self.get_jours_feries_periode(date_debut, date_fin)
        result = []
        cur = date_debut
        while cur <= date_fin:
            if cur.weekday() < 5 and cur in feries:
                result.append(cur)
            cur += timedelta(days=1)
        return result

    # ── Solde légal annuel ──────────────────────────────────────────────────

    def calculer_solde_annuel(self, employe, annee, nb_enfants=0):
        """
        Calcule le droit au congé annuel (Art. 89-91) pour un employé.
        Returns:
            dict: jours_base, majoration_enfants, majoration_anciennete,
                  total_jours_droit, mois_travailles, anciennete_annees, taux_mensuel
        """
        date_embauche = self._get_date_embauche(employe)
        mois_travailles = self._calculer_mois_travailles(date_embauche, annee)

        # Art. 89 — taux selon âge (pas de champ dob disponible → on suppose > 18 ans)
        taux = self.JOURS_PAR_MOIS

        jours_base = int(Decimal(str(mois_travailles)) * taux)  # arrondi inférieur

        # Art. 90 — majoration enfants (mères avec enfants < 6 ans)
        majoration_enfants = min(nb_enfants * self.JOURS_ENFANT_CHARGE, self.MAX_JOURS_ENFANTS)

        # Art. 91 — majoration ancienneté (+1j par tranche de 5 ans)
        anciennete = self._get_anciennete_annees(date_embauche, annee)
        majoration_anciennete = anciennete // 5

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

    def verifier_droit_conge(self, employe):
        """
        Art. 92 : Le droit au congé est acquis après 12 mois de service continu.
        Returns: {'eligible': bool, 'mois_travailles': int, 'mois_restants': int}
        """
        date_embauche = self._get_date_embauche(employe)
        if date_embauche is None:
            return {"eligible": True, "mois_travailles": 12, "mois_restants": 0}

        today = date.today()
        mois  = (today.year - date_embauche.year) * 12 + today.month - date_embauche.month
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

    def _calculer_mois_travailles(self, date_embauche, annee):
        """Nombre de mois complets travaillés dans l'année (max 12)."""
        debut_periode = date(annee, 1, 1)
        if date_embauche and date_embauche > debut_periode:
            debut_periode = date_embauche

        fin_effective = min(date(annee, 12, 31), date.today())

        if debut_periode > fin_effective:
            return 0

        mois = (
            (fin_effective.year - debut_periode.year) * 12
            + fin_effective.month - debut_periode.month
        )
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
