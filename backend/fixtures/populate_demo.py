"""
Script de peuplement complet SIRH — ACERFI SARL
Exécuter : python manage.py shell < fixtures/populate_demo.py
Idempotent : get_or_create partout.
"""
import random
from datetime import date, time, timedelta, datetime
from decimal import Decimal
from django.utils import timezone


def creer_entreprise():
    from entreprises.models import Entreprise
    e, created = Entreprise.objects.get_or_create(
        slug="acerfi-sarl",
        defaults={
            "nom": "ACERFI SARL",
            "sigle": "ACERFI",
            "secteur": "EDU",
            "taille": "PME",
            "ville": "Yaoundé",
            "pays": "Cameroun",
            "telephone": "+237 695 08 08 08",
            "email": "contact@acerfi.net",
            "site_web": "https://acerfi.net",
            "couleur_primaire": "#1F3864",
            "couleur_secondaire": "#2E74B5",
            "statut": "ACTIVE",
            "devise": "FCFA",
            "nb_employes_max": 100,
        }
    )
    if not created:
        e.nb_employes_max = 100
        e.save()
    print(f"  Entreprise : {e.nom} ({'créée' if created else 'existante'})")
    return e


def creer_departements(entreprise):
    from departements.models import Departement
    depts_data = [
        ("Direction Générale",        "DG",      "#1F3864", "fas fa-chess-king"),
        ("Ressources Humaines",       "RH-DEPT", "#2E74B5", "fas fa-users"),
        ("Informatique & Systèmes",   "IT",      "#2A9D8F", "fas fa-laptop-code"),
        ("Finance & Comptabilité",    "FIN",     "#E76F51", "fas fa-chart-line"),
        ("Marketing & Communication", "MKT",     "#E63946", "fas fa-bullhorn"),
        ("Formation & Pédagogie",     "FORM",    "#7B2D8B", "fas fa-graduation-cap"),
        ("Commercial & Ventes",       "COM",     "#F4A261", "fas fa-handshake"),
        ("Production & Opérations",   "PROD",    "#457B9D", "fas fa-cogs"),
    ]
    depts = {}
    for nom, code, couleur, icone in depts_data:
        d, _ = Departement.objects.get_or_create(
            code=code,
            defaults={"nom": nom, "couleur": couleur, "icone": icone,
                      "entreprise": entreprise, "actif": True}
        )
        if not d.entreprise:
            d.entreprise = entreprise
            d.save()
        depts[code] = d
    print(f"  Départements : {len(depts)}")
    return depts


def creer_postes(depts, entreprise):
    from departements.models import Poste
    postes_data = [
        ("DG",      "Directeur Général",              "DIRECTION", 800000, 1500000),
        ("DG",      "Assistante de Direction",         "CONFIRME",  300000,  450000),
        ("RH-DEPT", "Responsable RH",                  "CHEF",      450000,  650000),
        ("RH-DEPT", "Chargé RH & Paie",                "CONFIRME",  280000,  380000),
        ("IT",      "Développeur Full Stack",           "CONFIRME",  400000,  600000),
        ("IT",      "Administrateur Système",           "CONFIRME",  380000,  550000),
        ("FIN",     "Chef Comptable",                   "CHEF",      500000,  700000),
        ("FIN",     "Comptable Analytique",             "CONFIRME",  300000,  420000),
        ("MKT",     "Responsable Marketing",            "CHEF",      420000,  580000),
        ("MKT",     "Chargé Communication Digitale",    "JUNIOR",    220000,  320000),
        ("FORM",    "Coordinateur Pédagogique",         "CHEF",      450000,  600000),
        ("FORM",    "Formateur Senior",                 "SENIOR",    380000,  520000),
        ("COM",     "Directeur Commercial",             "CHEF",      500000,  750000),
        ("COM",     "Commercial Terrain",               "JUNIOR",    200000,  350000),
        ("PROD",    "Chef de Production",               "CHEF",      480000,  650000),
        ("PROD",    "Technicien Opérations",            "CONFIRME",  280000,  400000),
    ]
    postes = {}
    for dept_code, titre, niveau, sal_min, sal_max in postes_data:
        if dept_code not in depts:
            continue
        p, _ = Poste.objects.get_or_create(
            titre=titre,
            departement=depts[dept_code],
            defaults={"niveau": niveau, "salaire_min": sal_min,
                      "salaire_max": sal_max, "entreprise": entreprise, "actif": True}
        )
        postes[f"{dept_code}_{titre}"] = p
    print(f"  Postes : {len(postes)}")
    return postes


