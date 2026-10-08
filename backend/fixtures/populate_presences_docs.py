"""
Peuplement SIRH - Presences (avr+mai 2026) et Documents RH
Idempotent : verifie existence avant creation.
Execution : python manage.py shell -c "exec(open('fixtures/populate_presences_docs.py', encoding='utf-8').read())"
"""
import random
from datetime import date, time, timedelta
from calendar import monthrange


# ─── Helpers ─────────────────────────────────────────────────────────────────

def jours_ouvrables(annee, mois, feries=None):
    feries = feries or set()
    _, dernier = monthrange(annee, mois)
    return [
        date(annee, mois, j)
        for j in range(1, dernier + 1)
        if date(annee, mois, j).weekday() < 5
        and date(annee, mois, j) not in feries
    ]


def h(heure, minute):
    return time(heure, minute)


# ─── Présences ───────────────────────────────────────────────────────────────

def creer_presences():
    from presences.models import Pointage
    from accounts.models import User
    from entreprises.models import Entreprise

    random.seed(42)

    entreprise = Entreprise.objects.filter(slug="acerfi-sarl").first()
    rh_user    = User.objects.filter(username="lucky").first()
    employes   = list(User.objects.filter(
        entreprise=entreprise,
        role__in=["EMPLOYE", "MANAGER", "RH"],
        is_active=True,
    ).exclude(username__in=["admin.sirh", "Alice", "Stan"]))

    # Jours fériés camerounais 2026 couverts
    feries = {
        date(2026, 1, 1),   # Jour de l'An
        date(2026, 2, 11),  # Fête de la Jeunesse
        date(2026, 5, 1),   # Fête du Travail
        date(2026, 5, 20),  # Fête Nationale
    }

    # Générer avr + mai 2026 (juin 2-13 existe déjà via populate_demo.py)
    jours = []
    for mois in [4, 5]:
        jours.extend(jours_ouvrables(2026, mois, feries))

    notes_retard  = ["Embouteillages sur l'axe lourd", "Panne de moto",
                     "Problème transport en commun", "Rendez-vous médical matinal"]
    notes_absence = ["Absence maladie - certificat fourni", "Absence familiale justifiée",
                     "Absence personnelle autorisée", "Maladie enfant"]

    crees = 0
    for employe in employes:
        random.seed(hash(employe.username) % 10000)
        for jour in jours:
            if Pointage.objects.filter(employe=employe, date=jour).exists():
                continue

            rand = random.random()

            if jour in feries:
                statut, h_arr, h_dep, note = "ABSENT", None, None, "Jour ferié"
            elif rand < 0.04:                          # 4 % absent
                statut = "ABSENT"
                h_arr, h_dep = None, None
                note = random.choice(notes_absence)
            elif rand < 0.12:                          # 8 % retard
                statut = "RETARD"
                h_arr = h(8, random.randint(20, 55))
                h_dep = h(random.randint(17, 18), random.randint(0, 45))
                note  = random.choice(notes_retard)
            else:                                      # 88 % présent
                statut = "PRESENT"
                arr_h  = 7 if random.random() < 0.4 else 8
                arr_m  = random.randint(30, 59) if arr_h == 7 else random.randint(0, 14)
                h_arr  = h(arr_h, arr_m)
                dep_h  = random.randint(17, 18)
                dep_m  = random.randint(0, 59)
                # 15 % font des heures sup (départ après 18h30)
                if random.random() < 0.15:
                    dep_h, dep_m = 19, random.randint(0, 30)
                h_dep  = h(dep_h, dep_m)
                note   = ""

            pt = Pointage(
                employe=employe,
                date=jour,
                heure_arrivee=h_arr,
                heure_depart=h_dep,
                statut=statut,
                note=note,
                entreprise=entreprise,
                valide_par=rh_user,
            )
            pt.save()
            crees += 1

    print(f"  Presences : {crees} pointages crees pour {len(employes)} employes (avr+mai 2026)")
    return crees


# ─── Documents RH ────────────────────────────────────────────────────────────

def creer_categories():
    from documents.models import CategorieDocument
    cats_data = [
        ("Contrat de travail",       "CONTRAT",     "fas fa-file-contract",  "#1F3864"),
        ("Attestation & Certificat", "ATTESTATION", "fas fa-certificate",    "#28A745"),
        ("Bulletin de paie",         "PAIE",        "fas fa-coins",          "#FFC107"),
        ("Formation & Diplome",      "FORMATION",   "fas fa-graduation-cap", "#17A2B8"),
        ("Sanctions disciplinaires", "SANCTION",    "fas fa-gavel",          "#DC3545"),
        ("Pieces d'identite",        "IDENTITE",    "fas fa-id-card",        "#6F42C1"),
        ("Politiques & Reglements",  "POLITIQUE",   "fas fa-book",           "#E76F51"),
    ]
    cats = {}
    for nom, code, icone, couleur in cats_data:
        c, _ = CategorieDocument.objects.get_or_create(
            code=code,
            defaults={"nom": nom, "icone": icone, "couleur": couleur,
                      "description": f"Documents de type {nom}"}
        )
        cats[code] = c
    print(f"  Categories : {len(cats)} (CONTRAT/ATTESTATION/PAIE/FORMATION/SANCTION/IDENTITE/POLITIQUE)")
    return cats


