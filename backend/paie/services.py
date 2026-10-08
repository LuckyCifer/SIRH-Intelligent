"""
Services paie — Génération PDF des bulletins de paie via fpdf2 (pur Python).
"""

MOIS_LABELS = [
    "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]


def _fmt(n):
    """450 000 FCFA (séparateur espace)"""
    return f"{int(n):,}".replace(",", " ") + " FCFA"


def _titre_section(pdf, texte):
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(46, 116, 181)
    pdf.cell(0, 7, texte, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)


def _ligne_info(pdf, label, valeur, W, bold_val=False):
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(W * 0.38, 6, label)
    pdf.set_font("Helvetica", "B" if bold_val else "", 10)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 6, valeur, new_x="LMARGIN", new_y="NEXT")


def _ligne_calcul(pdf, label, montant, W, retenue=False):
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(W * 0.7, 7, label)
    pdf.set_font("Helvetica", "B", 10)
    if retenue:
        pdf.set_text_color(180, 30, 30)
        pdf.cell(W * 0.3, 7, f"- {_fmt(montant)}", align="R", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.set_text_color(0, 0, 0)
        pdf.cell(W * 0.3, 7, _fmt(montant), align="R", new_x="LMARGIN", new_y="NEXT")


def generer_bulletin_pdf(bulletin):
    """
    Génère le bulletin de paie en PDF.
    Retourne (bytes, content_type, filename).
    """
    from fpdf import FPDF

    b = bulletin
    total_brut = int(b.salaire_brut + b.total_primes)
    mois_label = MOIS_LABELS[b.mois]
    date_gen = b.updated_at.strftime("%d/%m/%Y") if b.updated_at else "—"

    pdf = FPDF()
    pdf.set_margins(20, 20, 20)
    pdf.add_page()
    W = pdf.epw  # largeur utile (170 mm sur A4 avec marges 20)

    # ── En-tête ──────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(46, 116, 181)
    pdf.cell(W * 0.6, 10, "Bulletin de paie")
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(W * 0.4, 10, "ACERFI SARL", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(W * 0.6, 6, f"Periode : {mois_label} {b.annee}")
    pdf.cell(W * 0.4, 6, "Yaounde, Cameroun", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.cell(W * 0.6, 6, f"Statut : {b.get_statut_display()}")
    pdf.cell(W * 0.4, 6, f"Genere le {date_gen}", align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(2)
    pdf.set_draw_color(46, 116, 181)
    pdf.set_line_width(0.5)
    y = pdf.get_y()
    pdf.line(pdf.l_margin, y, pdf.l_margin + W, y)
    pdf.ln(6)

    # ── Informations employé ─────────────────────────────────────
    _titre_section(pdf, "Informations employe")
    _ligne_info(pdf, "Nom complet", b.employe.get_full_name(), W, bold_val=True)
    _ligne_info(pdf, "Identifiant", b.employe.username, W)
    _ligne_info(pdf, "Email", b.employe.email or "—", W)
    pdf.ln(6)

    # ── Détail du calcul ─────────────────────────────────────────
    _titre_section(pdf, "Detail du calcul")

    # En-tête tableau
    pdf.set_fill_color(46, 116, 181)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(W * 0.7, 8, "Libelle", fill=True)
    pdf.cell(W * 0.3, 8, "Montant", fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

    # Gains
    _ligne_calcul(pdf, "Salaire de base", int(b.salaire_brut), W)
    if b.total_primes:
        _ligne_calcul(pdf, "  Primes & indemnites", int(b.total_primes), W)

    # Total brut
    pdf.set_fill_color(220, 220, 220)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(W * 0.7, 8, "Total brut", fill=True)
    pdf.cell(W * 0.3, 8, _fmt(total_brut), fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

    # Cotisations
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(180, 30, 30)
    pdf.cell(0, 7, "COTISATIONS & IMPOTS", new_x="LMARGIN", new_y="NEXT")

    _ligne_calcul(pdf, "CNPS employe (2,8 %)", int(b.cnps_employe), W, retenue=True)
    _ligne_calcul(pdf, "IRPP", int(b.irpp), W, retenue=True)
    if b.autres_retenues:
        _ligne_calcul(pdf, "Autres retenues", int(b.autres_retenues), W, retenue=True)

    # Net à payer
    pdf.set_fill_color(212, 237, 218)
    pdf.set_text_color(21, 87, 36)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(W * 0.7, 10, "Net a payer", fill=True)
    pdf.cell(W * 0.3, 10, _fmt(b.salaire_net), fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

    # ── Pied de page ─────────────────────────────────────────────
    pdf.ln(20)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "Document genere automatiquement par le SIRH ACERFI - Cameroun", align="C")

    filename_base = f"bulletin_{b.employe.username}_{b.mois:02d}_{b.annee}"
    return bytes(pdf.output()), "application/pdf", f"{filename_base}.pdf"