def creer_utilisateurs(depts, postes, entreprise):
    from accounts.models import User
    PASS = "Demo2026!"

    def p(code, titre):
        return postes.get(f"{code}_{titre}")

    users_data = [
        {"username": "lucky",           "first_name": "Luc",         "last_name": "YEMEYA",
         "email": "lucyemeya1@gmail.com", "role": "RH",
         "departement": depts.get("RH-DEPT"), "poste": p("RH-DEPT", "Responsable RH"),
         "telephone": "+237 677 203 445", "_staff": True},
        {"username": "sophie.nkomo",    "first_name": "Sophie",      "last_name": "NKOMO",
         "email": "snkomo@acerfi.net",   "role": "RH",
         "departement": depts.get("RH-DEPT"), "poste": p("RH-DEPT", "Chargé RH & Paie"),
         "telephone": "+237 699 112 233"},
        {"username": "admin.sirh",      "first_name": "Admin",       "last_name": "SIRH",
         "email": "admin@acerfi.net",    "role": "ADMIN",
         "departement": depts.get("DG"), "poste": p("DG", "Directeur Général"),
         "_staff": True, "_super": True},
        {"username": "jean.mbarga",     "first_name": "Jean-Pierre", "last_name": "MBARGA",
         "email": "jpmbarga@acerfi.net", "role": "MANAGER",
         "departement": depts.get("IT"), "poste": p("IT", "Administrateur Système"),
         "telephone": "+237 677 445 566"},
        {"username": "claire.fouda",    "first_name": "Claire",      "last_name": "FOUDA",
         "email": "cfouda@acerfi.net",   "role": "MANAGER",
         "departement": depts.get("FIN"), "poste": p("FIN", "Chef Comptable"),
         "telephone": "+237 699 778 899"},
        {"username": "paul.atangana",   "first_name": "Paul",        "last_name": "ATANGANA",
         "email": "patangana@acerfi.net","role": "MANAGER",
         "departement": depts.get("FORM"), "poste": p("FORM", "Coordinateur Pédagogique"),
         "telephone": "+237 677 334 455"},
        {"username": "nadege.mvogo",    "first_name": "Nadège",      "last_name": "MVOGO",
         "email": "nmvogo@acerfi.net",   "role": "MANAGER",
         "departement": depts.get("MKT"), "poste": p("MKT", "Responsable Marketing"),
         "telephone": "+237 699 556 677"},
        {"username": "alice.mballa",    "first_name": "Alice",       "last_name": "MBALLA",
         "email": "amballa@acerfi.net",  "role": "EMPLOYE",
         "departement": depts.get("IT"), "poste": p("IT", "Développeur Full Stack"),
         "telephone": "+237 677 112 233", "filiere": "DEV_WEB"},
        {"username": "paul.fopa",       "first_name": "Paul",        "last_name": "FOPA",
         "email": "pfopa@acerfi.net",    "role": "EMPLOYE",
         "departement": depts.get("IT"), "poste": p("IT", "Développeur Full Stack"),
         "telephone": "+237 699 223 344", "filiere": "DEV_WEB"},
        {"username": "eric.essomba",    "first_name": "Eric",        "last_name": "ESSOMBA",
         "email": "eessomba@acerfi.net", "role": "EMPLOYE",
         "departement": depts.get("FIN"), "poste": p("FIN", "Chef Comptable"),
         "telephone": "+237 677 334 455"},
        {"username": "marie.talla",     "first_name": "Marie",       "last_name": "TALLA",
         "email": "mtalla@acerfi.net",   "role": "EMPLOYE",
         "departement": depts.get("MKT"), "poste": p("MKT", "Chargé Communication Digitale"),
         "telephone": "+237 699 445 566", "filiere": "MARKETING"},
        {"username": "kevin.nguema",    "first_name": "Kevin",       "last_name": "NGUEMA",
         "email": "knguema@acerfi.net",  "role": "EMPLOYE",
         "departement": depts.get("IT"), "poste": p("IT", "Administrateur Système"),
         "telephone": "+237 677 556 677", "filiere": "INFRA_RESEAUX"},
        {"username": "christelle.biya", "first_name": "Christelle",  "last_name": "BIYA",
         "email": "cbiya@acerfi.net",    "role": "EMPLOYE",
         "departement": depts.get("FORM"), "poste": p("FORM", "Formateur Senior"),
         "telephone": "+237 699 667 788"},
        {"username": "roger.owona",     "first_name": "Roger",       "last_name": "OWONA",
         "email": "rowona@acerfi.net",   "role": "EMPLOYE",
         "departement": depts.get("COM"), "poste": p("COM", "Commercial Terrain"),
         "telephone": "+237 677 778 899"},
        {"username": "beatrice.mendo",  "first_name": "Béatrice",    "last_name": "MENDO",
         "email": "bmendo@acerfi.net",   "role": "EMPLOYE",
         "departement": depts.get("FIN"), "poste": p("FIN", "Comptable Analytique"),
         "telephone": "+237 699 889 900"},
        {"username": "fabrice.onana",   "first_name": "Fabrice",     "last_name": "ONANA",
         "email": "fonana@acerfi.net",   "role": "EMPLOYE",
         "departement": depts.get("PROD"), "poste": p("PROD", "Technicien Opérations"),
         "telephone": "+237 677 990 011"},
        {"username": "sylvie.abomo",    "first_name": "Sylvie",      "last_name": "ABOMO",
         "email": "sabomo@acerfi.net",   "role": "EMPLOYE",
         "departement": depts.get("MKT"), "poste": p("MKT", "Chargé Communication Digitale"),
         "telephone": "+237 699 001 122", "filiere": "MARKETING"},
        {"username": "armelle.nkomo",   "first_name": "Armelle",     "last_name": "NKOMO",
         "email": "ankomo@acerfi.cm",    "role": "EMPLOYE",
         "departement": depts.get("FORM"), "poste": p("FORM", "Formateur Senior"),
         "telephone": "+237 677 111 001"},
        {"username": "kevin.essomba",   "first_name": "Kevin",       "last_name": "ESSOMBA",
         "email": "kessomba@acerfi.cm",  "role": "EMPLOYE",
         "departement": depts.get("IT"), "poste": p("IT", "Développeur Full Stack"),
         "telephone": "+237 699 222 003", "filiere": "DEV_WEB"},
        {"username": "bertrand.manga",  "first_name": "Bertrand",    "last_name": "MANGA",
         "email": "bmanga@acerfi.net",   "role": "EMPLOYE",
         "departement": depts.get("COM"), "poste": p("COM", "Commercial Terrain"),
         "telephone": "+237 677 333 004"},
    ]

    users = {}
    for data in users_data:
        username = data["username"]
        is_super = data.pop("_super", False)
        is_staff = data.pop("_staff", False)

        defaults = {k: v for k, v in data.items() if k != "username"}
        defaults["entreprise"] = entreprise

        u, created = User.objects.get_or_create(username=username, defaults=defaults)
        if created:
            u.set_password(PASS)
        u.entreprise = entreprise
        if is_super:
            u.is_superuser = True
        if is_staff:
            u.is_staff = True
        for field in ("role", "departement", "poste", "telephone",
                      "first_name", "last_name", "email", "filiere"):
            if field in data:
                setattr(u, field, data[field])
        u.save()
        users[username] = u
        print(f"    {'Créé' if created else 'MàJ'} : {username} ({data.get('role','?')})")

    print(f"  Utilisateurs : {len(users)}")
    return users


def creer_contrats(users, entreprise):
    from contrats.models import Contrat
    contrats_data = [
        ("alice.mballa",    "CDI",    450000, "2024-01-15", None),
        ("paul.fopa",       "STAGE",   80000, "2026-05-12", "2026-11-12"),
        ("eric.essomba",    "CDI",    380000, "2023-03-01", None),
        ("marie.talla",     "CDD",    320000, "2025-06-01", "2026-06-30"),
        ("kevin.nguema",    "CDI",    420000, "2024-07-01", None),
        ("christelle.biya", "CDI",    390000, "2023-09-15", None),
        ("roger.owona",     "CDI",    350000, "2022-11-01", None),
        ("beatrice.mendo",  "CDI",    370000, "2024-02-01", None),
        ("fabrice.onana",   "CDD",    300000, "2025-01-15", "2026-07-15"),
        ("sylvie.abomo",    "CDI",    310000, "2025-03-01", None),
        ("armelle.nkomo",   "STAGE",   75000, "2026-05-12", "2026-11-12"),
        ("kevin.essomba",   "CDI",    400000, "2024-05-01", None),
        ("bertrand.manga",  "CDI",    360000, "2023-07-01", None),
    ]
    count = 0
    for username, type_c, salaire, debut, fin in contrats_data:
        u = users.get(username)
        if not u:
            continue
        _, created = Contrat.objects.get_or_create(
            employe=u, type_contrat=type_c, date_debut=date.fromisoformat(debut),
            defaults={
                "salaire": salaire, "statut": "ACTIF", "poste": u.poste,
                "entreprise": entreprise,
                "date_fin": date.fromisoformat(fin) if fin else None,
            }
        )
        if created:
            count += 1
    print(f"  Contrats : {count} créés")


