"""
Management command : generate_employee_documents
================================================
Génère 5 documents PDF de démonstration par employé :
  1. Copie CNI          (catégorie IDENTITE)
  2. Bulletin de paie × 2  (catégorie PAIE)
  3. Contrat CDI        (catégorie CONTRAT)
  4. Certificat formation  (catégorie FORMATION)
  5. Attestation de travail (catégorie ATTESTATION)

Usage :
    python manage.py generate_employee_documents
    python manage.py generate_employee_documents --employee-id=5
    python manage.py generate_employee_documents --force
    python manage.py generate_employee_documents --type=paie
"""
from __future__ import annotations

import hashlib
import os
import tempfile
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files import File
from django.core.management.base import BaseCommand

from fpdf import FPDF

User = get_user_model()

# ── Palette ACERFI ────────────────────────────────────────────────────────────
C_BLUE  = (46,  116, 181)
C_DARK  = (31,  56,  100)
C_GREEN = (0,   122, 61)
C_RED   = (206, 17,  38)
C_YELL  = (252, 209, 22)
C_GRAY  = (128, 128, 128)
C_LGRAY = (220, 220, 220)
C_WHITE = (255, 255, 255)

LOGO_PATH = Path(settings.MEDIA_ROOT) / "entreprises" / "logos" / "logo-mark.png"

MOIS_FR = [
    "", "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
]

SALAIRE_CATEGORIE: dict[str, int] = {
    "I": 120_000,  "II": 160_000,  "III": 210_000,
    "IV": 280_000, "V": 340_000,   "VI":  420_000,
    "VII": 500_000, "VIII": 600_000, "IX": 700_000,
    "X": 850_000,  "XI": 1_000_000, "XII": 1_300_000,
}

VILLES_CMR = [
    "Yaounde", "Douala", "Bafoussam", "Bamenda", "Ngaoundere",
    "Bertoua", "Garoua", "Maroua", "Ebolowa", "Kribi",
]

FORMATIONS_DEMO = [
    ("Django REST Framework avance",       "Technologies Web & API",          24, "Dr. Biya Paul"),
    ("Gestion des ressources humaines",    "Management RH",                   16, "Prof. Manga J."),
    ("Fiscalite camerounaise 2026",        "Finance & Comptabilite",          12, "Me Etoa Charles"),
    ("Leadership et management",           "Developpement professionnel",     20, "Coach Ndongo E."),
    ("Excel avance et Power BI",           "Outils bureautiques",             14, "M. Fongang B."),
    ("Securite informatique",              "Informatique & Reseaux",          18, "Ing. Talla M."),
    ("Communication professionnelle",      "Competences transversales",        8, "Mme Abena S."),
    ("Gestion de projet Agile/Scrum",      "Methodes & Outils",               16, "Coach Essomba D."),
]


# ── Calcul de paie (conforme CalculateurPaie 2026) ───────────────────────────

def _D(v) -> Decimal:
    return Decimal("0") if v is None else Decimal(str(v))

