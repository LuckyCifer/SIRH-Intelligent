"""
Script de création des données de démonstration SIRH.
Exécuter avec : python manage.py shell < fixtures/demo_data.py
"""

from django.utils import timezone
from datetime import date, timedelta
from accounts.models import User
from entreprises.models import Entreprise
from departements.models import Departement, Poste
from contrats.models import Contrat

# 1. Entreprise de démo
entreprise, _ = Entreprise.objects.get_or_create(
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
    }
)
print(f"Entreprise : {entreprise.nom}")

# 2. Départements
depts_data = [
    ("Direction Générale",      "DG",   "#1F3864", "fas fa-chess-king"),
    ("Ressources Humaines",     "RH",   "#2E74B5", "fas fa-users"),
    ("Informatique & SI",       "IT",   "#2A9D8F", "fas fa-laptop-code"),
    ("Finance & Comptabilité",  "FIN",  "#E76F51", "fas fa-chart-line"),
    ("Marketing",               "MKT",  "#E63946", "fas fa-bullhorn"),
    ("Formation",               "FORM", "#7B2D8B", "fas fa-graduation-cap"),
]

depts = {}
for nom, code, couleur, icone in depts_data:
    d, _ = Departement.objects.get_or_create(
        code=code,
        defaults={
            "nom": nom,
            "couleur": couleur,
            "icone": icone,
            "entreprise": entreprise,
        }
    )
    if not d.entreprise:
        d.entreprise = entreprise
        d.save()
    depts[code] = d

# 3. Postes
postes_data = [
    ("DG",   "Directeur Général",             "DIRECTION"),
    ("RH",   "Responsable RH",                "CHEF"),
    ("RH",   "Chargé RH",                     "CONFIRME"),
    ("IT",   "Développeur Full Stack",         "CONFIRME"),
    ("IT",   "Administrateur Système",         "CONFIRME"),
    ("IT",   "Stagiaire Développeur",          "JUNIOR"),
    ("FIN",  "Comptable",                      "CONFIRME"),
    ("MKT",  "Chargé Marketing Digital",       "JUNIOR"),
    ("FORM", "Formateur Senior",               "SENIOR"),
    ("FORM", "Coordinateur Pédagogique",       "CHEF"),
]

postes = {}
for dept_code, titre, niveau in postes_data:
    p, _ = Poste.objects.get_or_create(
        titre=titre,
        departement=depts[dept_code],
        defaults={"niveau": niveau, "entreprise": entreprise}
    )
    postes[f"{dept_code}_{titre}"] = p

# 4. Utilisateurs de démonstration
users_data = [
    {
        "username": "admin.rh",
        "first_name": "Sophie",
        "last_name": "NKOMO",
        "email": "snkomo@acerfi.net",
        "role": "RH",
        "departement": depts["RH"],
        "poste": postes["RH_Responsable RH"],
        "password": "Demo2026!",
    },
    {
        "username": "manager.it",
        "first_name": "Jean-Pierre",
        "last_name": "MBARGA",
        "email": "jpmbarga@acerfi.net",
        "role": "MANAGER",
        "departement": depts["IT"],
        "poste": postes["IT_Administrateur Système"],
        "password": "Demo2026!",
    },
    {
        "username": "alice.mballa",
        "first_name": "Alice",
        "last_name": "MBALLA",
        "email": "amballa@acerfi.net",
        "role": "EMPLOYE",
        "departement": depts["IT"],
        "poste": postes["IT_Développeur Full Stack"],
        "password": "Demo2026!",
    },
    {
        "username": "paul.fopa",
        "first_name": "Paul",
        "last_name": "FOPA",
        "email": "pfopa@acerfi.net",
        "role": "EMPLOYE",
        "departement": depts["IT"],
        "poste": postes["IT_Stagiaire Développeur"],
        "password": "Demo2026!",
    },
    {
        "username": "marie.talla",
        "first_name": "Marie",
        "last_name": "TALLA",
        "email": "mtalla@acerfi.net",
        "role": "EMPLOYE",
        "departement": depts["MKT"],
        "poste": postes["MKT_Chargé Marketing Digital"],
        "password": "Demo2026!",
    },
    {
        "username": "eric.essomba",
        "first_name": "Eric",
        "last_name": "ESSOMBA",
        "email": "eessomba@acerfi.net",
        "role": "EMPLOYE",
        "departement": depts["FIN"],
        "poste": postes["FIN_Comptable"],
        "password": "Demo2026!",
    },
]