def creer_conges(users, entreprise):
    from conges.models import TypeConge, DemandeConge, SoldeConge

    types_data = [
        ("Congé annuel",           "ANNUEL",     30, True,  False, "#2E74B5"),
        ("Congé maladie",          "MALADIE",    15, True,  True,  "#E63946"),
        ("Congé événement famil.", "EVENEMENT",   5, True,  True,  "#F4A261"),
        ("Congé sans solde",       "SANS_SOLDE",  0, False, True,  "#6c757d"),
        ("Congé maternité",        "MATERNITE",  98, True,  True,  "#7B2D8B"),
    ]
    types = {}
    for nom, code, jours, paye, justif, couleur in types_data:
        t, _ = TypeConge.objects.get_or_create(
            code=code,
            defaults={"nom": nom, "jours_par_an": jours, "est_paye": paye,
                      "necessite_justificatif": justif, "couleur": couleur}
        )
        types[code] = t

    employes_actifs = [
        "alice.mballa", "paul.fopa", "eric.essomba", "marie.talla",
        "kevin.nguema", "christelle.biya", "roger.owona", "beatrice.mendo",
        "fabrice.onana", "sylvie.abomo", "armelle.nkomo", "kevin.essomba",
        "bertrand.manga",
    ]
    for uname in employes_actifs:
        u = users.get(uname)
        if u:
            SoldeConge.objects.get_or_create(
                employe=u, type_conge=types["ANNUEL"], annee=2026,
                defaults={"jours_acquis": 30, "jours_pris": 0, "jours_en_attente": 0}
            )

    sophie = users.get("sophie.nkomo") or users.get("lucky")
    conges_data = [
        ("alice.mballa",    "ANNUEL",     "2026-04-07", "2026-04-11", "APPROUVE", sophie, ""),
        ("eric.essomba",    "ANNUEL",     "2026-03-17", "2026-03-19", "APPROUVE", sophie, ""),
        ("marie.talla",     "MALADIE",    "2026-05-05", "2026-05-06", "APPROUVE", sophie, ""),
        ("kevin.nguema",    "EVENEMENT",  "2026-02-14", "2026-02-15", "APPROUVE", sophie, ""),
        ("christelle.biya", "ANNUEL",     "2026-01-20", "2026-01-28", "APPROUVE", sophie, ""),
        ("roger.owona",     "ANNUEL",     "2026-04-21", "2026-04-25", "APPROUVE", sophie, ""),
        ("paul.fopa",       "ANNUEL",     "2026-06-16", "2026-06-18", "EN_ATTENTE", None, ""),
        ("sylvie.abomo",    "MALADIE",    "2026-06-11", "2026-06-12", "EN_ATTENTE", None, ""),
        ("beatrice.mendo",  "ANNUEL",     "2026-06-23", "2026-06-27", "EN_ATTENTE", None, ""),
        ("fabrice.onana",   "SANS_SOLDE", "2026-05-18", "2026-05-29", "REFUSE",  sophie,
         "Période de haute activité, report demandé après juillet."),
    ]
    count = 0
    for username, type_code, debut, fin, statut, valideur, commentaire in conges_data:
        u = users.get(username)
        if not u:
            continue
        _, created = DemandeConge.objects.get_or_create(
            employe=u, type_conge=types[type_code], date_debut=date.fromisoformat(debut),
            defaults={
                "date_fin": date.fromisoformat(fin),
                "nb_jours": 1,
                "motif": f"Demande de {types[type_code].nom}",
                "statut": statut,
                "valideur": valideur,
                "commentaire_valideur": commentaire,
                "date_validation": timezone.now() if statut in ("APPROUVE", "REFUSE") else None,
                "entreprise": entreprise,
            }
        )
        if created:
            count += 1
    print(f"  Congés : {count} demandes créées ({len(types)} types)")


def creer_presences(users, entreprise):
    from presences.models import Pointage

    jours_ouvres = []
    d = date(2026, 6, 2)
    while d <= date(2026, 6, 13):
        if d.weekday() < 5:
            jours_ouvres.append(d)
        d += timedelta(days=1)

    employes = [
        "alice.mballa", "paul.fopa", "eric.essomba", "marie.talla",
        "kevin.nguema", "christelle.biya", "roger.owona", "beatrice.mendo",
        "fabrice.onana", "sylvie.abomo", "armelle.nkomo", "kevin.essomba",
        "bertrand.manga",
    ]
    paul_retards  = {date(2026, 6, 3), date(2026, 6, 10)}
    roger_absence = {date(2026, 6, 3)}
    marie_conge   = {date(2026, 6, 11), date(2026, 6, 12)}

    count = 0
    random.seed(42)

    for uname in employes:
        u = users.get(uname)
        if not u:
            continue
        for jour in jours_ouvres:
            if uname == "marie.talla" and jour in marie_conge:
                statut = "CONGE"
                h_arr, h_dep = time(8, 0), time(17, 0)
            elif uname == "roger.owona" and jour in roger_absence:
                statut, h_arr, h_dep = "ABSENT", None, None
            elif uname == "paul.fopa" and jour in paul_retards:
                statut = "RETARD"
                h_arr = time(8, random.randint(30, 59))
                h_dep = time(17, random.randint(0, 30))
            else:
                r = random.random()
                if r < 0.90:
                    statut = "PRESENT"
                    h_arr = time(7, random.randint(45, 59)) if random.random() < 0.5 else time(8, random.randint(0, 15))
                    h_dep = time(17, random.randint(0, 45))
                elif r < 0.95:
                    statut = "RETARD"
                    h_arr = time(8, random.randint(30, 59))
                    h_dep = time(17, random.randint(0, 30))
                else:
                    statut, h_arr, h_dep = "ABSENT", None, None

            _, created = Pointage.objects.get_or_create(
                employe=u, date=jour,
                defaults={"heure_arrivee": h_arr, "heure_depart": h_dep,
                          "statut": statut, "entreprise": entreprise}
            )
            if created:
                count += 1
    print(f"  Présences : {count} pointages ({len(employes)} emp × {len(jours_ouvres)} jours)")


def creer_objectifs(users, entreprise):
    from objectifs.models import PeriodeEvaluation, Objectif

    periode_t1, _ = PeriodeEvaluation.objects.get_or_create(
        nom="T1 2026 — Janvier-Mars",
        defaults={"type_periode": "TRIMESTRIEL", "date_debut": date(2026, 1, 1),
                  "date_fin": date(2026, 3, 31), "statut": "CLOTURE"}
    )
    periode_t2, _ = PeriodeEvaluation.objects.get_or_create(
        nom="T2 2026 — Avril-Juin",
        defaults={"type_periode": "TRIMESTRIEL", "date_debut": date(2026, 4, 1),
                  "date_fin": date(2026, 6, 30), "statut": "EN_COURS"}
    )

    jean = users.get("jean.mbarga")
    objectifs_data = [
        ("alice.mballa",    "Livrer le module paie du SIRH",          "HAUTE",     "Livraison avant le 15/06/2026",             85, "EN_COURS",  date(2026, 6, 15)),
        ("alice.mballa",    "Rédiger la documentation technique",      "MOYENNE",   "20 pages de documentation",                 60, "EN_COURS",  date(2026, 6, 30)),
        ("alice.mballa",    "Obtenir la certification React",          "FAIBLE",    "Certification Udemy React Advanced",         30, "EN_COURS",  date(2026, 9, 30)),
        ("paul.fopa",       "Maîtriser Django REST Framework",         "HAUTE",     "3 endpoints fonctionnels livrés",            90, "ATTEINT",   date(2026, 5, 31)),
        ("paul.fopa",       "Contribuer au projet SIRH",               "MOYENNE",   "5 pull requests validées",                 100, "DEPASSE",   date(2026, 6, 30)),
        ("kevin.nguema",    "Mettre en place la sauvegarde automatique","CRITIQUE",  "Backup quotidien MySQL configuré",          100, "ATTEINT",   date(2026, 5, 15)),
        ("kevin.nguema",    "Former l'équipe aux bonnes pratiques Git", "MOYENNE",   "2 sessions de formation internes",           50, "EN_COURS",  date(2026, 6, 30)),
        ("eric.essomba",    "Clôturer les comptes du T1 2026",         "CRITIQUE",  "Rapport T1 validé par la direction",        100, "ATTEINT",   date(2026, 4, 15)),
        ("eric.essomba",    "Réduire les écarts de caisse de 30%",     "HAUTE",     "Écarts < 0.5% du CA mensuel",                70, "EN_COURS",  date(2026, 6, 30)),
        ("marie.talla",     "Lancer la campagne Smart Vacances 2026",  "CRITIQUE",  "50 inscriptions avant le 01/06",             92, "ATTEINT",   date(2026, 6, 1)),
        ("marie.talla",     "Refonte du site web ACERFI",              "HAUTE",     "Nouveau site en ligne avant août",            40, "EN_COURS",  date(2026, 8, 1)),
        ("christelle.biya", "Préparer le programme pédagogique 2026",  "HAUTE",     "Programme validé par le Directeur",           65, "EN_COURS",  date(2026, 7, 31)),
        ("roger.owona",     "Atteindre l'objectif commercial Q2",      "CRITIQUE",  "15 nouveaux clients signés",                  60, "EN_COURS",  date(2026, 6, 30)),
    ]
    count = 0
    for username, titre, priorite, cible, progression, statut, echeance in objectifs_data:
        u = users.get(username)
        if not u:
            continue
        _, created = Objectif.objects.get_or_create(
            employe=u, titre=titre, periode=periode_t2,
            defaults={"priorite": priorite, "cible": cible, "progression": progression,
                      "statut": statut, "date_echeance": echeance,
                      "assigne_par": jean, "entreprise": entreprise}
        )
        if created:
            count += 1
    print(f"  Objectifs : {count} créés")
    return {"T1": periode_t1, "T2": periode_t2}


