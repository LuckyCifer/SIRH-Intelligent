"""
ExcelPaieImporter — Parse un fichier Excel de paie (.xlsx / .xls).

Supporte deux formats :
  • Nouveau (23 colonnes) : identifiant + salaire_categoriel + rubriques détaillées
  • Ancien  (9  colonnes) : identifiant + salaire_base + primes/indemnites

La détection est automatique selon la présence de la colonne « salaire_categoriel ».
"""
import types
from decimal import Decimal, InvalidOperation

import openpyxl

from .calculateur import CalculateurPaie


class ExcelPaieImporter:
    COLONNES_REQUISES_NOUVEAU = ["identifiant", "salaire_categoriel"]
    COLONNES_REQUISES_ANCIEN  = ["identifiant", "salaire_base"]

    COLONNES_NOUVEAU = [
        "identifiant", "categorie_pro", "echelon", "coefficient",
        "salaire_categoriel", "sursalaire", "prime_anciennete",
        "prime_responsabilite", "prime_assiduite", "prime_rendement",
        "gratification", "nb_heures_sup_20", "nb_heures_sup_30", "nb_heures_sup_40",
        "nb_heures_sup_50", "taux_horaire",
        "indemnite_transport", "indemnite_logement", "indemnite_representation",
        "avantages_nature", "allocations_familiales",
        "avances_salaire", "mode_paiement", "observations", "numero_cnps_employe",
    ]

    COLONNES_ANCIEN = [
        "identifiant", "salaire_base", "primes", "indemnites",
        "heures_sup", "taux_heure_sup", "avances", "retenues_diverses", "note_rh",
    ]

    def parse(self, fichier, entreprise, mois, annee):
        """
        Retourne :
        {
            "succes":            [ {...}, ... ],
            "erreurs":           [ {ligne, identifiant, message}, ... ],
            "total_lignes":      int,
            "colonnes_trouvees": [str],
            "format":            "nouveau" | "ancien",
        }
        """
        try:
            wb = openpyxl.load_workbook(fichier, read_only=True, data_only=True)
        except Exception as exc:
            return {
                "succes": [], "erreurs": [{"ligne": 0, "identifiant": "",
                             "message": f"Fichier invalide : {exc}"}],
                "total_lignes": 0, "colonnes_trouvees": [], "format": "inconnu",
            }

        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        wb.close()

        if not rows:
            return {
                "succes": [], "erreurs": [{"ligne": 0, "identifiant": "",
                             "message": "Fichier vide."}],
                "total_lignes": 0, "colonnes_trouvees": [], "format": "inconnu",
            }

        headers = [str(h).strip().lower() if h is not None else "" for h in rows[0]]
        colonnes_trouvees = [h for h in headers if h]

        # Détection du format
        if "salaire_categoriel" in headers:
            colonnes_requises = self.COLONNES_REQUISES_NOUVEAU
            nouveau_format = True
        elif "salaire_base" in headers:
            colonnes_requises = self.COLONNES_REQUISES_ANCIEN
            nouveau_format = False
        else:
            return {
                "succes": [], "erreurs": [{"ligne": 1, "identifiant": "",
                             "message": "Colonne obligatoire manquante : « salaire_categoriel » ou « salaire_base »."}],
                "total_lignes": 0, "colonnes_trouvees": colonnes_trouvees, "format": "inconnu",
            }

        for col in colonnes_requises:
            if col not in headers:
                return {
                    "succes": [], "erreurs": [{"ligne": 1, "identifiant": "",
                                 "message": f"Colonne obligatoire manquante : « {col} »"}],
                    "total_lignes": 0, "colonnes_trouvees": colonnes_trouvees,
                    "format": "nouveau" if nouveau_format else "ancien",
                }

        col_idx = {h: i for i, h in enumerate(headers) if h}

        from django.contrib.auth import get_user_model
        User = get_user_model()
        qs = User.objects.filter(is_active=True)
        if entreprise is not None:
            qs = qs.filter(entreprise=entreprise)
        users_map = {u.username.lower(): u for u in qs}

        def get_cell(row, col_name, default=None):
            idx = col_idx.get(col_name)
            if idx is None or idx >= len(row):
                return default
            return row[idx]

        def to_dec(val, default=Decimal("0")):
            if val is None or str(val).strip() == "":
                return default
            try:
                d = Decimal(str(val).strip()).quantize(Decimal("1"))
                return max(Decimal("0"), d)
            except (InvalidOperation, ValueError):
                return default

        def to_dec2(val, default=Decimal("0")):
            """Décimales pour heures et taux."""
            if val is None or str(val).strip() == "":
                return default
            try:
                return max(Decimal("0"), Decimal(str(val).strip()))
            except (InvalidOperation, ValueError):
                return default

        def to_str(val):
            return str(val).strip() if val is not None else ""

        succes  = []
        erreurs = []
        calc    = CalculateurPaie()

        for i, row in enumerate(rows[1:], start=2):
            if all(c is None for c in row):
                continue

            identifiant_raw = get_cell(row, "identifiant")
            if not identifiant_raw or to_str(identifiant_raw) == "":
                erreurs.append({"ligne": i, "identifiant": "", "message": "Identifiant vide."})
                continue

            identifiant = to_str(identifiant_raw)
            user = users_map.get(identifiant.lower())
            if user is None:
                erreurs.append({
                    "ligne": i, "identifiant": identifiant,
                    "message": f"Utilisateur « {identifiant} » introuvable ou inactif.",
                })
                continue

            if nouveau_format:
                # ── Nouveau format (23 colonnes) ──────────────────────────────
                salaire_raw = get_cell(row, "salaire_categoriel")
                try:
                    salaire_categoriel = Decimal(str(salaire_raw).strip()).quantize(Decimal("1"))
                    if salaire_categoriel <= 0:
                        raise ValueError()
                except Exception:
                    erreurs.append({
                        "ligne": i, "identifiant": identifiant,
                        "message": f"salaire_categoriel invalide : « {salaire_raw} »",
                    })
                    continue

                # Construire un objet temporaire pour CalculateurPaie
                tmp = types.SimpleNamespace(
                    salaire_categoriel     = salaire_categoriel,
                    sursalaire             = to_dec(get_cell(row, "sursalaire")),
                    prime_anciennete       = to_dec(get_cell(row, "prime_anciennete")),
                    prime_responsabilite   = to_dec(get_cell(row, "prime_responsabilite")),
                    prime_assiduite        = to_dec(get_cell(row, "prime_assiduite")),
                    prime_rendement        = to_dec(get_cell(row, "prime_rendement")),
                    gratification          = to_dec(get_cell(row, "gratification")),
                    # « nb_heures_sup_25 » : colonne des anciens modèles, lue comme tranche 20 %
                    nb_heures_sup_20       = to_dec2(get_cell(row, "nb_heures_sup_20",
                                                          get_cell(row, "nb_heures_sup_25"))),
                    nb_heures_sup_30       = to_dec2(get_cell(row, "nb_heures_sup_30")),
                    nb_heures_sup_40       = to_dec2(get_cell(row, "nb_heures_sup_40")),
                    nb_heures_sup_50       = to_dec2(get_cell(row, "nb_heures_sup_50")),
                    taux_horaire           = to_dec2(get_cell(row, "taux_horaire")),
                    indemnite_transport    = to_dec(get_cell(row, "indemnite_transport")),
                    indemnite_logement     = to_dec(get_cell(row, "indemnite_logement")),
                    indemnite_representation = to_dec(get_cell(row, "indemnite_representation")),
                    avantages_nature       = to_dec(get_cell(row, "avantages_nature")),
                    allocations_familiales = to_dec(get_cell(row, "allocations_familiales")),
                    avances_salaire        = to_dec(get_cell(row, "avances_salaire")),
                    autres_retenues        = Decimal("0"),
                    # Champs remplis par le calculateur
                    salaire_brut=Decimal("0"), total_primes=Decimal("0"),
                    cnps_employe=Decimal("0"), irpp=Decimal("0"), cac=Decimal("0"),
                    cfc_salarie=Decimal("0"), rav=Decimal("0"), tdl=Decimal("0"),
                    cnps_patronal_pension=Decimal("0"), cnps_patronal_famille=Decimal("0"),
                    cnps_patronal_at=Decimal("0"), cfc_patronal=Decimal("0"), fne=Decimal("0"),
                    salaire_brut_cotisable=Decimal("0"), salaire_brut_imposable=Decimal("0"),
                    revenu_net_categoriel=Decimal("0"), total_brut=Decimal("0"),
                    total_retenues=Decimal("0"), salaire_net=Decimal("0"),
                    cout_total_employeur=Decimal("0"), details={},
                )
                calc.calculer(tmp)

                succes.append({
                    "employe_id":            user.id,
                    "nom_complet":           user.get_full_name() or user.username,
                    "identifiant":           identifiant,
                    # Identification
                    "numero_cnps_employe":   to_str(get_cell(row, "numero_cnps_employe")),
                    "categorie_pro":         to_str(get_cell(row, "categorie_pro")),
                    "echelon":               to_str(get_cell(row, "echelon")),
                    "coefficient":           float(to_dec2(get_cell(row, "coefficient"))),
                    # Inputs
                    "salaire_categoriel":    int(salaire_categoriel),
                    "sursalaire":            int(tmp.sursalaire),
                    "prime_anciennete":      int(tmp.prime_anciennete),
                    "prime_responsabilite":  int(tmp.prime_responsabilite),
                    "prime_assiduite":       int(tmp.prime_assiduite),
                    "prime_rendement":       int(tmp.prime_rendement),
                    "gratification":         int(tmp.gratification),
                    "nb_heures_sup_20":      float(tmp.nb_heures_sup_20),
                    "nb_heures_sup_30":      float(tmp.nb_heures_sup_30),
                    "nb_heures_sup_40":      float(tmp.nb_heures_sup_40),
                    "nb_heures_sup_50":      float(tmp.nb_heures_sup_50),
                    "taux_horaire":          float(tmp.taux_horaire),
                    "indemnite_transport":   int(tmp.indemnite_transport),
                    "indemnite_logement":    int(tmp.indemnite_logement),
                    "indemnite_representation": int(tmp.indemnite_representation),
                    "avantages_nature":      int(tmp.avantages_nature),
                    "allocations_familiales": int(tmp.allocations_familiales),
                    "avances_salaire":       int(tmp.avances_salaire),
                    "mode_paiement":         to_str(get_cell(row, "mode_paiement")) or "virement",
                    "observations":          to_str(get_cell(row, "observations")),
                    # Calculés (pour prévisualisation)
                    "total_brut":            int(tmp.total_brut),
                    "cnps_calcule":          int(tmp.cnps_employe),
                    "irpp_calcule":          int(tmp.irpp),
                    "cac_calcule":           int(tmp.cac),
                    "salaire_net":           int(tmp.salaire_net),
                    "format":                "nouveau",
                })

            else:
                # ── Ancien format (9 colonnes) ────────────────────────────────
                salaire_raw = get_cell(row, "salaire_base")
                try:
                    salaire_base = Decimal(str(salaire_raw).strip()).quantize(Decimal("1"))
                    if salaire_base <= 0:
                        raise ValueError()
                except Exception:
                    erreurs.append({
                        "ligne": i, "identifiant": identifiant,
                        "message": f"salaire_base invalide : « {salaire_raw} »",
                    })
                    continue

                from .models import TAUX_CNPS_EMPLOYE, calculer_irpp
                primes_val     = to_dec(get_cell(row, "primes"))
                indemnites_val = to_dec(get_cell(row, "indemnites"))
                heures_sup     = to_dec2(get_cell(row, "heures_sup"))
                taux_heure_sup = to_dec2(get_cell(row, "taux_heure_sup"))
                avances        = to_dec(get_cell(row, "avances"))
                retenues_div   = to_dec(get_cell(row, "retenues_diverses"))
                note_rh        = to_str(get_cell(row, "note_rh"))

                total_primes    = primes_val + indemnites_val + (heures_sup * taux_heure_sup)
                autres_retenues = avances + retenues_div
                cnps     = (salaire_base * TAUX_CNPS_EMPLOYE).quantize(Decimal("1"))
                base_irpp = max(Decimal("0"), salaire_base + total_primes - cnps)
                irpp     = calculer_irpp(base_irpp)
                net      = max(Decimal("0"), salaire_base + total_primes - cnps - irpp - autres_retenues)

                succes.append({
                    "employe_id":     user.id,
                    "nom_complet":    user.get_full_name() or user.username,
                    "identifiant":    identifiant,
                    "salaire_base":   int(salaire_base),
                    "primes":         int(primes_val),
                    "indemnites":     int(indemnites_val),
                    "total_primes":   int(total_primes),
                    "autres_retenues": int(autres_retenues),
                    "cnps_calcule":   int(cnps),
                    "irpp_calcule":   int(irpp),
                    "salaire_net":    int(net),
                    "note_rh":        note_rh,
                    "format":         "ancien",
                })

        return {
            "succes":            succes,
            "erreurs":           erreurs,
            "total_lignes":      len(rows) - 1,
            "colonnes_trouvees": colonnes_trouvees,
            "format":            "nouveau" if nouveau_format else "ancien",
        }