demo_users = {}
for u_data in users_data:
    password = u_data.pop("password")
    u, created = User.objects.get_or_create(
        username=u_data["username"],
        defaults={**u_data, "entreprise": entreprise}
    )
    if created:
        u.set_password(password)
        u.save()
        print(f"  Créé : {u.username}")
    else:
        if not u.entreprise:
            u.entreprise = entreprise
            u.save()
        print(f"  Existant : {u.username}")
    demo_users[u.username] = u

# 5. Assigner responsables aux départements
depts["RH"].responsable = demo_users["admin.rh"]
depts["RH"].save()
depts["IT"].responsable = demo_users["manager.it"]
depts["IT"].save()

# 6. Contrats actifs
contrats_data = [
    ("alice.mballa",  "CDI",   450000, "2024-01-15", None),
    ("paul.fopa",     "STAGE",  80000, "2026-05-12", "2026-11-12"),
    ("marie.talla",   "CDD",   320000, "2025-06-01", "2026-12-31"),
    ("eric.essomba",  "CDI",   380000, "2023-03-01", None),
    ("admin.rh",      "CDI",   600000, "2022-09-01", None),
    ("manager.it",    "CDI",   520000, "2023-01-10", None),
]

for username, type_c, salaire, debut, fin in contrats_data:
    emp = demo_users[username]
    Contrat.objects.get_or_create(
        employe=emp,
        type_contrat=type_c,
        date_debut=date.fromisoformat(debut),
        defaults={
            "salaire": salaire,
            "statut": "ACTIF",
            "poste": emp.poste,
            "entreprise": entreprise,
            "date_fin": date.fromisoformat(fin) if fin else None,
        }
    )

# 7. Pointages de démonstration — Avril, Mai, Juin 2026
from presences.models import Pointage
from datetime import time, datetime
import random, calendar

random.seed(2026)

employes_actifs = list(User.objects.filter(role='EMPLOYE', entreprise=entreprise))

def _jours_ouvres(annee_p, mois_p):
    return [
        date(annee_p, mois_p, d)
        for d in range(1, calendar.monthrange(annee_p, mois_p)[1] + 1)
        if date(annee_p, mois_p, d).weekday() < 5
    ]

nb_pts = 0
for emp in employes_actifs:
    for annee_p, mois_p in [(2026, 4), (2026, 5), (2026, 6)]:
        for jour in _jours_ouvres(annee_p, mois_p):
            r = random.random()
            if r < 0.06:
                # Absence implicite — pas de pointage créé (compté côté backend)
                continue
            elif r < 0.11:
                # Congé
                Pointage.objects.get_or_create(
                    employe=emp, date=jour,
                    defaults={'statut': 'CONGE', 'entreprise': entreprise}
                )
            else:
                # Présent ou Retard (statut auto-calculé par Pointage.save())
                if r < 0.72:
                    arr = time(7, random.randint(30, 59))   # à l'heure
                else:
                    arr = time(8, random.randint(10, 45))   # en retard
                dt_dep = datetime.combine(jour, arr) + timedelta(hours=random.uniform(7.5, 9.5))
                Pointage.objects.get_or_create(
                    employe=emp, date=jour,
                    defaults={
                        'heure_arrivee': arr,
                        'heure_depart':  dt_dep.time(),
                        'statut':        'PRESENT',
                        'entreprise':    entreprise,
                    }
                )
            nb_pts += 1

print(f"Pointages de démo : {nb_pts} enregistrés (Avr-Mai-Juin 2026)")

print()
print("=== Données de démonstration créées avec succès ===")
print(f"Entreprise : {entreprise.nom}")
print(f"Départements : {Departement.objects.filter(entreprise=entreprise).count()}")
print(f"Utilisateurs démo : {len(demo_users)}")
print()
print("Comptes de connexion pour la soutenance :")
print("  RH      : admin.rh      / Demo2026!")
print("  Manager : manager.it    / Demo2026!")
print("  Employé : alice.mballa  / Demo2026!")
print("  Employé : paul.fopa     / Demo2026!")