def creer_evaluations(users, periodes):
    from objectifs.models import EvaluationPerformance
    periode_t1 = periodes.get("T1")
    if not periode_t1:
        print("  Évaluations : ignorées (période T1 manquante)")
        return

    jean   = users.get("jean.mbarga")
    claire = users.get("claire.fouda")
    nadege = users.get("nadege.mvogo")

    evals_data = [
        ("alice.mballa",    jean,   (5, 4, 4, 4, 5, 4),
         "Excellente maîtrise de Django et React. Grande autonomie sur les projets complexes.",
         "Pourrait mieux documenter son code au fil du développement.", "SIGNE"),
        ("kevin.nguema",    jean,   (4, 4, 5, 3, 4, 4),
         "Fiabilité et rigueur dans l'administration système.",
         "Doit développer ses compétences en communication avec les équipes métier.", "SIGNE"),
        ("eric.essomba",    claire, (4, 5, 5, 4, 3, 4),
         "Précision comptable exemplaire. Clôtures toujours dans les délais.",
         "Travail en équipe à améliorer.", "SIGNE"),
        ("marie.talla",     nadege, (3, 4, 3, 5, 4, 4),
         "Grande créativité et excellente maîtrise des réseaux sociaux.",
         "Doit améliorer le respect des délais sur les projets transversaux.", "SIGNE"),
        ("paul.fopa",       jean,   (3, 3, 4, 4, 4, 3),
         "Bonne progression depuis le début du stage. Très motivé.",
         "Compétences techniques encore en développement sur Django avancé.", "EN_ATTENTE"),
    ]
    count = 0
    for uname, evaluateur, notes, pf, aa, statut in evals_data:
        u = users.get(uname)
        if not u:
            continue
        _, created = EvaluationPerformance.objects.get_or_create(
            employe=u, periode=periode_t1,
            defaults={
                "evaluateur": evaluateur,
                "note_competences": notes[0], "note_objectifs": notes[1],
                "note_comportement": notes[2], "note_initiative": notes[3],
                "note_travail_equipe": notes[4], "note_communication": notes[5],
                "points_forts": pf, "axes_amelioration": aa, "statut": statut,
            }
        )
        if created:
            count += 1
    print(f"  Évaluations : {count} créées")


