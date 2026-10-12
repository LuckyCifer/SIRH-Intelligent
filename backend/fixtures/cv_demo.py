"""
CV fictifs de démonstration pour les candidatures dont le fichier est absent.

Usage :
    python manage.py shell -c "exec(open('fixtures/cv_demo.py', encoding='utf-8').read())"

- Ne modifie que les candidatures dont le fichier CV n'existe pas sur le disque.
- Correspondance variable avec l'offre (forte, moyenne, faible) ; formats variés :
  PDF texte, Word (.docx) et un PDF scanné (image seule) pour montrer ce cas.
- Toutes les données sont fictives.
"""
import io

from django.core.files.base import ContentFile
from django.utils.text import slugify

from recrutements.cv import liste_competences
from recrutements.models import Candidature

AUTRES_COMPETENCES = ["Pack Office", "Travail en équipe", "Rédaction de rapports", "Service client"]
PARTS = [1.0, 0.7, 0.4]          # part des compétences de l'offre reprises dans le CV


def _lignes(c, competences):
    return [
        c.nom_complet,
        "Adresse : Quartier Akwa, Douala",
        "Téléphone : +237 6 00 00 00 00",
        f"Email : {c.email}",
        "",
        "PROFIL",
        f"Candidat au poste de {c.offre.titre}. Rigoureux, autonome et orienté résultats.",
        "",
        "EXPÉRIENCE PROFESSIONNELLE",
        "2021 - 2025 : Poste similaire dans une PME de Douala (missions variées, encadrement).",
        "2019 - 2021 : Stage puis contrat à durée déterminée dans le même secteur.",
        "",
        "COMPÉTENCES",
        ", ".join(competences + AUTRES_COMPETENCES[:2]),
        "",
        "FORMATION",
        "Licence professionnelle, Université de Douala",
        "Langues : français courant, anglais intermédiaire",
    ]


def _pdf(lignes):
    from fpdf import FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    for ligne in lignes:
        pdf.multi_cell(0, 6, ligne, new_x="LMARGIN", new_y="NEXT")
    return bytes(pdf.output()), "pdf"


def _docx(lignes):
    import docx
    document = docx.Document()
    for ligne in lignes:
        document.add_paragraph(ligne)
    tampon = io.BytesIO()
    document.save(tampon)
    return tampon.getvalue(), "docx"


def _scanne():
    from fpdf import FPDF
    from PIL import Image, ImageDraw
    image = Image.new("RGB", (800, 1100), "white")
    ImageDraw.Draw(image).text((60, 60), "CV (document scanné)", fill="black")
    tampon = io.BytesIO()
    image.save(tampon, format="PNG")
    tampon.seek(0)
    pdf = FPDF()
    pdf.add_page()
    pdf.image(tampon, x=10, y=10, w=190)
    return bytes(pdf.output()), "pdf"


crees = 0
for i, c in enumerate(Candidature.objects.select_related("offre").order_by("pk")):
    if c.cv and c.cv.storage.exists(c.cv.name):
        continue
    requises = liste_competences(c.offre.competences_requises)
    part = PARTS[i % len(PARTS)]
    reprises = requises[:max(1, round(len(requises) * part))] if requises else []
    if i % 7 == 6:
        contenu, extension = _scanne()
    elif i % 5 == 4:
        contenu, extension = _docx(_lignes(c, reprises))
    else:
        contenu, extension = _pdf(_lignes(c, reprises))
    c.cv.save(f"cv_{slugify(c.nom_complet) or c.pk}.{extension}", ContentFile(contenu), save=True)
    crees += 1
    print(f"  #{c.pk} {c.nom_complet:28} {extension:4} {len(reprises)}/{len(requises)} compétences de l'offre")

print(f"CV fictifs créés : {crees}")