def _r(v) -> int:
    return int(Decimal(str(v)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

def _forfait(montant: Decimal, tranches: list) -> Decimal:
    result = Decimal("0")
    for seuil, forfait in tranches:
        if montant > seuil:
            result = forfait
        else:
            break
    return result

# Barèmes : source unique dans paie.calculateur (évite les divergences)
from paie.calculateur import CalculateurPaie as _CP  # noqa: E402

IRPP_TRANCHES = _CP.IRPP_TRANCHES
RAV_TRANCHES  = _CP.RAV_TRANCHES
TDL_TRANCHES  = _CP.TDL_TRANCHES


def calculer_paie(salaire_brut: float, anciennete_mois: int = 0,
                  indemnite_transport: float = 25_000) -> dict:
    """Calcule toutes les retenues salariales (fiscalite camerounaise 2026)."""
    sbt   = _D(salaire_brut)
    transp = _D(indemnite_transport)

    annees = max(0, anciennete_mois // 12)
    prime_anc = _r(sbt * Decimal("0.02") * annees) if annees else 0

    total_brut = sbt + transp + _D(prime_anc)

    # CNPS
    base_cnps = min(sbt, Decimal("750000"))
    cnps_s = _r(base_cnps * Decimal("0.042"))

    # CFC
    cfc_s = _r(sbt * Decimal("0.01"))

    # IRPP - SNC mensuel
    snc_d = max(Decimal("0"), sbt * Decimal("0.70") - _D(cnps_s) - Decimal("41667"))

    irpp = Decimal("0")
    prev = Decimal("0")
    for plaf, taux in IRPP_TRANCHES:
        borne = min(snc_d, plaf) if plaf is not None else snc_d
        if borne <= prev:
            break
        irpp += (borne - prev) * taux
        prev = plaf if plaf is not None else snc_d
        if plaf is None or snc_d <= plaf:
            break
    irpp_v = _r(irpp)
    cac_v  = _r(_D(irpp_v) * Decimal("0.10"))

    rav_v = _r(_forfait(total_brut, RAV_TRANCHES))
    tdl_v = _r(_forfait(sbt, TDL_TRANCHES))

    total_ret = cnps_s + cfc_s + irpp_v + cac_v + rav_v + tdl_v
    net_v     = _r(total_brut) - total_ret

    cnps_p_pen = _r(base_cnps * Decimal("0.042"))
    cnps_p_fam = _r(base_cnps * Decimal("0.07"))
    cnps_p_at  = _r(base_cnps * Decimal("0.0175"))
    cfc_p      = _r(sbt * Decimal("0.015"))
    fne_v      = _r(sbt * Decimal("0.01"))   # FNE : assiette non plafonnée
    cout_total = _r(total_brut) + cnps_p_pen + cnps_p_fam + cnps_p_at + cfc_p + fne_v

    return {
        "salaire_categoriel":  _r(sbt),
        "prime_anciennete":    prime_anc,
        "indemnite_transport": _r(transp),
        "total_brut":          _r(total_brut),
        "cnps_s":   cnps_s, "cfc_s":   cfc_s,
        "snc":      _r(snc_d),
        "irpp":     irpp_v, "cac":     cac_v,
        "rav":      rav_v,  "tdl":     tdl_v,
        "total_retenues": total_ret,
        "net_a_payer":    net_v,
        "cnps_p_pen": cnps_p_pen, "cnps_p_fam": cnps_p_fam,
        "cnps_p_at":  cnps_p_at,  "cfc_p": cfc_p, "fne": fne_v,
        "cout_total": cout_total,
    }


# ── Montant en lettres (français) ─────────────────────────────────────────────

_UN  = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit",
        "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
        "dix-sept", "dix-huit", "dix-neuf"]
_DIX = ["", "", "vingt", "trente", "quarante", "cinquante",
        "soixante", "soixante", "quatre-vingt", "quatre-vingt"]


def _sous_cent(n: int) -> str:
    if n < 20:
        return _UN[n]
    t, u = divmod(n, 10)
    if t in (7, 9):
        return _DIX[t] + ("-" + _UN[10 + u] if u else "")
    if u == 1 and t != 8:
        return _DIX[t] + "-et-un"
    return _DIX[t] + ("-" + _UN[u] if u else "")


def _sous_mille(n: int) -> str:
    if n < 100:
        return _sous_cent(n)
    c, r = divmod(n, 100)
    h = ("cent" if c == 1 else _UN[c] + " cent") + ("s" if c > 1 and r == 0 else "")
    return (h + " " + _sous_cent(r)).strip()


def montant_en_lettres(n: int) -> str:
    if n == 0:
        return "Zero franc CFA"
    parts = []
    m = abs(int(n))
    mil, m = divmod(m, 1_000_000)
    mille, reste = divmod(m, 1_000)
    if mil:
        parts.append(_sous_mille(mil) + " million" + ("s" if mil > 1 else ""))
    if mille:
        parts.append("mille" if mille == 1 else _sous_mille(mille) + " mille")
    if reste:
        parts.append(_sous_mille(reste))
    txt = " ".join(p for p in parts if p).capitalize()
    return txt + " franc" + ("s" if n != 1 else "") + " CFA"


# ── Helpers PDF ───────────────────────────────────────────────────────────────

def _fmt(n: int) -> str:
    return f"{int(n):,}".replace(",", " ") + " FCFA"


def _set_rgb(pdf: FPDF, rgb: tuple, target: str = "text"):
    if target == "fill":
        pdf.set_fill_color(*rgb)
    elif target == "draw":
        pdf.set_draw_color(*rgb)
    else:
        pdf.set_text_color(*rgb)


def _header_acerfi(pdf: FPDF, titre: str):
    """En-tête standard ACERFI sur papier A4."""
    _set_rgb(pdf, C_DARK, "fill")
    pdf.rect(0, 0, pdf.w, 30, "F")

    if LOGO_PATH.exists():
        pdf.image(str(LOGO_PATH), x=8, y=4, h=22)

    pdf.set_xy(35, 5)
    pdf.set_font("Helvetica", "B", 14)
    _set_rgb(pdf, C_WHITE)
    pdf.cell(0, 7, "ACERFI SARL", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(35, 12)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.cell(0, 4, "BP 1234 Yaounde - Cameroun | Tel: +237 222 XX XX XX | RCCM: CM-YAO-2015-B-00234", new_x="LMARGIN", new_y="NEXT")
    pdf.set_xy(35, 16)
    pdf.cell(0, 4, "N deg Contribuable: M087654321234D | N deg CNPS Employeur: 12-34567-8 | rh@acerfi-sarl.cm", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(pdf.w - 80, 8)
    pdf.set_font("Helvetica", "B", 10)
    _set_rgb(pdf, C_YELL)
    pdf.cell(72, 7, titre, align="R", new_x="LMARGIN", new_y="NEXT")

    _set_rgb(pdf, (0, 0, 0))
    pdf.set_y(34)


def _watermark(pdf: FPDF, txt: str = "SPECIMEN"):
    """Filigrane diagonal en gris clair."""
    cx, cy = pdf.w / 2, pdf.h / 2
    pdf.set_font("Helvetica", "B", 70)
    _set_rgb(pdf, (230, 230, 230))
    try:
        with pdf.rotation(45, cx, cy):
            w = pdf.get_string_width(txt)
            pdf.text(cx - w / 2, cy + 10, txt)
    except Exception:
        pass
    _set_rgb(pdf, (0, 0, 0))


def _footer_specimen(pdf: FPDF):
    pdf.set_y(-12)
    pdf.set_font("Helvetica", "I", 6.5)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(0, 5, "DOCUMENT FICTIF - SPECIMEN - A USAGE PEDAGOGIQUE UNIQUEMENT - NE CONSTITUE PAS UN DOCUMENT OFFICIEL", align="C")
    _set_rgb(pdf, (0, 0, 0))


def _separator(pdf: FPDF):
    _set_rgb(pdf, C_BLUE, "draw")
    pdf.set_line_width(0.4)
    y = pdf.get_y()
    pdf.line(pdf.l_margin, y, pdf.l_margin + pdf.epw, y)
    pdf.ln(3)


# ── Générateur 1 : CNI ────────────────────────────────────────────────────────

def gen_cni(user, pdf_path: str):
    """Génère une copie CNI biométrique camerounaise (SPECIMEN)."""
    today = date.today()
    seed  = int(hashlib.md5(f"cni{user.id}".encode()).hexdigest()[:12], 16)

    dob = getattr(user, "date_naissance", None)
    if dob is None:
        yr  = today.year - 25 - (seed % 30)
        dob = date(yr, 1 + seed % 12, 1 + seed % 28)

    lieu_naiss = (getattr(user, "lieu_naissance", None)
                  or VILLES_CMR[seed % len(VILLES_CMR)])
    adresse    = (getattr(user, "adresse", None)
                  or f"Quartier Melen, {VILLES_CMR[(seed + 2) % len(VILLES_CMR)]}, Cameroun")
    poste_titre = ""
    if getattr(user, "poste", None):
        poste_titre = user.poste.titre
    elif getattr(user, "filiere", None):
        poste_titre = user.filiere
    else:
        poste_titre = "Agent de bureau"

    cni_num   = str(seed % 10**10).zfill(10)
    height_cm = 160 + (seed % 28)
    sex_label = "Masculin" if seed % 2 == 0 else "Feminin"

    yrs_since   = 1 + seed % 8
    del_date    = date(today.year - yrs_since, 1 + seed % 12, 1 + seed % 26)
    exp_date    = date(del_date.year + 10, del_date.month, del_date.day)

    # Page A4 portrait - la carte est dessinee dans la partie haute
    pdf = FPDF()
    pdf.set_margins(0, 0, 0)
    pdf.set_auto_page_break(False)
    pdf.add_page()

    W, H = pdf.w, pdf.h

    # ── Fond page ──
    _set_rgb(pdf, (248, 248, 255), "fill")
    pdf.rect(0, 0, W, H, "F")

    # ── Zone carte (centree, ratio 1,58:1) ──
    CW, CH = 170, 107  # mm
    CX = (W - CW) / 2
    CY = 30

    _set_rgb(pdf, (255, 255, 255), "fill")
    _set_rgb(pdf, C_DARK, "draw")
    pdf.set_line_width(1)
    pdf.rect(CX, CY, CW, CH, "FD")

    # Bandeau drapeau camerounais (vertical, gauche)
    stripe_w = 8
    for i, col in enumerate([C_GREEN, C_RED, C_YELL]):
        _set_rgb(pdf, col, "fill")
        pdf.rect(CX + i * stripe_w, CY, stripe_w, CH, "F")

    # En-tete bleu fonce
    _set_rgb(pdf, C_DARK, "fill")
    pdf.rect(CX + 24, CY, CW - 24, 22, "F")

    pdf.set_xy(CX + 26, CY + 2)
    pdf.set_font("Helvetica", "B", 7)
    _set_rgb(pdf, C_YELL)
    pdf.cell(CW - 28, 5, "REPUBLIQUE DU CAMEROUN / REPUBLIC OF CAMEROON", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(CX + 26, CY + 8)
    pdf.set_font("Helvetica", "B", 8.5)
    _set_rgb(pdf, C_WHITE)
    pdf.cell(CW - 28, 6, "CARTE NATIONALE D'IDENTITE / NATIONAL IDENTITY CARD", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(CX + 26, CY + 15)
    pdf.set_font("Helvetica", "B", 6)
    _set_rgb(pdf, (200, 220, 255))
    pdf.cell(CW - 28, 5, "CARTE BIOMETRIQUE / BIOMETRIC CARD - VALIDITE 10 ANS", align="C")

    # Trait separateur jaune
    _set_rgb(pdf, C_YELL, "fill")
    pdf.rect(CX + 24, CY + 21, CW - 24, 1.5, "F")

    # Zone photo
    _set_rgb(pdf, C_LGRAY, "fill")
    _set_rgb(pdf, C_GRAY, "draw")
    pdf.set_line_width(0.3)
    pdf.rect(CX + 26, CY + 24, 29, 38, "FD")
    pdf.set_xy(CX + 26, CY + 38)
    pdf.set_font("Helvetica", "", 5)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(29, 5, "PHOTO", align="C")

    # Champs d'identite
    fields = [
        ("NOM / SURNAME",          user.last_name.upper()),
        ("PRENOMS / GIVEN NAMES",  user.first_name.upper()),
        ("DATE DE NAISSANCE",      f"{dob.day:02d}/{dob.month:02d}/{dob.year} - {lieu_naiss}"),
        ("SEXE / SEX",             sex_label),
        ("TAILLE / HEIGHT",        f"{height_cm} cm"),
        ("PROFESSION",             poste_titre[:36]),
        ("ADRESSE / ADDRESS",      adresse[:52]),
    ]

    fy = CY + 24
    for label, val in fields:
        pdf.set_xy(CX + 58, fy)
        pdf.set_font("Helvetica", "", 5)
        _set_rgb(pdf, C_GRAY)
        pdf.cell(CW - 60, 3.5, label)
        pdf.set_xy(CX + 58, fy + 3.2)
        pdf.set_font("Helvetica", "B", 7)
        _set_rgb(pdf, (0, 0, 0))
        pdf.cell(CW - 60, 4.5, val)
        fy += 8.6

    # Dates + N° carte
    pdf.set_xy(CX + 58, fy)
    pdf.set_font("Helvetica", "", 5)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(50, 3.5, "DATE DE DELIVRANCE")
    pdf.set_xy(CX + 112, fy)
    pdf.cell(50, 3.5, "DATE D'EXPIRATION")
    pdf.set_xy(CX + 58, fy + 3.2)
    pdf.set_font("Helvetica", "B", 7)
    _set_rgb(pdf, (0, 0, 0))
    pdf.cell(50, 4.5, f"{del_date.day:02d}/{del_date.month:02d}/{del_date.year}")
    pdf.set_xy(CX + 112, fy + 3.2)
    pdf.cell(50, 4.5, f"{exp_date.day:02d}/{exp_date.month:02d}/{exp_date.year}")

    pdf.set_xy(CX + 58, fy + 9)
    pdf.set_font("Helvetica", "B", 6.5)
    _set_rgb(pdf, C_BLUE)
    pdf.cell(0, 4.5, f"N deg  {cni_num[:3]} {cni_num[3:6]} {cni_num[6:]}")

    # Zone MRZ
    _set_rgb(pdf, (15, 15, 15), "fill")
    pdf.rect(CX, CY + CH - 15, CW, 15, "F")

    nom_mrz = user.last_name.upper().replace(" ", "<")[:14].ljust(14, "<")
    pre_mrz = user.first_name.upper().replace(" ", "<")[:13].ljust(13, "<")
    dob_mrz = f"{str(dob.year)[2:]}{dob.month:02d}{dob.day:02d}"
    exp_mrz = f"{str(exp_date.year)[2:]}{exp_date.month:02d}{exp_date.day:02d}"
    sex_m   = "M" if "asc" in sex_label else "F"
    mrz1    = (f"IDCMR{cni_num}0" + "<" * 14)[:30]
    mrz2    = (f"{dob_mrz}0{sex_m}{exp_mrz}0CMR" + "<" * 12)[:30]
    mrz3    = (f"{nom_mrz}<<{pre_mrz}" + "<" * 10)[:30]

    pdf.set_font("Courier", "B", 5.5)
    _set_rgb(pdf, (200, 220, 200))
    for i, line in enumerate([mrz1, mrz2, mrz3]):
        pdf.set_xy(CX + 5, CY + CH - 14 + i * 4.5)
        pdf.cell(CW - 10, 4, line)

    # Signature
    _set_rgb(pdf, C_LGRAY, "fill")
    _set_rgb(pdf, C_GRAY, "draw")
    pdf.rect(CX + 26, CY + 64, 29, 14, "FD")
    pdf.set_xy(CX + 26, CY + 72)
    pdf.set_font("Helvetica", "", 5)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(29, 4, "SIGNATURE", align="C")

    # Filigrane SPECIMEN sur la carte
    cx_card, cy_card = CX + CW / 2, CY + CH / 2
    pdf.set_font("Helvetica", "B", 38)
    _set_rgb(pdf, (200, 200, 200))
    try:
        with pdf.rotation(45, cx_card, cy_card):
            w = pdf.get_string_width("SPECIMEN")
            pdf.text(cx_card - w / 2, cy_card + 5, "SPECIMEN")
    except Exception:
        pass
    _set_rgb(pdf, (0, 0, 0))

    # Note bas de carte
    pdf.set_xy(CX + 24, CY + CH - 3)
    pdf.set_font("Helvetica", "I", 4)
    _set_rgb(pdf, (150, 150, 150))
    pdf.cell(CW - 24, 3, "DOCUMENT FICTIF - SPECIMEN - USAGE PEDAGOGIQUE UNIQUEMENT", align="C")

    # Bas de page A4
    pdf.set_y(CY + CH + 10)
    pdf.set_font("Helvetica", "", 8)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(0, 6, "Ce document est un specimen pedagogique genere par le SIRH ACERFI SARL.", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Il ne constitue en aucun cas un veritable document d'identite officiel.", align="C")

    pdf.output(pdf_path)


# ── Générateur 2 : Bulletin de paie ──────────────────────────────────────────

def gen_bulletin(user, mois: int, annee: int, paie: dict, pdf_path: str):
    """Génère un bulletin de paie A4 complet (conformité Cameroun 2026)."""
    today    = date.today()
    username = user.username
    poste    = user.poste.titre if getattr(user, "poste", None) else "Collaborateur"
    dept     = user.departement.nom if getattr(user, "departement", None) else "General"
    cat      = getattr(user, "categorie_pro", "IV") or "IV"
    ech      = getattr(user, "echelon", 1) or 1
    cnps_no  = getattr(user, "numero_cnps", None) or f"CM-{user.id:05d}-{mois}"
    mat      = f"MAT-{user.id:04d}"
    nb_enf   = getattr(user, "nb_enfants_a_charge", 0) or 0

    pdf = FPDF()
    pdf.set_margins(18, 18, 18)
    pdf.set_auto_page_break(True, margin=18)
    pdf.add_page()
    W = pdf.epw

    # ── En-tete ──────────────────────────────────────────────────────────────
    _header_acerfi(pdf, f"BULLETIN DE PAIE - {MOIS_FR[mois].upper()} {annee}")

    # Periode + statut
    pdf.set_font("Helvetica", "", 8.5)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(W * 0.5, 5, f"Periode de paie : 01/{mois:02d}/{annee} au {_last_day(mois, annee)}/{mois:02d}/{annee}")
    pdf.cell(W * 0.5, 5, f"Date de paiement : {_last_day(mois, annee)}/{mois:02d}/{annee}", align="R", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    pdf.ln(2)
    _separator(pdf)

    # ── Identite employe / employeur (deux colonnes) ──────────────────────────
    def _bloc(label, val, col_w=W * 0.47):
        pdf.set_font("Helvetica", "", 7.5)
        _set_rgb(pdf, C_GRAY)
        pdf.cell(col_w * 0.45, 5.5, label)
        pdf.set_font("Helvetica", "B", 8.5)
        _set_rgb(pdf, (0, 0, 0))
        pdf.cell(col_w * 0.55, 5.5, str(val), new_x="RIGHT", new_y="TOP")

    # Titre colonnes
    _set_rgb(pdf, C_BLUE, "fill")
    _set_rgb(pdf, C_WHITE)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.cell(W * 0.47, 7, "  EMPLOYE", fill=True)
    pdf.cell(W * 0.06, 7, "")
    pdf.cell(W * 0.47, 7, "  EMPLOYEUR", fill=True, new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))

    y0 = pdf.get_y()
    # Colonne employe
    rows_emp = [
        ("Nom & Prenoms",   f"{user.last_name.upper()} {user.first_name}"),
        ("Matricule",       mat),
        ("N deg CNPS",      cnps_no),
        ("Poste",           poste[:28]),
        ("Departement",     dept[:28]),
        ("Categorie / Echelon", f"Cat. {cat} - Echelon {ech}"),
        ("Enfants a charge", str(nb_enf)),
    ]
    for label, val in rows_emp:
        pdf.set_xy(pdf.l_margin, pdf.get_y())
        _bloc(label, val)
        pdf.ln(5.5)

    # Colonne employeur
    rows_empr = [
        ("Employeur",       "ACERFI SARL"),
        ("Siege social",    "BP 1234 Yaounde, Cameroun"),
        ("N deg Contribuable", "M087654321234D"),
        ("N deg CNPS Patron.", "12-34567-8"),
        ("RCCM",            "CM-YAO-2015-B-00234"),
        ("Secteur d'activite", "Formation numerique"),
        ("Mode de paiement", "Virement bancaire"),
    ]
    y1 = y0
    for label, val in rows_empr:
        pdf.set_xy(pdf.l_margin + W * 0.53, y1)
        _bloc(label, val)
        y1 += 5.5

    pdf.set_y(max(pdf.get_y(), y1) + 3)
    _separator(pdf)

    # ── Tableau des elements de paie ──────────────────────────────────────────
    def _th(labels_widths):
        _set_rgb(pdf, C_DARK, "fill")
        _set_rgb(pdf, C_WHITE)
        pdf.set_font("Helvetica", "B", 8.5)
        for label, w in labels_widths:
            pdf.cell(w, 7, f"  {label}", fill=True, align="L")
        pdf.ln(7)
        _set_rgb(pdf, (0, 0, 0))

    def _row(cols, fill=False, bold=False, color=(30, 30, 30)):
        if fill:
            _set_rgb(pdf, (240, 245, 255), "fill")
        pdf.set_font("Helvetica", "B" if bold else "", 9)
        _set_rgb(pdf, color)
        for col in cols:
            txt, w = col[0], col[1]
            align = col[2] if len(col) > 2 else "L"
            pdf.cell(w, 6.5, f"  {txt}", fill=fill, align=align)
        pdf.ln(6.5)
        _set_rgb(pdf, (0, 0, 0))

    w1, w2, w3, w4 = W * 0.44, W * 0.18, W * 0.18, W * 0.20

    # GAINS
    pdf.set_font("Helvetica", "B", 9)
    _set_rgb(pdf, C_BLUE)
    pdf.cell(0, 6, "A. ELEMENTS DE REMUNERATION (GAINS)", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    _th([("Libelle", w1), ("Base FCFA", w2), ("Taux / Nb", w3), ("Montant FCFA", w4)])

    _row([("Salaire categoriel", w1), (_fmt(paie["salaire_categoriel"]), w2), ("-", w3),
          (_fmt(paie["salaire_categoriel"]), w4)], fill=True)

    if paie["prime_anciennete"] > 0:
        anc_mois = 0
        if hasattr(user, "date_joined") and user.date_joined:
            anc_mois = (date.today() - user.date_joined.date()).days // 30
        annees = anc_mois // 12
        _row([("Prime d'anciennete (2%/an)", w1), (_fmt(paie["salaire_categoriel"]), w2),
              (f"2% x {annees} an(s)", w3), (_fmt(paie["prime_anciennete"]), w4)])

    _row([("Indemnite de transport (exo. CNPS)", w1), ("Forfait", w2), ("-", w3),
          (_fmt(paie["indemnite_transport"]), w4)], fill=True)

    # Total brut
    _set_rgb(pdf, C_DARK, "fill")
    _set_rgb(pdf, C_WHITE)
    pdf.set_font("Helvetica", "B", 9.5)
    pdf.cell(w1 + w2 + w3, 7.5, "  SALAIRE BRUT TOTAL", fill=True)
    pdf.cell(w4, 7.5, f"  {_fmt(paie['total_brut'])}", fill=True, align="L")
    pdf.ln(7.5)
    _set_rgb(pdf, (0, 0, 0))
    pdf.ln(3)

    # RETENUES
    pdf.set_font("Helvetica", "B", 9)
    _set_rgb(pdf, (180, 30, 30))
    pdf.cell(0, 6, "B. COTISATIONS ET RETENUES OBLIGATOIRES (DEDUCTIONS)", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    _th([("Libelle", w1), ("Base FCFA", w2), ("Taux %", w3), ("Montant FCFA", w4)])

    brut_cot = min(paie["salaire_categoriel"], 750_000)
    rows_ret = [
        ("CNPS salarie (Pension/Vieillesse)",
         _fmt(brut_cot), "4,2 %",        _fmt(paie["cnps_s"])),
        ("CFC salarie (Credit Foncier)",
         _fmt(paie["salaire_categoriel"]), "1,0 %", _fmt(paie["cfc_s"])),
        (f"IRPP (SNC mensuel = {_fmt(paie['snc'])})",
         _fmt(paie["snc"]), "Barème progr.", _fmt(paie["irpp"])),
        ("CAC (Centime Additionnel Communal, 10% IRPP)",
         _fmt(paie["irpp"]), "10,0 %",    _fmt(paie["cac"])),
        ("RAV (Redevance Audiovisuelle)",
         "Forfait",         "-",          _fmt(paie["rav"])),
        ("TDL (Taxe de Developpement Local)",
         "Forfait",         "-",          _fmt(paie["tdl"])),
    ]
    for i, (lab, base, tx, mont) in enumerate(rows_ret):
        _row([(lab, w1), (base, w2), (tx, w3), (mont, w4)], fill=(i % 2 == 0))

    _set_rgb(pdf, (200, 30, 30), "fill")
    _set_rgb(pdf, C_WHITE)
    pdf.set_font("Helvetica", "B", 9.5)
    pdf.cell(w1 + w2 + w3, 7.5, "  TOTAL RETENUES SALARIALES", fill=True)
    pdf.cell(w4, 7.5, f"  - {_fmt(paie['total_retenues'])}", fill=True, align="L")
    pdf.ln(7.5)
    _set_rgb(pdf, (0, 0, 0))
    pdf.ln(4)

    # NET A PAYER
    _set_rgb(pdf, (34, 139, 34), "fill")
    _set_rgb(pdf, C_WHITE)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(W * 0.55, 12, "  NET A PAYER", fill=True)
    pdf.cell(W * 0.45, 12, f"  {_fmt(paie['net_a_payer'])}", fill=True, align="L")
    pdf.ln(12)
    _set_rgb(pdf, (0, 0, 0))

    pdf.set_font("Helvetica", "I", 8)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(0, 5, f"En lettres : {montant_en_lettres(paie['net_a_payer'])}", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    pdf.ln(4)
    _separator(pdf)

    # CHARGES PATRONALES (informatif)
    pdf.set_font("Helvetica", "B", 8)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(0, 5, "C. CHARGES PATRONALES (informatif - ne sont pas deduites du salaire)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 7.5)
    charges_p = [
        ("CNPS pension patronal (4,2%)", paie["cnps_p_pen"]),
        ("CNPS famille patronal (7,0%)", paie["cnps_p_fam"]),
        ("CNPS AT risque A (1,75%)", paie["cnps_p_at"]),
        ("CFC patronal (1,5%)", paie["cfc_p"]),
        ("FNE (Fonds National Emploi, 1,0%)", paie["fne"]),
    ]
    for lab, v in charges_p:
        pdf.cell(W * 0.65, 4.5, f"   {lab}")
        pdf.cell(W * 0.35, 4.5, _fmt(v), align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(W * 0.65, 5, "   COUT TOTAL EMPLOYEUR")
    pdf.cell(W * 0.35, 5, _fmt(paie["cout_total"]), align="R", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    pdf.ln(4)
    _separator(pdf)

    # Mentions legales
    pdf.set_font("Helvetica", "I", 7)
    _set_rgb(pdf, C_GRAY)
    pdf.multi_cell(0, 4, (
        "Ce bulletin de paie est etabli conformement au Code du Travail camerounais (Loi n deg 92/007 du 14 août 1992) "
        "et aux dispositions fiscales en vigueur. Il doit etre conserve par le salarie sans limitation de duree (Art. 68 CT). "
        "En cas de litige, la juridiction competente est le Tribunal du Travail de Yaounde."
    ), new_x="LMARGIN", new_y="NEXT")

    _footer_specimen(pdf)
    _watermark(pdf, "SPECIMEN")
    pdf.output(pdf_path)


def _last_day(mois: int, annee: int) -> int:
    import calendar
    return calendar.monthrange(annee, mois)[1]


# ── Générateur 3 : Contrat CDI ────────────────────────────────────────────────

def gen_contrat(user, salaire_brut: int, pdf_path: str):
    """Génère un contrat CDI conforme au droit camerounais (Art. 25 CT)."""
    poste       = user.poste.titre if getattr(user, "poste", None) else "Collaborateur"
    dept        = user.departement.nom if getattr(user, "departement", None) else "General"
    cat         = getattr(user, "categorie_pro", "IV") or "IV"
    ech         = getattr(user, "echelon", 1) or 1
    date_emb    = (user.date_joined.date() if hasattr(user, "date_joined")
                   and user.date_joined else date(2024, 1, 15))
    date_essai  = date_emb + timedelta(days=90)  # 3 mois cadres
    preavis_j   = 45 if cat in ("I", "II", "III", "IV") else 90

    pdf = FPDF()
    pdf.set_margins(22, 22, 22)
    pdf.set_auto_page_break(True, margin=22)
    pdf.add_page()
    W = pdf.epw

    _header_acerfi(pdf, "CONTRAT DE TRAVAIL A DUREE INDETERMINEE")

    # Ref contrat
    ref = f"ACERFI/CDI/{date_emb.year}/{user.id:04d}"
    pdf.set_font("Helvetica", "B", 9)
    _set_rgb(pdf, C_BLUE)
    pdf.cell(0, 6, f"Ref : {ref}  |  Etabli a Yaounde, le {date_emb.strftime('%d/%m/%Y')}", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    _separator(pdf)

    # Titre
    pdf.set_font("Helvetica", "B", 13)
    _set_rgb(pdf, C_DARK)
    pdf.cell(0, 8, "CONTRAT DE TRAVAIL A DUREE INDETERMINEE (CDI)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "I", 9)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(0, 5, "Conformement aux articles 25 et suivants du Code du Travail camerounais (Loi n deg 92/007 du 14 aout 1992)", align="C", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    pdf.ln(5)

    def _art(num: str, titre: str, corps: str):
        pdf.set_font("Helvetica", "B", 10)
        _set_rgb(pdf, C_BLUE)
        pdf.cell(0, 6, f"Article {num} - {titre}", new_x="LMARGIN", new_y="NEXT")
        _set_rgb(pdf, (0, 0, 0))
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(0, 5.5, corps, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

    # Parties
    _art("1", "PARTIES AU CONTRAT",
         f"Le present contrat est conclu entre :\n\n"
         f"L'EMPLOYEUR : ACERFI SARL, Societe a Responsabilite Limitee au capital de 5 000 000 FCFA, "
         f"dont le siege social est sis a Yaounde, BP 1234, enregistree au RCCM sous le n deg CM-YAO-2015-B-00234, "
         f"represente(e) par son Directeur General, ci-apres denomme « l'Employeur ».\n\n"
         f"ET\n\n"
         f"LE SALARIE : M. / Mme {user.last_name.upper()} {user.first_name}, "
         f"de nationalite camerounaise, domicilie(e) a "
         f"{getattr(user, 'adresse', 'Yaounde, Cameroun') or 'Yaounde, Cameroun'}, "
         f"ci-apres denomme(e) « le Salarie ».")

    _art("2", "NATURE ET FORME DU CONTRAT",
         "Le present contrat est un Contrat de Travail a Duree Indeterminee (CDI), etabli par ecrit "
         "conformement a l'article 25 alinea 3 du Code du Travail. Il prend effet a la date de signature "
         "des deux parties et ne comporte pas de terme fixe. Il peut etre rompu par l'une ou l'autre des "
         "parties dans les conditions prevues aux articles 34 et suivants du Code du Travail.")

    _art("3", "POSTE ET LIEU DE TRAVAIL",
         f"Le Salarie est engage au poste de : {poste} (Categorie {cat}, Echelon {ech}), "
         f"au sein du Departement : {dept}. "
         f"Le lieu habituel de travail est fixe a Yaounde, Cameroun. "
         f"L'Employeur se reserve le droit de muter le Salarie dans tout autre etablissement de la societe "
         f"pour les necessites du service, apres accord mutuel.")

    _art("4", "PERIODE D'ESSAI",
         f"Le present contrat est soumis a une periode d'essai de trois (3) mois a compter de la date d'embauche "
         f"({date_emb.strftime('%d/%m/%Y')}), soit jusqu'au {date_essai.strftime('%d/%m/%Y')}, "
         f"conformement a l'article 27 du Code du Travail. Durant cette periode, chaque partie peut mettre fin "
         f"au contrat sans preavis ni indemnite. La periode d'essai n'est pas renouvelable.")

    _art("5", "REMUNERATION",
         f"En contrepartie de ses prestations, le Salarie percevra une remuneration mensuelle brute de "
         f"{_fmt(salaire_brut)}, se decomposant comme suit :\n"
         f"  - Salaire categoriel de base : {_fmt(salaire_brut)}\n"
         f"  - Prime d'anciennete : 2% par annee complete d'anciennete (a compter de la fin de la periode d'essai)\n"
         f"  - Indemnite de transport : {_fmt(25_000)} (exoneree de CNPS et d'IRPP)\n"
         f"  - Autres primes et indemnites selon la convention collective applicable.\n\n"
         f"La remuneration est versee le dernier jour ouvre de chaque mois par virement bancaire.")

    _art("6", "DUREE DU TRAVAIL ET CONGES",
         "La duree du travail est fixee a 40 heures par semaine, reparties du lundi au vendredi, de 08h00 "
         "a 17h00 avec une pause dejeuner de 1 heure. Tout depassement sera remunere conformement aux taux "
         "legaux (25% pour les 8 premieres heures supplementaires, 40% au-dela).\n\n"
         "Le Salarie beneficie de 18 jours ouvrables de conges annuels payes par an (2 jours par mois de "
         "service effectif), conformement a l'article 92 du Code du Travail.")

    _art("7", "AFFILIATION CNPS",
         f"Le Salarie sera affilie a la Caisse Nationale de Prevoyance Sociale (CNPS) sous le matricule "
         f"employe {getattr(user, 'numero_cnps', None) or 'A obtenir a la CNPS'}, "
         f"des le premier jour d'execution du present contrat. "
         f"Les cotisations sociales seront versees conformement aux dispositions en vigueur (4,2% salarie, "
         f"charges patronales selon les taux applicables).")

    _art("8", "CONFIDENTIALITE",
         "Le Salarie s'engage a garder le secret sur toutes les informations confidentielles relatives a "
         "l'entreprise, a ses clients, a ses methodes de travail et a toute information dont il aurait "
         "connaissance dans le cadre de ses fonctions. Cette obligation perdure apres la cessation du contrat "
         "pour une duree de deux (2) ans.")

    _art("9", "RESILIATION ET PREAVIS",
         f"En cas de resiliation du present contrat apres la periode d'essai, la partie initialement "
         f"la rupture devra respecter un preavis de {preavis_j} jours calendaires "
         f"(conformement a l'article 34 du Code du Travail et a la classification professionnelle du Salarie). "
         f"En cas de licenciement pour faute lourde, aucun preavis ni indemnite ne sera du.")

    _art("10", "JURIDICTION COMPETENTE",
         "Tout litige relatif a l'interpretation, l'execution ou la cessation du present contrat releve "
         "de la competence exclusive du Tribunal du Travail de Yaounde (Cameroun), apres tentative de "
         "conciliation a l'amiable et en application du Code du Travail camerounais.")

    # Signatures
    pdf.ln(5)
    _separator(pdf)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 6, f"Fait a Yaounde, en deux (2) exemplaires originaux, le {date_emb.strftime('%d/%m/%Y')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)

    sw = W / 2 - 10
    pdf.set_font("Helvetica", "B", 9)
    _set_rgb(pdf, C_DARK)
    pdf.cell(sw, 6, "POUR L'EMPLOYEUR - ACERFI SARL")
    pdf.cell(10, 6, "")
    pdf.cell(sw, 6, f"LE SALARIE - {user.last_name.upper()} {user.first_name}", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(sw, 5, "Le Directeur General")
    pdf.cell(10, 5, "")
    pdf.cell(sw, 5, "Lu et approuve - Bon pour accord", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(20)

    pdf.set_font("Helvetica", "", 9)
    pdf.cell(sw, 5, "_______________________________")
    pdf.cell(10, 5, "")
    pdf.cell(sw, 5, "_______________________________", new_x="LMARGIN", new_y="NEXT")

    _footer_specimen(pdf)
    _watermark(pdf, "SPECIMEN")
    pdf.output(pdf_path)


# ── Générateur 4 : Certificat de formation ────────────────────────────────────

def gen_certificat_formation(user, formation_titre: str, domaine: str,
                              duree_h: int, formateur: str,
                              date_fin_form: date, cert_num: str, pdf_path: str):
    """Génère un certificat de formation A4."""
    pdf = FPDF()
    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(False)
    pdf.add_page()
    W, H = pdf.epw, pdf.eph

    # Bordure decorative double
    _set_rgb(pdf, C_DARK, "draw")
    pdf.set_line_width(2.5)
    pdf.rect(8, 8, pdf.w - 16, pdf.h - 16)
    _set_rgb(pdf, C_BLUE, "draw")
    pdf.set_line_width(0.8)
    pdf.rect(11, 11, pdf.w - 22, pdf.h - 22)

    # Logo
    if LOGO_PATH.exists():
        pdf.image(str(LOGO_PATH), x=pdf.w / 2 - 15, y=18, h=22)

    # Titre organisme
    pdf.set_xy(20, 42)
    pdf.set_font("Helvetica", "B", 14)
    _set_rgb(pdf, C_DARK)
    pdf.cell(0, 7, "ACERFI SARL", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_xy(20, 49)
    pdf.set_font("Helvetica", "", 9)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(0, 5, "Centre de Formation Professionnelle Agree - Yaounde, Cameroun", align="C", new_x="LMARGIN", new_y="NEXT")

    # Titre certificat
    _set_rgb(pdf, C_BLUE, "fill")
    pdf.set_xy(30, 62)
    pdf.set_fill_color(*C_DARK)
    pdf.rect(30, 62, pdf.w - 60, 14, "F")
    pdf.set_xy(30, 62)
    pdf.set_font("Helvetica", "B", 16)
    _set_rgb(pdf, C_WHITE)
    pdf.cell(pdf.w - 60, 14, "CERTIFICAT DE FORMATION", align="C")

    # Corps
    pdf.set_xy(20, 85)
    pdf.set_font("Helvetica", "", 11)
    _set_rgb(pdf, (0, 0, 0))
    pdf.cell(0, 7, "Nous certifions que", align="C", new_x="LMARGIN", new_y="NEXT")

    # Nom beneficiaire
    pdf.set_xy(20, 95)
    pdf.set_font("Helvetica", "B", 17)
    _set_rgb(pdf, C_DARK)
    pdf.cell(0, 9, f"M. / Mme {user.last_name.upper()} {user.first_name}", align="C", new_x="LMARGIN", new_y="NEXT")

    # Trait sous nom
    _set_rgb(pdf, C_BLUE, "draw")
    pdf.set_line_width(0.6)
    pdf.line(50, 107, pdf.w - 50, 107)

    pdf.set_xy(20, 112)
    pdf.set_font("Helvetica", "", 11)
    _set_rgb(pdf, (0, 0, 0))
    pdf.cell(0, 7, "a suivi avec succes et validé la formation :", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(20, 122)
    pdf.set_font("Helvetica", "B", 13)
    _set_rgb(pdf, C_BLUE)
    pdf.cell(0, 7, f"« {formation_titre} »", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(20, 132)
    pdf.set_font("Helvetica", "", 10)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(0, 6, f"Domaine : {domaine}  |  Duree : {duree_h} heures  |  Formateur : {formateur}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Date d'obtention : {date_fin_form.strftime('%d/%m/%Y')}  |  N deg Certificat : {cert_num}", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(20, 148)
    pdf.set_font("Helvetica", "I", 10)
    _set_rgb(pdf, (0, 0, 0))
    pdf.cell(0, 6, "Ce certificat atteste la validation des competences acquises au cours de cette formation.", align="C")

    # Etoiles decoratives
    pdf.set_xy(20, 158)
    pdf.set_font("Helvetica", "B", 22)
    _set_rgb(pdf, C_YELL)
    pdf.cell(0, 10, "* * * * *", align="C", new_x="LMARGIN", new_y="NEXT")

    # Signatures
    pdf.set_xy(30, 180)
    pdf.set_font("Helvetica", "B", 9)
    _set_rgb(pdf, C_DARK)
    pdf.cell(70, 6, "Le Responsable Formation")
    pdf.cell(40, 6, "")
    pdf.cell(70, 6, "Le Directeur General", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    pdf.set_xy(30, 186)
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(70, 5, formateur)
    pdf.cell(40, 5, "")
    pdf.cell(70, 5, "ACERFI SARL", new_x="LMARGIN", new_y="NEXT")
    pdf.set_xy(30, 198)
    pdf.cell(70, 5, "_____________________")
    pdf.cell(40, 5, "")
    pdf.cell(70, 5, "_____________________", new_x="LMARGIN", new_y="NEXT")

    # Cachet
    _set_rgb(pdf, C_BLUE, "draw")
    pdf.set_line_width(1.2)
    pdf.circle(pdf.w / 2, 193, 15)
    pdf.set_xy(pdf.w / 2 - 13, 189)
    pdf.set_font("Helvetica", "B", 6)
    _set_rgb(pdf, C_DARK)
    pdf.cell(26, 4, "ACERFI SARL", align="C")
    pdf.set_xy(pdf.w / 2 - 13, 193)
    pdf.set_font("Helvetica", "", 5.5)
    pdf.cell(26, 4, "CACHET OFFICIEL", align="C")

    # Pied de page
    pdf.set_xy(20, pdf.h - 22)
    pdf.set_font("Helvetica", "I", 7)
    _set_rgb(pdf, C_GRAY)
    pdf.cell(0, 5, f"N deg Agrement : MINESEC/ACERFI/2024/001  |  Yaounde, le {date_fin_form.strftime('%d %B %Y')}  |  acerfi-sarl.cm", align="C")

    _footer_specimen(pdf)
    pdf.output(pdf_path)


# ── Générateur 5 : Attestation de travail ────────────────────────────────────

def gen_attestation(user, date_emb: date, pdf_path: str):
    """Génère une attestation de travail A4."""
    today = date.today()
    exp_att = date(today.year, today.month + 3 if today.month <= 9 else today.month - 9,
                   today.day) if today.month <= 9 else date(today.year + 1, today.month - 9, today.day)
    poste   = user.poste.titre if getattr(user, "poste", None) else "Collaborateur"
    ref_att = f"ATT/ACERFI/{today.year}/{user.id:04d}"
    anciennete_ans = (today - date_emb).days // 365

    pdf = FPDF()
    pdf.set_margins(25, 25, 25)
    pdf.set_auto_page_break(True, margin=25)
    pdf.add_page()
    W = pdf.epw

    _header_acerfi(pdf, "ATTESTATION DE TRAVAIL")

    # Ref
    pdf.set_font("Helvetica", "B", 8.5)
    _set_rgb(pdf, C_BLUE)
    pdf.cell(W * 0.5, 5.5, f"Ref : {ref_att}")
    pdf.cell(W * 0.5, 5.5, f"Yaounde, le {today.strftime('%d/%m/%Y')}", align="R", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    _separator(pdf)

    # Objet
    pdf.set_font("Helvetica", "B", 10)
    _set_rgb(pdf, C_DARK)
    pdf.cell(0, 7, "OBJET : Attestation de travail", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    pdf.ln(4)

    # Corps
    pdf.set_font("Helvetica", "", 10.5)
    civilite = "Mme" if user.last_name.upper().endswith("A") or user.last_name.upper().endswith("E") else "M."
    nom_complet = f"{user.last_name.upper()} {user.first_name}"

    corps = (
        f"Je soussigne, Directeur General de ACERFI SARL, societe de droit camerounais dont le siege "
        f"social est sis a Yaounde - Cameroun, atteste par la presente que :\n\n"
        f"{civilite} {nom_complet}, "
        f"de nationalite camerounaise, "
        f"est employe(e) au sein de notre structure depuis le {date_emb.strftime('%d %B %Y')} "
        f"({anciennete_ans} an(s) d'anciennete), "
        f"en qualite de {poste}, sous Contrat de Travail a Duree Indeterminee (CDI).\n\n"
        f"{civilite.replace('.', '')} {nom_complet} occupe ce poste avec rigueur et professionnalisme. "
        f"Il/Elle jouit d'une bonne reputation au sein de notre entreprise.\n\n"
        f"La presente attestation est delivree a la demande de l'interesse(e) et pour servir et valoir ce que de droit."
    )

    pdf.multi_cell(0, 6.5, corps, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Validite
    _set_rgb(pdf, C_BLUE, "fill")
    pdf.set_fill_color(230, 240, 255)
    pdf.set_font("Helvetica", "B", 9)
    _set_rgb(pdf, C_DARK)
    pdf.cell(0, 8, f"  Valable jusqu'au : {exp_att.strftime('%d/%m/%Y')}", fill=True, new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    pdf.ln(12)

    # Signature
    _separator(pdf)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(W * 0.55, 6, f"Fait a Yaounde, le {today.strftime('%d/%m/%Y')}")
    pdf.cell(W * 0.45, 6, "Pour ACERFI SARL", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 9)
    _set_rgb(pdf, C_DARK)
    pdf.set_xy(pdf.l_margin + W * 0.55, pdf.get_y())
    pdf.cell(W * 0.45, 6, "Le Directeur General", new_x="LMARGIN", new_y="NEXT")
    _set_rgb(pdf, (0, 0, 0))
    pdf.ln(22)
    pdf.set_xy(pdf.l_margin + W * 0.55, pdf.get_y())
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(W * 0.45, 6, "_____________________________")

    _footer_specimen(pdf)
    _watermark(pdf, "SPECIMEN")
    pdf.output(pdf_path)


# ── Sauvegarde en base ────────────────────────────────────────────────────────

def sauvegarder(employe, cat_code: str, titre: str, description: str,
                date_exp, pdf_path: str, rh_user, force: bool = False) -> tuple:
    """Crée ou met à jour un DocumentRH. Retourne (doc, created)."""
    from documents.models import CategorieDocument, DocumentRH

    categorie = CategorieDocument.objects.get(code=cat_code)

    if not force:
        existing = DocumentRH.objects.filter(
            employe=employe, categorie=categorie, titre=titre
        ).first()
        if existing:
            return existing, False

    doc = DocumentRH(
        employe=employe,
        categorie=categorie,
        titre=titre,
        description=description,
        visibilite="EMPLOYE",
        uploade_par=rh_user,
        date_expiration=date_exp,
    )
    filename = os.path.basename(pdf_path)
    with open(pdf_path, "rb") as f:
        doc.fichier.save(filename, File(f), save=True)
    return doc, True


# ── Command ───────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Génère des documents PDF de démonstration pour les employés SIRH"

    def add_arguments(self, parser):
        parser.add_argument("--employee-id", type=int, default=None,
                            help="ID d'un employé spécifique (défaut: tous)")
        parser.add_argument("--force", action="store_true",
                            help="Régénérer même si le document existe déjà")
        parser.add_argument(
            "--type",
            choices=["all", "cni", "paie", "contrat", "formation", "attestation"],
            default="all",
            help="Type de document à générer (défaut: all)",
        )

    def handle(self, *args, **options):
        from documents.models import CategorieDocument

        emp_id  = options["employee_id"]
        force   = options["force"]
        doc_type = options["type"]
        today   = date.today()

        # Trouver l'utilisateur RH pour uploade_par
        rh_user = (User.objects.filter(role__in=["RH", "ADMIN"]).first()
                   or User.objects.filter(is_superuser=True).first()
                   or User.objects.first())
        if rh_user is None:
            self.stderr.write("Aucun utilisateur trouvé en base.")
            return

        # Vérifier les catégories
        required = ["IDENTITE", "PAIE", "CONTRAT", "FORMATION", "ATTESTATION"]
        for code in required:
            if not CategorieDocument.objects.filter(code=code).exists():
                self.stderr.write(f"Catégorie manquante: {code}")
                return

        # Sélectionner les employés
        qs = User.objects.filter(is_active=True, role="EMPLOYE")
        if emp_id:
            qs = qs.filter(pk=emp_id)
        employees = list(qs)
        if not employees:
            self.stdout.write("Aucun employé trouvé.")
            return

        self.stdout.write(f"Génération pour {len(employees)} employé(s)...")
        total_created = 0

        for user in employees:
            self.stdout.write(f"\n  ── {user.get_full_name() or user.username} (id={user.id})")

            # Ancienneté
            date_emb = (user.date_joined.date() if hasattr(user, "date_joined")
                        and user.date_joined else date(2023, 1, 1))
            anc_mois = (today - date_emb).days // 30

            # Salaire brut de base
            salaire_brut = _get_salary(user)

            with tempfile.TemporaryDirectory() as tmpdir:

                # 1. CNI
                if doc_type in ("all", "cni"):
                    p = os.path.join(tmpdir, f"CNI_{user.last_name}_{user.first_name}.pdf")
                    try:
                        gen_cni(user, p)
                        seed = int(hashlib.md5(f"cni{user.id}".encode()).hexdigest()[:12], 16)
                        exp_cni = date(today.year + (10 - (seed % 8)), 1 + seed % 12, 1 + seed % 26)
                        _, created = sauvegarder(
                            user, "IDENTITE",
                            f"Copie CNI - {user.last_name.upper()} {user.first_name}",
                            "Carte Nationale d'Identite biometrique camerounaise (specimen pedagogique)",
                            exp_cni, p, rh_user, force,
                        )
                        if created:
                            total_created += 1
                            self.stdout.write("    [OK] CNI")
                        else:
                            self.stdout.write("    [--] CNI (existe deja)")
                    except Exception as e:
                        self.stderr.write(f"    [ERR] CNI: {e}")

                # 2. Bulletins de paie (2 mois consécutifs)
                if doc_type in ("all", "paie"):
                    m2, a2 = (today.month - 1 or 12), (today.year if today.month > 1 else today.year - 1)
                    m1, a1 = (m2 - 1 or 12), (a2 if m2 > 1 else a2 - 1)
                    for mois, annee in [(m1, a1), (m2, a2)]:
                        paie = calculer_paie(salaire_brut, anc_mois)
                        nom_bull = f"Bulletin_de_paie_{MOIS_FR[mois]}_{annee}_{user.last_name}_{user.first_name}.pdf"
                        p = os.path.join(tmpdir, nom_bull)
                        try:
                            gen_bulletin(user, mois, annee, paie, p)
                            _, created = sauvegarder(
                                user, "PAIE",
                                f"Bulletin de paie - {MOIS_FR[mois]} {annee}",
                                f"Bulletin de paie mensuel - periode {MOIS_FR[mois]} {annee}",
                                None, p, rh_user, force,
                            )
                            if created:
                                total_created += 1
                                self.stdout.write(f"    [OK] Bulletin {MOIS_FR[mois]} {annee}")
                            else:
                                self.stdout.write(f"    [--] Bulletin {MOIS_FR[mois]} {annee} (existe)")
                        except Exception as e:
                            self.stderr.write(f"    [ERR] Bulletin {MOIS_FR[mois]}: {e}")

                # 3. Contrat CDI
                if doc_type in ("all", "contrat"):
                    p = os.path.join(tmpdir, f"Contrat_CDI_{user.last_name}_{user.first_name}.pdf")
                    try:
                        gen_contrat(user, salaire_brut, p)
                        _, created = sauvegarder(
                            user, "CONTRAT",
                            f"Contrat CDI - {user.last_name.upper()} {user.first_name}",
                            "Contrat de Travail a Duree Indeterminee - ACERFI SARL",
                            None, p, rh_user, force,
                        )
                        if created:
                            total_created += 1
                            self.stdout.write("    [OK] Contrat CDI")
                        else:
                            self.stdout.write("    [--] Contrat CDI (existe)")
                    except Exception as e:
                        self.stderr.write(f"    [ERR] Contrat: {e}")

                # 4. Certificat de formation
                if doc_type in ("all", "formation"):
                    # Chercher une vraie formation validée
                    form_data = _get_formation(user)
                    seed = int(hashlib.md5(f"form{user.id}".encode()).hexdigest()[:8], 16)
                    if form_data is None:
                        idx = seed % len(FORMATIONS_DEMO)
                        form_titre, domaine, duree_h, formateur = FORMATIONS_DEMO[idx]
                        date_form = date(today.year - (seed % 2), 1 + seed % 11, 1 + seed % 25)
                    else:
                        form_titre, domaine, duree_h, formateur, date_form = form_data
                    cert_num = f"CERT/ACERFI/{date_form.year}/{user.id:04d}{seed % 100:02d}"
                    p = os.path.join(tmpdir, f"Certificat_Formation_{user.last_name}_{user.first_name}.pdf")
                    try:
                        gen_certificat_formation(user, form_titre, domaine, duree_h,
                                                 formateur, date_form, cert_num, p)
                        _, created = sauvegarder(
                            user, "FORMATION",
                            f"Certificat - {form_titre}",
                            f"Certificat de formation : {form_titre} ({duree_h}h)",
                            None, p, rh_user, force,
                        )
                        if created:
                            total_created += 1
                            self.stdout.write(f"    [OK] Certificat : {form_titre}")
                        else:
                            self.stdout.write("    [--] Certificat (existe)")
                    except Exception as e:
                        self.stderr.write(f"    [ERR] Certificat: {e}")

                # 5. Attestation de travail
                if doc_type in ("all", "attestation"):
                    p = os.path.join(tmpdir, f"Attestation_{user.last_name}_{user.first_name}.pdf")
                    exp_att = date(today.year + (1 if today.month > 9 else 0),
                                   (today.month + 3) % 12 or 12, min(today.day, 28))
                    try:
                        gen_attestation(user, date_emb, p)
                        _, created = sauvegarder(
                            user, "ATTESTATION",
                            f"Attestation de travail - {user.last_name.upper()} {user.first_name}",
                            "Attestation de travail delivree par ACERFI SARL",
                            exp_att, p, rh_user, force,
                        )
                        if created:
                            total_created += 1
                            self.stdout.write("    [OK] Attestation de travail")
                        else:
                            self.stdout.write("    [--] Attestation (existe)")
                    except Exception as e:
                        self.stderr.write(f"    [ERR] Attestation: {e}")

        self.stdout.write(
            self.style.SUCCESS(f"\nTermine. {total_created} document(s) cree(s).")
        )

        # Résumé de paie pour le premier employé (témoin)
        if employees:
            u = employees[0]
            sb = _get_salary(u)
            anc = (today - (u.date_joined.date() if hasattr(u, "date_joined") and u.date_joined else today)).days // 30
            p = calculer_paie(sb, anc)
            self.stdout.write("\n" + "=" * 56)
            self.stdout.write(f"RESUME PAIE - {u.get_full_name() or u.username}")
            self.stdout.write("=" * 56)
            self.stdout.write(f"  Salaire categoriel   : {_fmt(p['salaire_categoriel'])}")
            self.stdout.write(f"  Prime anciennete     : {_fmt(p['prime_anciennete'])}")
            self.stdout.write(f"  Indemnite transport  : {_fmt(p['indemnite_transport'])}")
            self.stdout.write(f"  TOTAL BRUT           : {_fmt(p['total_brut'])}")
            self.stdout.write(f"  ──────────────────────────────────")
            self.stdout.write(f"  CNPS salarie (4,2%)  : -{_fmt(p['cnps_s'])}")
            self.stdout.write(f"  CFC salarie (1,0%)   : -{_fmt(p['cfc_s'])}")
            self.stdout.write(f"  SNC mensuel          : {_fmt(p['snc'])}")
            self.stdout.write(f"  IRPP                 : -{_fmt(p['irpp'])}")
            self.stdout.write(f"  CAC (10% IRPP)       : -{_fmt(p['cac'])}")
            self.stdout.write(f"  RAV                  : -{_fmt(p['rav'])}")
            self.stdout.write(f"  TDL                  : -{_fmt(p['tdl'])}")
            self.stdout.write(f"  TOTAL RETENUES       : -{_fmt(p['total_retenues'])}")
            self.stdout.write(f"  ══════════════════════════════════")
            self.stdout.write(f"  NET A PAYER          : {_fmt(p['net_a_payer'])}")
            self.stdout.write(f"  En lettres           : {montant_en_lettres(p['net_a_payer'])}")
            self.stdout.write("=" * 56)


def _get_salary(user) -> int:
    """Récupère le salaire depuis le contrat actif ou utilise le défaut par catégorie."""
    try:
        from contrats.models import Contrat
        contrat = Contrat.objects.filter(
            employe=user, statut="ACTIF"
        ).order_by("-date_debut").first()
        if contrat and contrat.salaire:
            return int(contrat.salaire)
    except Exception:
        pass
    cat = getattr(user, "categorie_pro", "IV") or "IV"
    return SALAIRE_CATEGORIE.get(cat, 280_000)


def _get_formation(user) -> tuple | None:
    """Récupère la dernière formation validée de l'employé, ou None."""
    try:
        from formations.models import InscriptionFormation
        insc = InscriptionFormation.objects.filter(
            employe=user,
            statut__in=["VALIDE", "TERMINE", "COMPLETE", "CERTIFIE"],
        ).select_related("formation").order_by("-formation__date_fin").first()
        if insc:
            f = insc.formation
            titre = f.titre
            domaine = f.categorie.nom if getattr(f, "categorie", None) else "Formation professionnelle"
            duree_h = int(f.duree_heures or 16)
            formateur = f.formateur or "Formateur ACERFI"
            date_fin = f.date_fin or date.today()
            return titre, domaine, duree_h, formateur, date_fin
    except Exception:
        pass
    return None