def creer_rapports_activite(users):
    from rapports.models import RapportHebdomadaire

    alice = users.get("alice.mballa")
    paul  = users.get("paul.fopa")

    rapports = [
        {"stagiaire": alice, "semaine_numero": 1,
         "date_debut_semaine": date(2026, 5, 12), "date_fin_semaine": date(2026, 5, 16),
         "activites_realisees": "Etude approfondie de la composition et de l'organisation d'ACERFI SARL et TW Micronics. Participation à la réunion de kick-off projet SIRH. Mise en place de l'environnement de développement Django 5.2 + React 18 + MySQL.",
         "projets_en_cours": "Démarrage du projet SIRH. Création de la structure Django avec les apps accounts, stagiaires, rapports, analyse_ia.",
         "difficultes": "Configuration de PyMySQL avec Django 5.2. Résolu en ajoutant pymysql.install_as_MySQLdb() dans config/__init__.py",
         "objectifs_semaine_suiv": "Implémenter les modèles Django. Configurer l'authentification JWT. Créer les premiers endpoints DRF.",
         "statut": "VALIDE", "commentaire_encadreur": "Bonne prise en main de l'environnement. Continuer sur cette lancée.",
         "date_soumission": timezone.make_aware(datetime(2026, 5, 16, 17, 30)),
         "date_validation": timezone.make_aware(datetime(2026, 5, 17, 10, 0))},

        {"stagiaire": alice, "semaine_numero": 2,
         "date_debut_semaine": date(2026, 5, 19), "date_fin_semaine": date(2026, 5, 23),
         "activites_realisees": "Développement des modèles Django : User, StagePeriode, ProjetSoutenance, RapportHebdomadaire, AnalyseIA. Implémentation de l'authentification JWT. Tests Postman de tous les endpoints créés.",
         "projets_en_cours": "Backend SIRH : 80% des modèles créés. APIs CRUD fonctionnelles pour accounts et stagiaires.",
         "difficultes": "Gestion des migrations Django avec les champs CHECK constraints MySQL 8. Résolu en retirant les contraintes CHECK.",
         "objectifs_semaine_suiv": "Développer le frontend React. Intégrer AdminLTE 3.2. Créer les dashboards par rôle.",
         "statut": "VALIDE", "commentaire_encadreur": "",
         "date_soumission": timezone.make_aware(datetime(2026, 5, 23, 17, 30)),
         "date_validation": timezone.make_aware(datetime(2026, 5, 24, 9, 0))},

        {"stagiaire": alice, "semaine_numero": 3,
         "date_debut_semaine": date(2026, 5, 26), "date_fin_semaine": date(2026, 5, 30),
         "activites_realisees": "Développement du frontend React 18 + Vite + AdminLTE 3.2. Implémentation du thème clair/sombre. Création des dashboards Admin, Encadreur et Stagiaire. Intégration de l'API Groq pour l'analyse automatique des rapports.",
         "projets_en_cours": "SIRH frontend 70% terminé. Dashboards Admin et Stagiaire fonctionnels. Module Groq IA opérationnel.",
         "difficultes": "Intégration AdminLTE avec React : conflits entre le CSS Bootstrap 4 et les styles React. Résolu avec des variables CSS personnalisées.",
         "objectifs_semaine_suiv": "Finaliser le dashboard Encadreur. Ajouter les modules Congés, Présences, Objectifs et Paie.",
         "statut": "SOUMIS", "commentaire_encadreur": "",
         "date_soumission": timezone.make_aware(datetime(2026, 5, 30, 17, 0)),
         "date_validation": None},

        {"stagiaire": alice, "semaine_numero": 4,
         "date_debut_semaine": date(2026, 6, 2), "date_fin_semaine": date(2026, 6, 6),
         "activites_realisees": "Migration GSRIA vers SIRH complet. Ajout des modules : Départements, Contrats, Congés, Présences, Documents RH, Objectifs, Évaluations, Recrutements, Formations, Sanctions et Paie simplifiée.",
         "projets_en_cours": "SIRH : 17 modules sur 18 implémentés. En cours : Multi-entreprises et Notifications.",
         "difficultes": "Gestion des migrations Django en cascade avec l'ajout du champ entreprise sur tous les modèles existants.",
         "objectifs_semaine_suiv": "Finaliser le module Multi-entreprises. Intégrer les Notifications. Préparer les données de démo pour la soutenance.",
         "statut": "BROUILLON", "commentaire_encadreur": "",
         "date_soumission": None, "date_validation": None},

        {"stagiaire": paul, "semaine_numero": 1,
         "date_debut_semaine": date(2026, 5, 12), "date_fin_semaine": date(2026, 5, 16),
         "activites_realisees": "Découverte de l'environnement de travail ACERFI SARL. Formation initiale sur les outils utilisés : Git, VS Code, Django. Lecture de la documentation du projet SIRH.",
         "projets_en_cours": "Prise en main de l'environnement de développement.",
         "difficultes": "Installation de Python 3.14 et configuration du venv sous Windows.",
         "objectifs_semaine_suiv": "Implémenter mes premiers endpoints DRF. Créer un modèle Django.",
         "statut": "VALIDE", "commentaire_encadreur": "Bonne attitude. À approfondir les concepts Django.",
         "date_soumission": timezone.make_aware(datetime(2026, 5, 16, 17, 0)),
         "date_validation": timezone.make_aware(datetime(2026, 5, 18, 10, 0))},

        {"stagiaire": paul, "semaine_numero": 2,
         "date_debut_semaine": date(2026, 5, 19), "date_fin_semaine": date(2026, 5, 23),
         "activites_realisees": "Création de mon premier endpoint DRF : API utilisateurs. Tests avec Postman. Participation aux code reviews. Débogage des erreurs de migrations.",
         "projets_en_cours": "Développement de l'API accounts avec authentification JWT.",
         "difficultes": "Compréhension des serializers DRF imbriqués.",
         "objectifs_semaine_suiv": "Ajouter les endpoints congés et présences.",
         "statut": "SOUMIS", "commentaire_encadreur": "",
         "date_soumission": timezone.make_aware(datetime(2026, 5, 23, 17, 0)),
         "date_validation": None},
    ]
    count = 0
    for data in rapports:
        if not data["stagiaire"]:
            continue
        _, created = RapportHebdomadaire.objects.get_or_create(
            stagiaire=data["stagiaire"], semaine_numero=data["semaine_numero"],
            defaults={k: v for k, v in data.items()
                      if k not in ("stagiaire", "semaine_numero")}
        )
        if created:
            count += 1
    print(f"  Rapports d'activité : {count} créés")


def creer_formations(users, entreprise):
    from formations.models import CategorieFormation, Formation, InscriptionFormation

    cats = {}
    for nom, code in [
        ("Informatique & Développement", "INFO_DEV"),
        ("Marketing & Communication",    "MARKETING"),
        ("Bureautique & Productivité",   "BUREAUTIQUE"),
        ("Management & Leadership",      "MANAGEMENT"),
    ]:
        c, _ = CategorieFormation.objects.get_or_create(code=code, defaults={"nom": nom})
        cats[code] = c

    jean   = users.get("jean.mbarga")
    nadege = users.get("nadege.mvogo")
    lucky  = users.get("lucky")

    formations_def = [
        {"titre": "Django REST Framework Avancé",
         "categorie": cats["INFO_DEV"],
         "description": "Formation avancée DRF : serializers, ViewSets, permissions, authentification JWT.",
         "modalite": "PRESENTIEL", "niveau": "AVANCE", "duree_heures": 16,
         "date_debut": date(2026, 6, 20), "date_fin": date(2026, 6, 21),
         "lieu": "Salle de formation ACERFI Yaoundé",
         "formateur": "Jean-Pierre MBARGA", "cout": 75000, "places_max": 10,
         "statut": "PLANIFIEE", "cree_par": jean,
         "inscrits": []},

        {"titre": "Marketing Digital et Réseaux Sociaux",
         "categorie": cats["MARKETING"],
         "description": "Stratégies marketing digital, gestion des réseaux sociaux, analytics.",
         "modalite": "HYBRIDE", "niveau": "INTERMEDIAIRE", "duree_heures": 8,
         "date_debut": date(2026, 5, 28), "date_fin": date(2026, 5, 28),
         "lieu": "ACERFI Yaoundé + En ligne",
         "formateur": "Nadège MVOGO", "cout": 0, "places_max": 15,
         "statut": "TERMINEE", "cree_par": nadege,
         "inscrits": [
             (users.get("marie.talla"),  "PRESENT", None),
             (users.get("sylvie.abomo"), "PRESENT", None),
             (users.get("roger.owona"),  "PRESENT", None),
         ]},

        {"titre": "Excel Avancé et Tableaux de Bord",
         "categorie": cats["BUREAUTIQUE"],
         "description": "Maîtrise d'Excel avancé : TCD, macros VBA, dashboards de gestion.",
         "modalite": "PRESENTIEL", "niveau": "INTERMEDIAIRE", "duree_heures": 8,
         "date_debut": date(2026, 6, 5), "date_fin": date(2026, 6, 5),
         "lieu": "Salle de formation ACERFI Yaoundé",
         "formateur": "Cabinet BEST PARTNERS", "cout": 50000, "places_max": 12,
         "statut": "TERMINEE", "cree_par": lucky,
         "inscrits": [
             (users.get("eric.essomba"),   "PRESENT", None),
             (users.get("beatrice.mendo"), "PRESENT", None),
             (users.get("alice.mballa"),   "PRESENT", 4),
         ]},

        {"titre": "Gestion des Ressources Humaines en PME",
         "categorie": cats["MANAGEMENT"],
         "description": "Pratiques RH adaptées aux PME africaines : recrutement, paie, droit du travail camerounais.",
         "modalite": "DISTANCIEL", "niveau": "INTERMEDIAIRE", "duree_heures": 12,
         "date_debut": date(2026, 7, 10), "date_fin": date(2026, 7, 12),
         "lieu": "En ligne",
         "formateur": "RH Pro Cameroun", "cout": 60000, "places_max": 20,
         "statut": "PLANIFIEE", "cree_par": lucky,
         "inscrits": [
             (users.get("paul.fopa"),     "EN_ATTENTE", None),
             (users.get("armelle.nkomo"), "EN_ATTENTE", None),
             (users.get("kevin.essomba"), "EN_ATTENTE", None),
         ]},
    ]

    count_f = count_i = 0
    for fdef in formations_def:
        inscrits = fdef.pop("inscrits")
        f, created = Formation.objects.get_or_create(
            titre=fdef["titre"], entreprise=entreprise,
            defaults=fdef
        )
        if created:
            count_f += 1
        for emp, statut, note in inscrits:
            if not emp:
                continue
            _, ic = InscriptionFormation.objects.get_or_create(
                employe=emp, formation=f,
                defaults={"statut": statut, "note_formation": note}
            )
            if ic:
                count_i += 1
    print(f"  Formations : {count_f} créées, {count_i} inscriptions")


