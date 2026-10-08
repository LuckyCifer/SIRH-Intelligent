"""
Générateur PDF — Bulletin de paie conforme Cameroun 2026.
Utilise fpdf2 (pur Python). Retourne (bytes, content_type, filename).
"""

MOIS_LABELS = [
    "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]


# Les polices intégrées de fpdf (Helvetica) ne couvrent que le latin-1 :
# on remplace les caractères typographiques courants pour éviter FPDFUnicodeEncodingException.
_HORS_LATIN1 = str.maketrans({
    "—": "-", "–": "-", "‘": "'", "’": "'", "“": '"', "”": '"',
    "…": "...", "•": "-", "€": "EUR", " ": " ", " ": " ",
})


def _creer_pdf():
    from fpdf import FPDF

    class _PDFLatin1(FPDF):
        def normalize_text(self, text):
            if not self.is_ttf_font:
                text = text.translate(_HORS_LATIN1).encode("latin-1", "replace").decode("latin-1")
            return super().normalize_text(text)

    return _PDFLatin1()


def _fmt(n):
    """450 000 FCFA"""
    if n is None:
        return "0 FCFA"
    return f"{int(n):,}".replace(",", " ") + " FCFA"


def _fmt_n(n):
    """450 000 (sans unité)"""
    if n is None:
        return "0"
    return f"{int(n):,}".replace(",", " ")


def generer_bulletin_pdf(bulletin):
    """
    Génère le bulletin de paie en PDF conforme Cameroun.
    Retourne (bytes, content_type, filename).
    """
    b   = bulletin
    emp = b.employe
    nom_complet    = emp.get_full_name() or emp.username
    periode        = f"{MOIS_LABELS[b.mois]} {b.annee}"
    date_gen       = b.updated_at.strftime("%d/%m/%Y") if b.updated_at else "—"
    entreprise_nom = b.entreprise.nom if b.entreprise else "ACERFI SARL"

    # Déterminer si le bulletin utilise le nouveau système (salaire_categoriel renseigné)
    nouveau_format = bool(b.salaire_categoriel and int(b.salaire_categoriel) > 0)

    pdf = _creer_pdf()
    pdf.set_margins(15, 15, 15)
    pdf.add_page()
    W = pdf.epw   # ~180 mm

    # ═══════════════════════════════════════════════════════════════════════════
    # En-tête — fond bleu foncé #1F3864
    # ═══════════════════════════════════════════════════════════════════════════
    pdf.set_fill_color(31, 56, 100)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(W, 10, "BULLETIN DE PAIE", align="C", fill=True, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(W * 0.5, 7, f"  {entreprise_nom}", fill=True)
    pdf.cell(W * 0.5, 7, f"Période : {periode}  ", align="R", fill=True,
             new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "I", 9)
    ncpe = b.numero_cnps_employeur if b.numero_cnps_employeur else "—"
    pdf.cell(W * 0.5, 6, f"  N° CNPS employeur : {ncpe}", fill=True)
    pdf.cell(W * 0.5, 6, f"Généré le {date_gen}  ", align="R", fill=True,
             new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)
    pdf.set_text_color(0, 0, 0)

    # ── Utilitaires locaux ────────────────────────────────────────────────────

    def section_titre(titre):
        pdf.set_fill_color(46, 116, 181)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(W, 7, f"  {titre}", fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)

    def ligne_info(label, valeur, alt=False):
        pdf.set_fill_color(245, 248, 252) if alt else pdf.set_fill_color(255, 255, 255)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(90, 90, 90)
        pdf.cell(W * 0.42, 6, f"  {label}", fill=True)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(W * 0.58, 6, f"  {valeur}", fill=True,
                 new_x="LMARGIN", new_y="NEXT")

    def entete_table():
        pdf.set_fill_color(220, 230, 241)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(W * 0.72, 6, "  Désignation", fill=True)
        pdf.cell(W * 0.28, 6, "Montant (FCFA)", fill=True, align="R",
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)

    def ligne_gain(label, montant, alt=False):
        if not montant or int(montant) == 0:
            return
        pdf.set_fill_color(250, 252, 255) if alt else pdf.set_fill_color(255, 255, 255)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(W * 0.72, 6, f"  {label}", fill=True)
        pdf.set_text_color(0, 100, 0)
        pdf.cell(W * 0.28, 6, _fmt_n(montant), fill=True, align="R",
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)

    def ligne_retenue(label, montant, alt=False):
        if not montant or int(montant) == 0:
            return
        pdf.set_fill_color(255, 252, 252) if alt else pdf.set_fill_color(255, 255, 255)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(W * 0.72, 6, f"  {label}", fill=True)
        pdf.set_text_color(160, 20, 20)
        pdf.cell(W * 0.28, 6, _fmt_n(montant), fill=True, align="R",
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)

    def ligne_patronal(label, montant, alt=False):
        if not montant or int(montant) == 0:
            return
        pdf.set_fill_color(252, 255, 252) if alt else pdf.set_fill_color(255, 255, 255)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(W * 0.72, 6, f"  {label}", fill=True)
        pdf.set_text_color(0, 80, 20)
        pdf.cell(W * 0.28, 6, _fmt_n(montant), fill=True, align="R",
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)

    def ligne_total(label, montant, r, g, b_col):
        pdf.set_fill_color(r, g, b_col)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(W * 0.72, 8, f"  {label}", fill=True)
        pdf.cell(W * 0.28, 8, _fmt_n(montant), fill=True, align="R",
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)

    # ═══════════════════════════════════════════════════════════════════════════
    # Identification employé
    # ═══════════════════════════════════════════════════════════════════════════
    section_titre("IDENTIFICATION DE L'EMPLOYÉ")
    ligne_info("Nom & Prénom", nom_complet, alt=False)
    ligne_info("N° CNPS employé",
               b.numero_cnps_employe if b.numero_cnps_employe else "—", alt=True)
    if nouveau_format:
        ligne_info("Catégorie professionnelle",
                   b.categorie_pro if b.categorie_pro else "—", alt=False)
        ligne_info("Échelon / Coefficient",
                   f"{b.echelon or '—'}  /  {b.coefficient or '—'}", alt=True)
    pdf.ln(4)

    # ═══════════════════════════════════════════════════════════════════════════
    # Éléments de rémunération
    # ═══════════════════════════════════════════════════════════════════════════
    section_titre("ÉLÉMENTS DE RÉMUNÉRATION")
    entete_table()

    if nouveau_format:
        alt = False
        ligne_gain("Salaire catégoriel",      b.salaire_categoriel,       alt); alt = not alt
        ligne_gain("Sursalaire",              b.sursalaire,               alt); alt = not alt
        ligne_gain("Prime d'ancienneté",      b.prime_anciennete,         alt); alt = not alt
        ligne_gain("Prime de responsabilité", b.prime_responsabilite,     alt); alt = not alt
        ligne_gain("Prime d'assiduité",       b.prime_assiduite,          alt); alt = not alt
        ligne_gain("Prime de rendement",      b.prime_rendement,          alt); alt = not alt
        ligne_gain("Gratification",           b.gratification,            alt); alt = not alt
        # Heures supplémentaires
        det = b.details or {}
        # Anciens bulletins : montant stocké sous « heures_sup_25 »
        montants_hs = {
            "20": det.get("heures_sup_20", det.get("heures_sup_25", 0)),
            "30": det.get("heures_sup_30", 0),
            "40": det.get("heures_sup_40", 0),
            "50": det.get("heures_sup_50", 0),
        }
        for taux, montant in montants_hs.items():
            montant = int(float(montant or 0))
            if montant > 0:
                nb_h = getattr(b, f"nb_heures_sup_{taux}")
                ligne_gain(f"Heures sup. +{taux}% ({nb_h}h)", montant, alt); alt = not alt
        ligne_gain("Avantages en nature",     b.avantages_nature,         alt); alt = not alt
        ligne_gain("Indemnité transport  (NI)",     b.indemnite_transport,      alt); alt = not alt
        ligne_gain("Indemnité logement  (NI)",      b.indemnite_logement,       alt); alt = not alt
        ligne_gain("Indemnité représentation  (NI)", b.indemnite_representation, alt); alt = not alt
        ligne_gain("Allocations familiales  (NI)",  b.allocations_familiales,   alt)
        total_brut_display = b.total_brut
    else:
        # Fallback — ancien format
        ligne_gain("Salaire de base", b.salaire_brut, alt=False)
        if b.total_primes and int(b.total_primes) > 0:
            ligne_gain("Primes & indemnités", b.total_primes, alt=True)
        total_brut_display = int(b.salaire_brut) + int(b.total_primes)

    ligne_total("TOTAL BRUT", total_brut_display, 31, 56, 100)
    pdf.ln(4)

    # ═══════════════════════════════════════════════════════════════════════════
    # Retenues salariales
    # ═══════════════════════════════════════════════════════════════════════════
    section_titre("RETENUES SALARIALES")
    entete_table()

    base_cot = int(b.salaire_brut_cotisable) if nouveau_format else int(b.salaire_brut)
    alt = False
    ligne_retenue(f"CNPS salarié 4,2% × {_fmt_n(base_cot)}",
                  b.cnps_employe, alt); alt = not alt
    ligne_retenue("IRPP", b.irpp, alt); alt = not alt
    if nouveau_format:
        ligne_retenue("CAC (10% de l'IRPP)", b.cac, alt); alt = not alt
        ligne_retenue(f"CFC salarié 1% × {_fmt_n(base_cot)}", b.cfc_salarie, alt); alt = not alt
        ligne_retenue("RAV (taxe radio-télévision)", b.rav, alt); alt = not alt
        ligne_retenue("TDL (taxe développement local)", b.tdl, alt); alt = not alt
        ligne_retenue("Avances sur salaire", b.avances_salaire, alt); alt = not alt
    ligne_retenue("Autres retenues", b.autres_retenues, alt)

    total_ret = b.total_retenues if nouveau_format else (
        int(b.cnps_employe) + int(b.irpp) + int(b.autres_retenues)
    )
    ligne_total("TOTAL RETENUES", total_ret, 160, 30, 30)
    pdf.ln(4)

    # ═══════════════════════════════════════════════════════════════════════════
    # NET À PAYER — fond or #C9A84C
    # ═══════════════════════════════════════════════════════════════════════════
    pdf.set_fill_color(201, 168, 76)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(W * 0.55, 13, "  NET À PAYER", fill=True)
    pdf.cell(W * 0.45, 13, _fmt(b.salaire_net), fill=True, align="R",
             new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(6)

    # ═══════════════════════════════════════════════════════════════════════════
    # Charges patronales (informatif)
    # ═══════════════════════════════════════════════════════════════════════════
    if nouveau_format:
        section_titre("CHARGES PATRONALES (informatif)")
        entete_table()

        alt = False
        ligne_patronal(f"CNPS pension 4,2% × {_fmt_n(base_cot)}",
                       b.cnps_patronal_pension, alt); alt = not alt
        ligne_patronal(f"CNPS famille 7% × {_fmt_n(base_cot)}",
                       b.cnps_patronal_famille, alt); alt = not alt
        ligne_patronal(f"CNPS AT 1,75% × {_fmt_n(base_cot)}",
                       b.cnps_patronal_at, alt); alt = not alt
        ligne_patronal(f"CFC patronal 1,5% × {_fmt_n(base_cot)}",
                       b.cfc_patronal, alt); alt = not alt
        ligne_patronal(f"FNE 1% × {_fmt_n(base_cot)}",
                       b.fne, alt)

        ligne_total("COÛT TOTAL EMPLOYEUR", b.cout_total_employeur, 46, 116, 181)
        pdf.ln(4)

    # ═══════════════════════════════════════════════════════════════════════════
    # Mode de paiement & observations
    # ═══════════════════════════════════════════════════════════════════════════
    if nouveau_format and (b.mode_paiement or b.observations):
        section_titre("INFORMATIONS COMPLÉMENTAIRES")
        if b.mode_paiement:
            modes = {"virement": "Virement bancaire", "especes": "Espèces", "cheque": "Chèque"}
            ligne_info("Mode de paiement", modes.get(b.mode_paiement, b.mode_paiement))
        if b.observations:
            pdf.set_font("Helvetica", "I", 9)
            pdf.set_text_color(80, 80, 80)
            pdf.multi_cell(W, 5, f"  Observations : {b.observations}", new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)
        pdf.ln(4)

    # ═══════════════════════════════════════════════════════════════════════════
    # Pied de page
    # ═══════════════════════════════════════════════════════════════════════════
    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(W * 0.5, 5, f"Généré le {date_gen} — SIRH © ACERFI SARL")
    pdf.cell(W * 0.5, 5, f"Bulletin {b.mois:02d}/{b.annee} — {nom_complet}", align="R",
             new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(180, 180, 180)
    pdf.cell(W, 4,
             "NI = Non imposable / Non cotisable CNPS  |  "
             "CAC = Centime Additionnel Communal  |  "
             "RAV = Redevance Audio-Visuelle  |  TDL = Taxe Développement Local",
             align="C", new_x="LMARGIN", new_y="NEXT")

    filename = f"bulletin_{emp.username}_{b.mois:02d}_{b.annee}.pdf"
    return bytes(pdf.output()), "application/pdf", filename
