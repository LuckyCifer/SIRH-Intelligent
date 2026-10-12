"""
CalculateurHeuresSupplementaires — Conformité Code du Travail camerounais
Décret n°95/677/PM du 18 décembre 1995 & Art. 80-81 Code du Travail.

Taux légaux — décret n° 95/677/PM, art. 12 (au-delà de 40 h/semaine, art. 13) :
  +20%  HS de jour — heures sup 1 à 8 de la semaine
  +30%  HS de jour — heures sup 9 à 16
  +40%  HS de jour — heures sup 17 à 20 (plafond légal : 60 h/semaine)
  +40%  HS un dimanche
  +50%  HS de nuit (22h–6h)
Jours fériés : AUCUN taux dans le décret ; la majoration relève de la convention
collective (TAUX_HS_FERIE est un paramètre conventionnel, à adapter par employeur).
Le cumul nuit + dimanche n'est pas réglé par le texte : on applique la priorité
férié > dimanche > nuit, sans addition des taux.
"""
from datetime import date, timedelta
from decimal import Decimal


class CalculateurHeuresSupplementaires:

    # ── Taux légaux (Décret 95/677/PM) ─────────────────────────────────────
    TAUX_HS_JOUR_8PREMIERES = Decimal("0.20")
    TAUX_HS_JOUR_AUDELÀ     = Decimal("0.30")   # heures 9 à 16
    TAUX_HS_JOUR_17_20      = Decimal("0.40")   # heures 17 à 20
    TAUX_HS_NUIT            = Decimal("0.50")
    TAUX_HS_DIMANCHE        = Decimal("0.40")
    TAUX_HS_FERIE           = Decimal("1.00")   # conventionnel (pas dans le décret)

    DUREE_LEGALE_SEMAINE    = Decimal("40")   # heures/semaine (Code du travail, art. 80)
    HEURES_MENSUELLES       = Decimal("520") / Decimal("3")   # 173 h 1/3 (décret, art. 14)

    # ── Jours fériés : source unique = conges.calculateur_conges ────────────

    def _calendrier(self):
        from conges.calculateur_conges import CalculateurConges
        return CalculateurConges()

    def get_jours_feries(self, annee):
        return self._calendrier().get_jours_feries(annee)

    def get_jours_feries_avec_noms(self, annee):
        return self._calendrier().get_jours_feries_avec_noms(annee)

    def est_jour_ferie(self, date_check):
        return self._calendrier().est_jour_ferie(date_check)

    # ── Taux horaire de base ─────────────────────────────────────────────────

    def calculer_taux_horaire(self, employe):
        """
        Taux horaire = Salaire catégoriel / 173 h 1/3.
        Base légale : décret 95/677/PM, art. 14 (diviseur pour 40 h/semaine).
        Exclut indemnités de transport/logement/représentation,
        prime d'ancienneté, paniers, outillage, assiduité.
        """
        try:
            from paie.models import BulletinPaie
            bulletin = (
                BulletinPaie.objects
                .filter(employe=employe, statut__in=["VALIDE", "GENERE"])
                .order_by("-annee", "-mois")
                .first()
            )
            if bulletin:
                if bulletin.salaire_categoriel and Decimal(str(bulletin.salaire_categoriel)) > 0:
                    base = Decimal(str(bulletin.salaire_categoriel))
                else:
                    base = Decimal(str(bulletin.salaire_brut or 0))
                return (base / self.HEURES_MENSUELLES).quantize(Decimal("0.01"))
        except Exception:
            pass
        return Decimal("0")

    # ── Répartition des HS de jour en tranches (art. 12) ─────────────────────

    @staticmethod
    def repartir_tranches(hs_totales):
        """Heures sup. de la semaine → (tranche 20 %, tranche 30 %, tranche 40 %) : 8 / 8 / reste."""
        hs = max(Decimal("0"), Decimal(str(hs_totales)))
        t20 = min(hs, Decimal("8"))
        t30 = min(max(Decimal("0"), hs - Decimal("8")), Decimal("8"))
        t40 = max(Decimal("0"), hs - Decimal("16"))
        return t20, t30, t40

    # ── Recalcul HS à la semaine ─────────────────────────────────────────────

    def recalculer_hs_semaine_employe(self, employe, reference_date):
        """
        Recalcule et stocke les HS (hs_jour_20, hs_jour_30, montant_hs_total)
        pour tous les pointages de la semaine ISO contenant reference_date.

        Règle : seules les heures normales (non ferie/dimanche/nuit) déclenchent
        le seuil de 40h/semaine. Les spéciales (ferie, dim, nuit) sont toujours
        majorées.
        """
        # Semaine ISO : lundi → dimanche
        debut = reference_date - timedelta(days=reference_date.weekday())
        fin   = debut + timedelta(days=6)

        from presences.models import Pointage  # import tardif (éviter circulaire)
        pointages = list(
            Pointage.objects.filter(
                employe=employe,
                date__range=[debut, fin],
            ).order_by("date")
        )

        if not pointages:
            return

        taux_horaire = self.calculer_taux_horaire(employe)

        # Somme des heures normales de la semaine
        total_normales = Decimal("0")
        for p in pointages:
            if not p.est_jour_ferie and not p.est_dimanche and not p.est_nuit:
                total_normales += Decimal(str(p.heures_travaillees or 0))

        hs_totales  = max(Decimal("0"), total_normales - self.DUREE_LEGALE_SEMAINE)
        pool_20, pool_30, pool_40 = self.repartir_tranches(hs_totales)

        updates = []
        for p in pointages:
            heures = Decimal(str(p.heures_travaillees or 0))

            # Distribution proportionnelle des HS de jour sur les pointages normaux
            p_hs_20 = Decimal("0")
            p_hs_30 = Decimal("0")
            p_hs_40 = Decimal("0")
            if (not p.est_jour_ferie and not p.est_dimanche
                    and not p.est_nuit and total_normales > 0):
                ratio    = heures / total_normales
                p_hs_20  = (pool_20 * ratio).quantize(Decimal("0.01"))
                p_hs_30  = (pool_30 * ratio).quantize(Decimal("0.01"))
                p_hs_40  = (pool_40 * ratio).quantize(Decimal("0.01"))

            # Recalculer les HS catégorielles (cohérence avec priorité ferie>dim>nuit)
            p_hs_nuit     = heures if (p.est_nuit and not p.est_jour_ferie and not p.est_dimanche) else Decimal("0")
            p_hs_dimanche = heures if (p.est_dimanche and not p.est_jour_ferie) else Decimal("0")
            p_hs_ferie    = heures if p.est_jour_ferie else Decimal("0")

            montant = (
                p_hs_20       * taux_horaire * self.TAUX_HS_JOUR_8PREMIERES +
                p_hs_30       * taux_horaire * self.TAUX_HS_JOUR_AUDELÀ     +
                p_hs_40       * taux_horaire * self.TAUX_HS_JOUR_17_20      +
                p_hs_nuit     * taux_horaire * self.TAUX_HS_NUIT             +
                p_hs_dimanche * taux_horaire * self.TAUX_HS_DIMANCHE         +
                p_hs_ferie    * taux_horaire * self.TAUX_HS_FERIE
            ).quantize(Decimal("0.01"))

            updates.append({
                "id":               p.id,
                "hs_jour_20":       p_hs_20,
                "hs_jour_30":       p_hs_30,
                "hs_jour_40":       p_hs_40,
                "hs_nuit":          p_hs_nuit,
                "hs_dimanche":      p_hs_dimanche,
                "hs_ferie":         p_hs_ferie,
                "montant_hs_total": montant,
            })

        # Bulk-update pour éviter de déclencher save() en boucle
        for u in updates:
            pk = u.pop("id")
            Pointage.objects.filter(pk=pk).update(**u)