def creer_recrutements(users, depts, entreprise):
    from recrutements.models import OffreEmploi, Candidature, Entretien

    lucky = users.get("lucky")
    jean  = users.get("jean.mbarga")

    offres_def = [
        {"titre": "Développeur Full Stack Django/React",
         "departement": depts.get("IT"), "type_contrat": "CDI",
         "niveau_experience": "CONFIRME",
         "description": "Nous recherchons un développeur Full Stack pour renforcer notre équipe IT. Vous travaillerez sur le SIRH ACERFI et les projets clients.",
         "competences_requises": "Django 5+, React 18, MySQL, REST API, Git, Docker",
         "salaire_min": 400000, "salaire_max": 600000, "nb_postes": 2,
         "statut": "PUBLIEE", "date_publication": date(2026, 6, 1), "cree_par": lucky,
         "candidats": [
             {"nom_complet": "Alain ZANG",    "email": "azang@gmail.com",    "telephone": "+237 677 100 200",
              "score_cv_ia": 87, "statut": "ENTRETIEN_TECH", "note_interne": 4,
              "commentaire_rh": "Excellent profil, 4 ans exp Django",
              "entretien": {"type_entretien": "TECHNIQUE",
                            "date_heure": timezone.make_aware(datetime(2026, 6, 18, 10, 0)),
                            "duree_minutes": 90, "lieu": "Bureaux ACERFI",
                            "intervieweur": jean, "resultat": "POSITIF"}},
             {"nom_complet": "Sandra BEKONO", "email": "sbekono@yahoo.fr",   "telephone": "+237 699 300 400",
              "score_cv_ia": 72, "statut": "ENTRETIEN_RH", "note_interne": 3, "commentaire_rh": ""},
             {"nom_complet": "Michel ONGUENE","email": "monguene@gmail.com",  "telephone": "+237 677 500 600",
              "score_cv_ia": 45, "statut": "RECUE", "note_interne": 2,
              "commentaire_rh": "Profil junior, pas assez d'expérience"},
         ]},

        {"titre": "Chargé Communication et Marketing Digital",
         "departement": depts.get("MKT"), "type_contrat": "CDD",
         "niveau_experience": "JUNIOR",
         "description": "Nous recrutons un chargé de communication pour renforcer notre présence digitale.",
         "competences_requises": "Community management, Canva, Facebook Ads, Google Analytics",
         "salaire_min": 200000, "salaire_max": 300000, "nb_postes": 1,
         "statut": "PUBLIEE", "date_publication": date(2026, 6, 5), "cree_par": lucky,
         "candidats": [
             {"nom_complet": "Estelle MVONDO", "email": "emvondo@gmail.com", "telephone": "+237 699 700 800",
              "score_cv_ia": 79, "statut": "ENTRETIEN_RH", "note_interne": None, "commentaire_rh": ""},
             {"nom_complet": "Boris NDJANA",   "email": "bndjana@gmail.com", "telephone": "+237 677 900 001",
              "score_cv_ia": 63, "statut": "EN_COURS",    "note_interne": None, "commentaire_rh": ""},
         ]},
    ]

    count_o = count_c = count_e = 0
    for odef in offres_def:
        candidats = odef.pop("candidats")
        offre, created = OffreEmploi.objects.get_or_create(
            titre=odef["titre"], entreprise=entreprise,
            defaults=odef
        )
        if created:
            count_o += 1
        for cdef in candidats:
            entretien_data = cdef.pop("entretien", None)
            slug = cdef["email"].split("@")[0]
            c, cc = Candidature.objects.get_or_create(
                offre=offre, email=cdef["email"],
                defaults={**cdef, "cv": f"recrutements/cv/cv_{slug}.pdf"}
            )
            if cc:
                count_c += 1
            if entretien_data:
                _, ec = Entretien.objects.get_or_create(
                    candidature=c, type_entretien=entretien_data["type_entretien"],
                    defaults=entretien_data
                )
                if ec:
                    count_e += 1
    print(f"  Recrutements : {count_o} offres, {count_c} candidatures, {count_e} entretiens")


def creer_historique_carriere(users, depts, postes):
    from carriere.models import EvenementCarriere

    lucky = users.get("lucky")

    evenements = [
        {"employe": users.get("alice.mballa"), "type_evenement": "EMBAUCHE",
         "date_evenement": date(2024, 1, 15), "titre": "Recrutée comme Développeuse Full Stack au département IT",
         "description": "Embauche en CDI.", "salaire_apres": 380000, "enregistre_par": lucky},
        {"employe": users.get("alice.mballa"), "type_evenement": "FORMATION",
         "date_evenement": date(2024, 3, 10), "titre": "Formation React Avancé — Udemy — 40h",
         "enregistre_par": lucky},
        {"employe": users.get("alice.mballa"), "type_evenement": "AUGMENTATION",
         "date_evenement": date(2024, 7, 1), "titre": "Révision salariale annuelle",
         "description": "+10.5%", "salaire_avant": 380000, "salaire_apres": 420000, "enregistre_par": lucky},
        {"employe": users.get("alice.mballa"), "type_evenement": "FELICITATION",
         "date_evenement": date(2024, 11, 15), "titre": "Prix de l'employé du trimestre T3 2024",
         "description": "Excellence dans le projet CRM.", "enregistre_par": lucky},
        {"employe": users.get("alice.mballa"), "type_evenement": "AUGMENTATION",
         "date_evenement": date(2026, 1, 1), "titre": "Augmentation début 2026",
         "description": "+7.1%", "salaire_avant": 420000, "salaire_apres": 450000, "enregistre_par": lucky},

        {"employe": users.get("kevin.nguema"), "type_evenement": "EMBAUCHE",
         "date_evenement": date(2024, 7, 1), "titre": "Recruté Administrateur Système — Département IT",
         "salaire_apres": 400000, "enregistre_par": lucky},
        {"employe": users.get("kevin.nguema"), "type_evenement": "FORMATION",
         "date_evenement": date(2024, 9, 20), "titre": "Formation Cisco CCNA — TW Micronics — 5 jours",
         "enregistre_par": lucky},

        {"employe": users.get("eric.essomba"), "type_evenement": "EMBAUCHE",
         "date_evenement": date(2023, 3, 1), "titre": "Recruté Comptable — Département Finance",
         "salaire_apres": 340000, "enregistre_par": lucky},
        {"employe": users.get("eric.essomba"), "type_evenement": "AUGMENTATION",
         "date_evenement": date(2024, 1, 1), "titre": "Révision salariale annuelle",
         "salaire_avant": 340000, "salaire_apres": 365000, "enregistre_par": lucky},
        {"employe": users.get("eric.essomba"), "type_evenement": "PROMOTION",
         "date_evenement": date(2024, 6, 1), "titre": "Promotion Chef Comptable",
         "description": "Comptable → Chef Comptable",
         "salaire_avant": 365000, "salaire_apres": 380000, "enregistre_par": lucky},
    ]
    count = 0
    for ev in evenements:
        emp = ev.pop("employe", None)
        if not emp:
            continue
        _, created = EvenementCarriere.objects.get_or_create(
            employe=emp,
            type_evenement=ev["type_evenement"],
            date_evenement=ev["date_evenement"],
            defaults={k: v for k, v in ev.items()
                      if k not in ("type_evenement", "date_evenement")}
        )
        if created:
            count += 1
    print(f"  Carrière : {count} événements créés")


