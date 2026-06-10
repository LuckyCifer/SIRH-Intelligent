"""
Services paie — Génération PDF des bulletins de paie.
Utilise WeasyPrint si disponible, sinon retourne du HTML.
"""
from io import BytesIO

MOIS_LABELS = [
    "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]


def _html_bulletin(bulletin):
    b = bulletin
    total_brut = int(b.salaire_brut + b.total_primes)
    date_gen = b.updated_at.strftime("%d/%m/%Y") if b.updated_at else ""
    primes_row = (
        f"<tr><td>Primes & indemnités</td>"
        f"<td class='amount'>{int(b.total_primes):,} FCFA</td></tr>"
        if b.total_primes else ""
    )
    retenues_row = (
        f"<tr><td>Autres retenues</td>"
        f"<td class='amount retenue'>- {int(b.autres_retenues):,} FCFA</td></tr>"
        if b.autres_retenues else ""
    )
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Bulletin de paie {b.mois:02d}/{b.annee}</title>
  <style>
    body {{ font-family: Arial, sans-serif; font-size: 12px; color: #222; margin: 30px; }}
    h1   {{ color: #2E74B5; font-size: 18px; margin: 0 0 4px; }}
    .header {{ display: flex; justify-content: space-between;
               border-bottom: 2px solid #2E74B5; padding-bottom: 12px; margin-bottom: 20px; }}
    .company {{ text-align: right; color: #555; }}
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 16px; }}
    th {{ background: #2E74B5; color: #fff; padding: 7px 10px; text-align: left; font-size: 12px; }}
    td {{ padding: 6px 10px; border-bottom: 1px solid #eee; }}
    .amount {{ text-align: right; font-weight: bold; }}
    .retenue {{ color: #dc3545; }}
    .row-total {{ background: #f0f0f0; font-weight: bold; }}
    .row-net   {{ background: #d4edda; font-weight: bold; font-size: 14px; color: #155724; }}
    .footer    {{ text-align: center; color: #aaa; font-size: 10px; margin-top: 30px; }}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Bulletin de paie</h1>
      <p style="margin:4px 0"><strong>Période :</strong> {MOIS_LABELS[b.mois]} {b.annee}</p>
      <p style="margin:4px 0"><strong>Statut :</strong> {b.get_statut_display()}</p>
    </div>
    <div class="company">
      <strong>ACERFI SARL</strong><br>Yaoundé, Cameroun<br>
      <small>Généré le {date_gen}</small>
    </div>
  </div>

  <table>
    <tr><th colspan="2">Informations employé</th></tr>
    <tr><td>Nom complet</td><td><strong>{b.employe.get_full_name()}</strong></td></tr>
    <tr><td>Identifiant</td><td>{b.employe.username}</td></tr>
    <tr><td>Email</td><td>{b.employe.email or "—"}</td></tr>
  </table>

  <table>
    <tr><th>Libellé</th><th style="text-align:right">Montant</th></tr>
    <tr><td>Salaire de base</td><td class="amount">{int(b.salaire_brut):,} FCFA</td></tr>
    {primes_row}
    <tr class="row-total">
      <td>Total brut</td><td class="amount">{total_brut:,} FCFA</td>
    </tr>
    <tr><td>CNPS employé (2,8 %)</td>
        <td class="amount retenue">- {int(b.cnps_employe):,} FCFA</td></tr>
    <tr><td>IRPP</td>
        <td class="amount retenue">- {int(b.irpp):,} FCFA</td></tr>
    {retenues_row}
    <tr class="row-net">
      <td>Net à payer</td><td class="amount">{int(b.salaire_net):,} FCFA</td>
    </tr>
  </table>

  <p class="footer">
    Document généré automatiquement par le SIRH ACERFI — Cameroun
  </p>
</body>
</html>"""


def generer_bulletin_pdf(bulletin):
    """
    Génère le bulletin de paie en PDF (WeasyPrint) ou HTML en fallback.
    Retourne un tuple (bytes, content_type, filename).
    """
    html = _html_bulletin(bulletin)
    filename_base = f"bulletin_{bulletin.employe.username}_{bulletin.mois:02d}_{bulletin.annee}"
    try:
        from weasyprint import HTML
        buf = BytesIO()
        HTML(string=html).write_pdf(buf)
        return buf.getvalue(), "application/pdf", f"{filename_base}.pdf"
    except Exception:
        return html.encode("utf-8"), "text/html", f"{filename_base}.html"