def creer_documents(cats):
    from documents.models import DocumentRH
    from accounts.models import User
    from entreprises.models import Entreprise

    entreprise = Entreprise.objects.filter(slug="acerfi-sarl").first()
    rh         = User.objects.filter(username="lucky").first()

    def u(username):
        return User.objects.filter(username=username).first()

    PRIVE   = "PRIVE"
    EMPLOYE = "EMPLOYE"
    TOUS    = "TOUS"

    docs_data = [
        # ── Politiques générales (pas d'employé spécifique) ──────────────────
        {
            "titre":       "Reglement interieur ACERFI SARL 2026",
            "employe":     None,
            "categorie":   cats["POLITIQUE"],
            "description": "Reglement interieur applicable a l'ensemble du personnel ACERFI SARL — edition 2026.",
            "fichier":     "documents_rh/2026/01/reglement_interieur_2026.pdf",
            "taille":      487200,
            "visibilite":  TOUS,
            "expiration":  None,
        },
        {
            "titre":       "Politique de conges et absences 2026",
            "employe":     None,
            "categorie":   cats["POLITIQUE"],
            "description": "Regles d'attribution des conges annuels, conges maladie et autorisations d'absence.",
            "fichier":     "documents_rh/2026/01/politique_conges_2026.pdf",
            "taille":      215400,
            "visibilite":  TOUS,
            "expiration":  None,
        },
        {
            "titre":       "Charte informatique et cybersecurite",
            "employe":     None,
            "categorie":   cats["POLITIQUE"],
            "description": "Regles d'utilisation du systeme d'information, des equipements et d'internet au sein d'ACERFI.",
            "fichier":     "documents_rh/2026/01/charte_informatique.pdf",
            "taille":      132800,
            "visibilite":  TOUS,
            "expiration":  None,
        },
        {
            "titre":       "Note circulaire : Tenues vestimentaires",
            "employe":     None,
            "categorie":   cats["POLITIQUE"],
            "description": "Directive relative aux tenues professionnelles obligatoires dans les locaux ACERFI.",
            "fichier":     "documents_rh/2026/03/note_tenues_vestimentaires.pdf",
            "taille":      98300,
            "visibilite":  TOUS,
            "expiration":  None,
        },
        # ── Contrats ─────────────────────────────────────────────────────────
        {
            "titre":       "Contrat CDI — Alice MBALLA",
            "employe":     u("alice.mballa"),
            "categorie":   cats["CONTRAT"],
            "description": "Contrat a Duree Indeterminee, poste Developpeur Full Stack, departement IT.",
            "fichier":     "documents_rh/2024/03/contrat_cdi_alice_mballa.pdf",
            "taille":      328000,
            "visibilite":  EMPLOYE,
            "expiration":  None,
        },
        {
            "titre":       "Contrat CDI — Kevin NGUEMA",
            "employe":     u("kevin.nguema"),
            "categorie":   cats["CONTRAT"],
            "description": "Contrat a Duree Indeterminee, poste Administrateur Systeme, departement IT.",
            "fichier":     "documents_rh/2024/07/contrat_cdi_kevin_nguema.pdf",
            "taille":      311500,
            "visibilite":  EMPLOYE,
            "expiration":  None,
        },
        {
            "titre":       "Contrat CDD — Marie TALLA",
            "employe":     u("marie.talla"),
            "categorie":   cats["CONTRAT"],
            "description": "Contrat a Duree Determinee, poste Charge Communication Digitale, expire le 31/12/2026.",
            "fichier":     "documents_rh/2025/06/contrat_cdd_marie_talla.pdf",
            "taille":      295000,
            "visibilite":  EMPLOYE,
            "expiration":  date(2026, 12, 31),
        },
        {
            "titre":       "Contrat CDI — Beatrice MENDO",
            "employe":     u("beatrice.mendo"),
            "categorie":   cats["CONTRAT"],
            "description": "Contrat a Duree Indeterminee, poste Comptable Analytique, departement Finance.",
            "fichier":     "documents_rh/2024/02/contrat_cdi_beatrice_mendo.pdf",
            "taille":      302400,
            "visibilite":  EMPLOYE,
            "expiration":  None,
        },
        # ── Attestations ─────────────────────────────────────────────────────
        {
            "titre":       "Attestation de travail — Alice MBALLA",
            "employe":     u("alice.mballa"),
            "categorie":   cats["ATTESTATION"],
            "description": "Attestation certifiant qu'Alice MBALLA est employee a temps plein au sein d'ACERFI SARL depuis mars 2024.",
            "fichier":     "documents_rh/2026/04/attestation_travail_alice_mballa.pdf",
            "taille":      87400,
            "visibilite":  EMPLOYE,
            "expiration":  date(2026, 10, 30),
        },
        {
            "titre":       "Attestation de travail — Paul FOPA",
            "employe":     u("paul.fopa"),
            "categorie":   cats["ATTESTATION"],
            "description": "Attestation de salaire et de travail pour Paul FOPA, etablie a la demande de l'employe.",
            "fichier":     "documents_rh/2026/04/attestation_travail_paul_fopa.pdf",
            "taille":      85200,
            "visibilite":  EMPLOYE,
            "expiration":  date(2026, 10, 30),
        },
        {
            "titre":       "Attestation de travail — Kevin NGUEMA",
            "employe":     u("kevin.nguema"),
            "categorie":   cats["ATTESTATION"],
            "description": "Attestation de travail delivree pour dossier bancaire — Credit du Sahel.",
            "fichier":     "documents_rh/2026/05/attestation_travail_kevin_nguema.pdf",
            "taille":      83600,
            "visibilite":  EMPLOYE,
            "expiration":  date(2026, 11, 30),
        },
        {
            "titre":       "Attestation de travail — Eric ESSOMBA",
            "employe":     u("eric.essomba"),
            "categorie":   cats["ATTESTATION"],
            "description": "Attestation de travail et de revenus, departement Finance & Comptabilite.",
            "fichier":     "documents_rh/2026/03/attestation_travail_eric_essomba.pdf",
            "taille":      82000,
            "visibilite":  EMPLOYE,
            "expiration":  date(2026, 9, 30),
        },
        # ── Bulletins de paie ─────────────────────────────────────────────────
        {
            "titre":       "Bulletin de paie avril 2026 — Alice MBALLA",
            "employe":     u("alice.mballa"),
            "categorie":   cats["PAIE"],
            "description": "Bulletin de salaire — periode avril 2026. Inclus : brut, CNPS 2,8%, IRPP, net a payer.",
            "fichier":     "documents_rh/2026/04/bulletin_avril2026_alice_mballa.pdf",
            "taille":      124800,
            "visibilite":  EMPLOYE,
            "expiration":  None,
        },
        {
            "titre":       "Bulletin de paie avril 2026 — Paul FOPA",
            "employe":     u("paul.fopa"),
            "categorie":   cats["PAIE"],
            "description": "Bulletin de salaire — periode avril 2026.",
            "fichier":     "documents_rh/2026/04/bulletin_avril2026_paul_fopa.pdf",
            "taille":      123600,
            "visibilite":  EMPLOYE,
            "expiration":  None,
        },
        {
            "titre":       "Bulletin de paie mai 2026 — Alice MBALLA",
            "employe":     u("alice.mballa"),
            "categorie":   cats["PAIE"],
            "description": "Bulletin de salaire — periode mai 2026.",
            "fichier":     "documents_rh/2026/05/bulletin_mai2026_alice_mballa.pdf",
            "taille":      124800,
            "visibilite":  EMPLOYE,
            "expiration":  None,
        },
        {
            "titre":       "Bulletin de paie mai 2026 — Paul FOPA",
            "employe":     u("paul.fopa"),
            "categorie":   cats["PAIE"],
            "description": "Bulletin de salaire — periode mai 2026.",
            "fichier":     "documents_rh/2026/05/bulletin_mai2026_paul_fopa.pdf",
            "taille":      123600,
            "visibilite":  EMPLOYE,
            "expiration":  None,
        },
        {
            "titre":       "Bulletin de paie mai 2026 — Kevin NGUEMA",
            "employe":     u("kevin.nguema"),
            "categorie":   cats["PAIE"],
            "description": "Bulletin de salaire — periode mai 2026.",
            "fichier":     "documents_rh/2026/05/bulletin_mai2026_kevin_nguema.pdf",
            "taille":      122400,
            "visibilite":  EMPLOYE,
            "expiration":  None,
        },
        # ── Formations & Certifications ───────────────────────────────────────
        {
            "titre":       "Certificat — Django REST Framework avance",
            "employe":     u("alice.mballa"),
            "categorie":   cats["FORMATION"],
            "description": "Certificat de completion formation Django REST Framework avance — Openclassrooms, mars 2026.",
            "fichier":     "documents_rh/2026/03/certif_django_alice_mballa.pdf",
            "taille":      198400,
            "visibilite":  EMPLOYE,
            "expiration":  None,
        },
        {
            "titre":       "Certificat PMP — Paul ATANGANA",
            "employe":     u("paul.atangana"),
            "categorie":   cats["FORMATION"],
            "description": "Project Management Professional (PMP) — PMI Institute. Valide jusqu'au 15/04/2029.",
            "fichier":     "documents_rh/2026/04/certif_pmp_paul_atangana.pdf",
            "taille":      241600,
            "visibilite":  EMPLOYE,
            "expiration":  date(2029, 4, 15),
        },
        {
            "titre":       "Attestation formation — Excel avance et tableaux de bord",
            "employe":     u("eric.essomba"),
            "categorie":   cats["FORMATION"],
            "description": "Formation Excel avance et Power BI, organisme CECAM Yaounde, fevrier 2026.",
            "fichier":     "documents_rh/2026/02/attestation_excel_eric_essomba.pdf",
            "taille":      176200,
            "visibilite":  EMPLOYE,
            "expiration":  None,
        },
        {
            "titre":       "Certificat — Marketing Digital et SEO",
            "employe":     u("marie.talla"),
            "categorie":   cats["FORMATION"],
            "description": "Certification Google Digital Marketing & E-commerce. Obtenu le 12 janvier 2026.",
            "fichier":     "documents_rh/2026/01/certif_google_marketing_marie_talla.pdf",
            "taille":      215000,
            "visibilite":  EMPLOYE,
            "expiration":  date(2028, 1, 12),
        },
        # ── Pièces d'identité ────────────────────────────────────────────────
        {
            "titre":       "Copie CNI — Alice MBALLA",
            "employe":     u("alice.mballa"),
            "categorie":   cats["IDENTITE"],
            "description": "Copie de la Carte Nationale d'Identite camerounaise. Expire le 15/03/2028.",
            "fichier":     "documents_rh/2024/03/cni_alice_mballa.pdf",
            "taille":      412800,
            "visibilite":  PRIVE,
            "expiration":  date(2028, 3, 15),
        },
        {
            "titre":       "Copie CNI — Paul FOPA",
            "employe":     u("paul.fopa"),
            "categorie":   cats["IDENTITE"],
            "description": "Copie de la Carte Nationale d'Identite camerounaise. Expire le 20/06/2029.",
            "fichier":     "documents_rh/2024/03/cni_paul_fopa.pdf",
            "taille":      389600,
            "visibilite":  PRIVE,
            "expiration":  date(2029, 6, 20),
        },
        {
            "titre":       "Copie CNI — Marie TALLA",
            "employe":     u("marie.talla"),
            "categorie":   cats["IDENTITE"],
            "description": "Copie de la Carte Nationale d'Identite camerounaise. A renouveler avant decembre 2027.",
            "fichier":     "documents_rh/2025/06/cni_marie_talla.pdf",
            "taille":      401200,
            "visibilite":  PRIVE,
            "expiration":  date(2027, 12, 1),
        },
        # ── Sanctions ────────────────────────────────────────────────────────
        {
            "titre":       "Avertissement ecrit — Retards repetes (Armelle NKOMO)",
            "employe":     u("armelle.nkomo"),
            "categorie":   cats["SANCTION"],
            "description": "Premier avertissement ecrit pour retards repetes non justifies. Date : 02/06/2026.",
            "fichier":     "documents_rh/2026/06/avertissement_armelle_nkomo.pdf",
            "taille":      94000,
            "visibilite":  PRIVE,
            "expiration":  None,
        },
    ]

    crees = 0
    for d in docs_data:
        if DocumentRH.objects.filter(titre=d["titre"]).exists():
            continue
        doc = DocumentRH(
            employe=d["employe"],
            categorie=d["categorie"],
            titre=d["titre"],
            description=d["description"],
            visibilite=d["visibilite"],
            date_expiration=d["expiration"],
            uploade_par=rh,
            taille_fichier=d["taille"],
        )
        doc.fichier = d["fichier"]          # FileField accepte une chaine (chemin fictif)
        doc.save()
        crees += 1

    print(f"  Documents  : {crees} crees (4 politiques, 4 contrats, 4 attestations, 5 bulletins, 4 formations, 3 CNI, 1 sanction)")
    return crees


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    sep = "=" * 50

    print(sep)
    print("  SIRH -- Peuplement Presences + Documents")
    print(sep)

    print("\n[1/3] Categories de documents...")
    cats = creer_categories()

    print("\n[2/3] Documents RH...")
    creer_documents(cats)

    print("\n[3/3] Presences avr+mai 2026...")
    creer_presences()

    print("\n" + sep)
    print("  Termine avec succes !")
    print(sep)


main()