def creer_sanctions(users, entreprise):
    from sanctions.models import Sanction

    sophie = users.get("sophie.nkomo")
    sanctions_data = [
        {"employe": users.get("paul.fopa"), "type_sanction": "AVERT_ECRIT",
         "motif": "Retards répétés non justifiés",
         "description": "Le stagiaire a accumulé 4 retards de plus de 30 minutes sur le mois de mai 2026 sans justification préalable, malgré un avertissement oral du 12 mai 2026.",
         "date_faits": date(2026, 5, 28), "date_sanction": date(2026, 6, 2),
         "prononcee_par": sophie, "statut": "ACCEPTEE",
         "reponse_employe": "J'ai pris note de cet avertissement et m'engage à respecter strictement les horaires à l'avenir. Je m'en excuse.",
         "mesures_correctives": "Suivi hebdomadaire avec l'encadreur pendant 1 mois.",
         "entreprise": entreprise},
        {"employe": users.get("roger.owona"), "type_sanction": "BLAME",
         "motif": "Absence injustifiée",
         "description": "Absence d'une journée complète le 03/06/2026 sans information préalable ni justificatif transmis.",
         "date_faits": date(2026, 6, 3), "date_sanction": date(2026, 6, 7),
         "prononcee_par": sophie, "statut": "NOTIFIEE",
         "reponse_employe": "", "mesures_correctives": "",
         "entreprise": entreprise},
    ]
    count = 0
    for sdef in sanctions_data:
        emp = sdef.pop("employe", None)
        if not emp:
            continue
        _, created = Sanction.objects.get_or_create(
            employe=emp,
            type_sanction=sdef["type_sanction"],
            date_sanction=sdef["date_sanction"],
            defaults={k: v for k, v in sdef.items()
                      if k not in ("type_sanction", "date_sanction")}
        )
        if created:
            count += 1
    print(f"  Sanctions : {count} créées")


def creer_bulletins_paie(users, entreprise):
    from paie.models import ElementPaie, BulletinPaie
    from contrats.models import Contrat

    lucky = users.get("lucky")

    for code, libelle, type_e, imposable in [
        ("PRIME_REND", "Prime de rendement",  "GAIN", True),
        ("IND_TRANSP", "Indemnité transport",  "GAIN", False),
        ("PRIME_ASTR", "Prime d'astreinte",    "GAIN", True),
        ("BONUS",      "Bonus exceptionnel",   "GAIN", True),
    ]:
        ElementPaie.objects.get_or_create(
            code=code,
            defaults={"libelle": libelle, "type": type_e, "imposable": imposable, "is_actif": True}
        )

    primes = {
        "alice.mballa":  Decimal("40000"),
        "kevin.nguema":  Decimal("35000"),
        "eric.essomba":  Decimal("12000"),
        "marie.talla":   Decimal("40000"),
    }
    default_prime = Decimal("10000")

    employes = [
        "alice.mballa", "paul.fopa", "eric.essomba", "marie.talla",
        "kevin.nguema", "christelle.biya", "roger.owona", "beatrice.mendo",
        "fabrice.onana", "sylvie.abomo", "armelle.nkomo", "kevin.essomba",
        "bertrand.manga",
    ]
    count = 0
    for uname in employes:
        u = users.get(uname)
        if not u:
            continue
        contrat = Contrat.objects.filter(employe=u, statut="ACTIF").first()
        if not contrat:
            continue
        total_primes = primes.get(uname, default_prime)
        b, created = BulletinPaie.objects.get_or_create(
            employe=u, mois=5, annee=2026,
            defaults={"salaire_brut": contrat.salaire, "total_primes": total_primes,
                      "statut": "BROUILLON", "genere_par": lucky, "entreprise": entreprise}
        )
        if created:
            b.calculer()
            b.statut = "VALIDE"
            b.valide_par = lucky
            b.date_validation = timezone.now()
            b.date_paiement = date(2026, 5, 30)
            b.save()
            count += 1
    print(f"  Bulletins de paie : {count} générés (mai 2026)")


def creer_rapport_ia(entreprise, users):
    from rapport_ia.models import RapportIAMensuel

    lucky = users.get("lucky")
    r, created = RapportIAMensuel.objects.get_or_create(
        mois=5, annee=2026, type_rapport="GLOBAL",
        departement=None, employe=None,
        defaults={
            "statut": "GENERE",
            "score_sante_rh": 74.0,
            "resume_executif": (
                "Le mois de mai 2026 a été globalement satisfaisant pour ACERFI SARL. "
                "Le taux de présence de 91% est en légère hausse par rapport au mois précédent. "
                "Les objectifs avancent bien avec un taux d'atteinte de 68%. "
                "Deux points d'attention : un contrat CDD expire fin juin et un stagiaire "
                "a fait l'objet d'un avertissement pour retards répétés."
            ),
            "alertes_ia": [
                {"niveau": "WARNING",
                 "message": "Contrat CDD de Marie TALLA expire le 30/06/2026",
                 "action_recommandee": "Préparer le renouvellement ou la procédure de fin de contrat avant le 15/06"},
                {"niveau": "INFO",
                 "message": "3 formations planifiées en juin-juillet",
                 "action_recommandee": "Valider les inscriptions en attente avant le 15/06"},
            ],
            "recommandations": [
                {"priorite": "HAUTE",
                 "action": "Renouveler ou finaliser le contrat de Marie TALLA avant fin juin",
                 "impact_estime": "Éviter une rupture de compétences marketing en période de campagne Smart Vacances"},
                {"priorite": "MOYENNE",
                 "action": "Recruter un 2e développeur Full Stack",
                 "impact_estime": "Réduire la charge sur l'équipe IT et accélérer les projets en cours"},
                {"priorite": "FAIBLE",
                 "action": "Mettre en place un système de covoiturage pour réduire les retards matinaux",
                 "impact_estime": "Améliorer la ponctualité et le bien-être des employés"},
            ],
            "indicateurs_cles": {
                "taux_presence": 91, "taux_atteinte_objectifs": 68,
                "nb_contrats_expirant": 1, "nb_conges_en_attente": 3,
                "nb_formations_planifiees": 2,
            },
            "genere_par": lucky,
            "entreprise": entreprise,
        }
    )
    print(f"  Rapport IA : {'créé' if created else 'existant'} (mai 2026, score {r.score_sante_rh})")


