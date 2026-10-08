"""
CalculateurPaie — Conformité fiscale Cameroun 2026.

Taux applicables :
  CNPS salarié        4,2 %  (plafonné à 750 000 FCFA/mois)
  CNPS patronal pension 4,2 %
  CNPS patronal famille 7,0 %
  CNPS patronal AT      1,75 % (risque A, défaut)
  CFC salarié         1,0 %
  CFC patronal        1,5 %
  FNE                 1,0 %
  IRPP sur SNC (tranches) + CAC 10 %
  RAV et TDL : forfaits par tranche de revenu
"""
from decimal import Decimal, ROUND_HALF_UP


class CalculateurPaie:
    # ── Taux CNPS ─────────────────────────────────────────────────────────────
    PLAFOND_CNPS               = Decimal("750000")
    TAUX_CNPS_SALARIE          = Decimal("0.042")
    TAUX_CNPS_PATRONAL_PENSION = Decimal("0.042")
    TAUX_CNPS_PATRONAL_FAMILLE = Decimal("0.07")
    TAUX_CNPS_PATRONAL_AT_A    = Decimal("0.0175")   # risque A (défaut)
    TAUX_CNPS_PATRONAL_AT_B    = Decimal("0.025")    # risque B
    TAUX_CNPS_PATRONAL_AT_C    = Decimal("0.05")     # risque C

    # ── CFC & FNE ─────────────────────────────────────────────────────────────
    TAUX_CFC_SALARIE  = Decimal("0.01")
    TAUX_CFC_PATRONAL = Decimal("0.015")
    TAUX_FNE          = Decimal("0.01")

    # ── IRPP ──────────────────────────────────────────────────────────────────
    TAUX_CAC             = Decimal("0.10")
    ABATTEMENT_FRAIS_PRO = Decimal("0.30")
    # Abattement forfaitaire annuel / 12 → 41 667 FCFA
    ABATTEMENT_MENSUEL   = (Decimal("500000") / Decimal("12")).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )

    # Tranches IRPP mensuel sur SNC — (plafond, taux marginal), None = pas de plafond
    IRPP_TRANCHES = [
        (Decimal("166667"), Decimal("0.10")),
        (Decimal("250000"), Decimal("0.15")),
        (Decimal("416667"), Decimal("0.25")),
        (None,              Decimal("0.35")),
    ]

    # ── RAV (taxe radio-télévision) ───────────────────────────────────────────
    # (seuil_min_exclu, forfait) — parcourir du plus bas au plus haut
    RAV_TRANCHES = [
        (Decimal("0"),        Decimal("0")),
        (Decimal("61999"),    Decimal("650")),
        (Decimal("100000"),   Decimal("1300")),
        (Decimal("200000"),   Decimal("1625")),
        (Decimal("300000"),   Decimal("1950")),
        (Decimal("500000"),   Decimal("2600")),
        (Decimal("1000000"),  Decimal("3250")),
    ]

    # ── TDL (taxe développement local) ───────────────────────────────────────
    TDL_TRANCHES = [
        (Decimal("0"),        Decimal("0")),
        (Decimal("61999"),    Decimal("1000")),
        (Decimal("100000"),   Decimal("2500")),
        (Decimal("300000"),   Decimal("4500")),
        (Decimal("500000"),   Decimal("7200")),
        (Decimal("1000000"),  Decimal("10800")),
    ]

    # ── Divers ────────────────────────────────────────────────────────────────
    SMIG               = Decimal("43969")
    TAUX_ANCIENNETE_AN = Decimal("0.02")

    # ── Utilitaires ───────────────────────────────────────────────────────────

    @staticmethod
    def _D(val) -> Decimal:
        if val is None:
            return Decimal("0")
        return Decimal(str(val))

    def _round(self, val) -> Decimal:
        return Decimal(str(val)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

    def _forfait(self, montant: Decimal, tranches: list) -> Decimal:
        """Retourne le forfait de la dernière tranche dont le seuil < montant."""
        result = Decimal("0")
        for seuil, forfait in tranches:
            if montant > seuil:
                result = forfait
            else:
                break
        return result

    # ── Méthodes de calcul ────────────────────────────────────────────────────

    def calculer_prime_anciennete(self, salaire_categoriel, annees: int) -> Decimal:
        """2 % par an × salaire catégoriel."""
        return self._round(self._D(salaire_categoriel) * self.TAUX_ANCIENNETE_AN * annees)

    def calculer_heures_sup(self, nb_h25, nb_h40, taux_horaire) -> dict:
        th  = self._D(taux_horaire)
        h25 = self._round(self._D(nb_h25) * th * Decimal("1.25"))
        h40 = self._round(self._D(nb_h40) * th * Decimal("1.40"))
        return {"h25": h25, "h40": h40, "total": h25 + h40}

    def calculer_brut(self, b) -> dict:
        """
        Éléments imposables/cotisables → SBT.
        Éléments non cotisables (transport, logement, représentation, alloc.) → total_brut.
        """
        hs = self.calculer_heures_sup(b.nb_heures_sup_25, b.nb_heures_sup_40, b.taux_horaire)
        sbt = (self._D(b.salaire_categoriel)
               + self._D(b.sursalaire)
               + self._D(b.prime_anciennete)
               + self._D(b.prime_responsabilite)
               + self._D(b.prime_assiduite)
               + self._D(b.prime_rendement)
               + self._D(b.gratification)
               + hs["total"]
               + self._D(b.avantages_nature))
        non_imposable = (self._D(b.indemnite_transport)
                        + self._D(b.indemnite_logement)
                        + self._D(b.indemnite_representation)
                        + self._D(b.allocations_familiales))
        return {
            "sbt":           self._round(sbt),
            "non_imposable": self._round(non_imposable),
            "total_brut":    self._round(sbt + non_imposable),
            "heures_sup_25": hs["h25"],
            "heures_sup_40": hs["h40"],
        }

    def calculer_cnps(self, sbt: Decimal) -> dict:
        base = min(sbt, self.PLAFOND_CNPS)
        return {
            "base":             base,
            "salarie":          self._round(base * self.TAUX_CNPS_SALARIE),
            "patronal_pension": self._round(base * self.TAUX_CNPS_PATRONAL_PENSION),
            "patronal_famille": self._round(base * self.TAUX_CNPS_PATRONAL_FAMILLE),
            "patronal_at":      self._round(base * self.TAUX_CNPS_PATRONAL_AT_A),
        }

    def calculer_irpp(self, sbt: Decimal, cnps_salarie: Decimal) -> dict:
        """SNC = SBT × 0,70 − CNPS_salarié − 500 000/12."""
        snc = sbt * (Decimal("1") - self.ABATTEMENT_FRAIS_PRO) - cnps_salarie - self.ABATTEMENT_MENSUEL
        snc = self._round(snc)
        if snc <= 0:
            return {"snc": Decimal("0"), "irpp": Decimal("0"), "cac": Decimal("0")}

        irpp = Decimal("0")
        prev = Decimal("0")
        for plafond, taux in self.IRPP_TRANCHES:
            borne = min(snc, plafond) if plafond is not None else snc
            if borne <= prev:
                break
            irpp += (borne - prev) * taux
            prev = plafond if plafond is not None else snc
            if plafond is None or snc <= plafond:
                break

        irpp = self._round(irpp)
        cac  = self._round(irpp * self.TAUX_CAC)
        return {"snc": snc, "irpp": irpp, "cac": cac}

    def calculer_cfc(self, base: Decimal) -> dict:
        return {
            "salarie":  self._round(base * self.TAUX_CFC_SALARIE),
            "patronal": self._round(base * self.TAUX_CFC_PATRONAL),
        }

    def calculer_rav(self, total_brut: Decimal) -> Decimal:
        return self._forfait(total_brut, self.RAV_TRANCHES)

    def calculer_tdl(self, salaire_categoriel: Decimal) -> Decimal:
        return self._forfait(salaire_categoriel, self.TDL_TRANCHES)

    # ── Orchestrateur principal ───────────────────────────────────────────────

    def calculer(self, bulletin):
        """Remplit tous les champs calculés du bulletin en place. Appeler save() ensuite."""
        brut_d     = self.calculer_brut(bulletin)
        sbt        = brut_d["sbt"]
        total_brut = brut_d["total_brut"]

        cnps_d = self.calculer_cnps(sbt)
        irpp_d = self.calculer_irpp(sbt, cnps_d["salarie"])
        cfc_d  = self.calculer_cfc(cnps_d["base"])
        fne    = self._round(cnps_d["base"] * self.TAUX_FNE)
        rav    = self.calculer_rav(total_brut)
        tdl    = self.calculer_tdl(self._D(bulletin.salaire_categoriel))

        # ── Récapitulatif ──
        bulletin.salaire_brut_cotisable = cnps_d["base"]
        bulletin.salaire_brut_imposable = sbt
        bulletin.total_brut             = total_brut
        bulletin.revenu_net_categoriel  = irpp_d["snc"]

        # ── Compat. anciens champs ──
        bulletin.salaire_brut = total_brut
        bulletin.total_primes = (self._D(bulletin.prime_responsabilite)
                                + self._D(bulletin.prime_assiduite)
                                + self._D(bulletin.prime_rendement)
                                + self._D(bulletin.gratification))

        # ── Cotisations salariales ──
        bulletin.cnps_employe = cnps_d["salarie"]
        bulletin.irpp         = irpp_d["irpp"]
        bulletin.cac          = irpp_d["cac"]
        bulletin.cfc_salarie  = cfc_d["salarie"]
        bulletin.rav          = rav
        bulletin.tdl          = tdl

        # ── Charges patronales ──
        bulletin.cnps_patronal_pension = cnps_d["patronal_pension"]
        bulletin.cnps_patronal_famille = cnps_d["patronal_famille"]
        bulletin.cnps_patronal_at      = cnps_d["patronal_at"]
        bulletin.cfc_patronal          = cfc_d["patronal"]
        bulletin.fne                   = fne

        # ── Total retenues & net à payer ──
        total_retenues = (cnps_d["salarie"]
                         + irpp_d["irpp"]
                         + irpp_d["cac"]
                         + cfc_d["salarie"]
                         + rav
                         + tdl
                         + self._D(getattr(bulletin, "avances_salaire", 0))
                         + self._D(getattr(bulletin, "autres_retenues", 0)))
        bulletin.total_retenues = total_retenues
        bulletin.salaire_net    = max(Decimal("0"), total_brut - total_retenues)

        # ── Coût total employeur ──
        # Spec: total_brut + indemnités non cotisables + charges patronales
        bulletin.cout_total_employeur = (total_brut
                                        + self._D(bulletin.indemnite_transport)
                                        + self._D(bulletin.indemnite_logement)
                                        + cnps_d["patronal_pension"]
                                        + cnps_d["patronal_famille"]
                                        + cnps_d["patronal_at"]
                                        + cfc_d["patronal"]
                                        + fne)

        # ── Détails JSON ──
        bulletin.details = {
            "sbt":            str(sbt),
            "total_brut":     str(total_brut),
            "base_cotisable": str(cnps_d["base"]),
            "cnps_taux":      "4,2 %",
            "snc":            str(irpp_d["snc"]),
            "irpp":           str(irpp_d["irpp"]),
            "cac":            str(irpp_d["cac"]),
            "cfc_salarie":    str(cfc_d["salarie"]),
            "rav":            str(rav),
            "tdl":            str(tdl),
            "heures_sup_25":  str(brut_d["heures_sup_25"]),
            "heures_sup_40":  str(brut_d["heures_sup_40"]),
        }