def creer_notifications(users):
    from notifications.models import Notification

    lucky = users.get("lucky")
    jean  = users.get("jean.mbarga")
    alice = users.get("alice.mballa")

    notifs = []
    if lucky:
        notifs += [
            {"destinataire": lucky, "type_notif": "ALERTE", "categorie": "CONTRAT",
             "titre": "Contrat de Marie TALLA expire bientôt",
             "message": "Le contrat CDD de Marie TALLA (MKT) expire le 30/06/2026. Action requise avant le 15/06.",
             "lien": "/rh/contrats"},
            {"destinataire": lucky, "type_notif": "INFO", "categorie": "FORMATION",
             "titre": "3 inscriptions en attente de validation",
             "message": "Paul FOPA, Armelle NKOMO et Kevin ESSOMBA attendent validation pour la formation GRH PME.",
             "lien": "/rh/formations"},
            {"destinataire": lucky, "type_notif": "SUCCES", "categorie": "SYSTEME",
             "titre": "Rapport IA mai 2026 disponible",
             "message": "Le rapport IA mensuel de mai 2026 a été généré. Score santé RH : 74/100.",
             "lien": "/rh/rapport-ia"},
            {"destinataire": lucky, "type_notif": "ALERTE", "categorie": "SYSTEME",
             "titre": "Sanction de Roger OWONA en attente de réponse",
             "message": "Le blâme notifié à Roger OWONA le 07/06/2026 n'a pas encore reçu de réponse.",
             "lien": "/rh/sanctions"},
        ]
    if jean:
        notifs += [
            {"destinataire": jean, "type_notif": "INFO", "categorie": "SYSTEME",
             "titre": "Paul FOPA a soumis son rapport S2",
             "message": "Le rapport hebdomadaire S2 de Paul FOPA a été soumis et attend votre validation.",
             "lien": "/manager/rapports-a-valider"},
            {"destinataire": jean, "type_notif": "INFO", "categorie": "CONGE",
             "titre": "2 demandes de congé en attente",
             "message": "Paul FOPA (Congé annuel 16-18/06) attend votre approbation.",
             "lien": "/manager/conges"},
            {"destinataire": jean, "type_notif": "INFO", "categorie": "EVALUATION",
             "titre": "Évaluation de Paul FOPA en attente de signature",
             "message": "L'évaluation T1 2026 de Paul FOPA est en statut EN_ATTENTE.",
             "lien": "/manager/objectifs-equipe"},
        ]
    if alice:
        notifs += [
            {"destinataire": alice, "type_notif": "SUCCES", "categorie": "PAIE",
             "titre": "Votre bulletin de paie mai 2026 est disponible",
             "message": "Votre bulletin de paie du mois de mai 2026 a été validé et est consultable.",
             "lien": "/employe/paie"},
            {"destinataire": alice, "type_notif": "SUCCES", "categorie": "CONGE",
             "titre": "Votre congé du 07-11 avril a été approuvé",
             "message": "Votre demande de congé annuel du 07/04/2026 au 11/04/2026 a été approuvée.",
             "lien": "/employe/conges"},
            {"destinataire": alice, "type_notif": "INFO", "categorie": "EVALUATION",
             "titre": "Votre évaluation T1 2026 est disponible",
             "message": "Votre évaluation T1 2026 a été complétée par Jean-Pierre MBARGA.",
             "lien": "/employe/mes-evaluations"},
        ]

    count = 0
    for ndata in notifs:
        dest  = ndata["destinataire"]
        titre = ndata["titre"]
        if not Notification.objects.filter(destinataire=dest, titre=titre).exists():
            Notification.objects.create(**ndata, lue=False)
            count += 1
    print(f"  Notifications : {count} créées")


def afficher_resume(users):
    sep = "=" * 42
    print()
    print(sep)
    print("  SIRH -- Donnees de demo creees")
    print(sep)
    print("  Entreprise   : ACERFI SARL")
    print("  Employes     : 20 comptes")
    print("  Contrats     : 13 actifs")
    print("  Conges       : 10 demandes")
    print("  Presences    : ~117 pointages")
    print("  Objectifs    : 13 objectifs")
    print("  Evaluations  : 5 bilans T1 2026")
    print("  Rapports     : 6 rapports activite")
    print("  Formations   : 4 formations")
    print("  Recrutements : 2 offres + 5 candidats")
    print("  Paie         : 13 bulletins mai 2026")
    print("  Notifications: 10 notifs")
    print(sep)
    print("  MOT DE PASSE UNIVERSEL : Demo2026!")
    print(sep)
    print("  lucky         -> RH")
    print("  jean.mbarga   -> Manager IT")
    print("  alice.mballa  -> Employe IT")
    print("  paul.fopa     -> Employe (stagiaire)")
    print(sep)


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print("=== Démarrage peuplement SIRH ===")
    print()

    try:
        print("[1/17] Entreprise...")
        entreprise = creer_entreprise()
    except Exception as e:
        print(f"  ERREUR fatale entreprise : {e}"); return

    try:
        print("[2/17] Départements...")
        depts = creer_departements(entreprise)
    except Exception as e:
        print(f"  ERREUR fatale départements : {e}"); return

    try:
        print("[3/17] Postes...")
        postes = creer_postes(depts, entreprise)
    except Exception as e:
        print(f"  ERREUR fatale postes : {e}"); return

    try:
        print("[4/17] Utilisateurs...")
        users = creer_utilisateurs(depts, postes, entreprise)
    except Exception as e:
        print(f"  ERREUR fatale utilisateurs : {e}"); return

    try:
        from departements.models import Departement
        resp_map = {"RH-DEPT": "lucky", "IT": "jean.mbarga",
                    "FIN": "claire.fouda", "MKT": "nadege.mvogo", "FORM": "paul.atangana"}
        for code, uname in resp_map.items():
            if code in depts and users.get(uname):
                depts[code].responsable = users[uname]
                depts[code].save()
        print("  Responsables départements : OK")
    except Exception as e:
        print(f"  AVERTISSEMENT responsables : {e}")

    def run(label, fn):
        try:
            print(f"  {label}...")
            fn()
        except Exception as e:
            print(f"  ERREUR {label} : {e}")

    run("[5/17] Contrats",           lambda: creer_contrats(users, entreprise))
    run("[6/17] Conges",             lambda: creer_conges(users, entreprise))
    run("[7/17] Presences",          lambda: creer_presences(users, entreprise))

    periodes = {}
    try:
        print("  [8/17] Objectifs...")
        periodes = creer_objectifs(users, entreprise)
    except Exception as e:
        print(f"  ERREUR objectifs : {e}")

    try:
        print("  [9/17] Evaluations...")
        creer_evaluations(users, periodes)
    except Exception as e:
        print(f"  ERREUR evaluations : {e}")

    try:
        print("  [10/17] Rapports activite...")
        creer_rapports_activite(users)
    except Exception as e:
        print(f"  ERREUR rapports : {e}")

    run("[11/17] Formations",         lambda: creer_formations(users, entreprise))
    run("[12/17] Recrutements",       lambda: creer_recrutements(users, depts, entreprise))
    run("[13/17] Historique carriere",lambda: creer_historique_carriere(users, depts, postes))
    run("[14/17] Sanctions",          lambda: creer_sanctions(users, entreprise))
    run("[15/17] Bulletins paie",     lambda: creer_bulletins_paie(users, entreprise))
    run("[16/17] Rapport IA",         lambda: creer_rapport_ia(entreprise, users))
    run("[17/17] Notifications",      lambda: creer_notifications(users))

    print()
    print("=== Peuplement termine avec succes ! ===")
    afficher_resume(users)


main()
