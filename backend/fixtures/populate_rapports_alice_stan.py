"""
Rapports hebdomadaires fictifs pour Alice (stagiaire) et Stan (encadreur).
Idempotent — get_or_create.
"""
from datetime import date
from django.utils import timezone
from django.utils.timezone import make_aware, datetime
from accounts.models import User
from rapports.models import RapportHebdomadaire
from stagiaires.models import StagePeriode, ProjetSoutenance


alice = User.objects.get(username="Alice")
stan  = User.objects.get(username="Stan")

# ── 1. StagePeriode : Stan encadre Alice ─────────────────────────────────────
periode, c = StagePeriode.objects.get_or_create(
    stagiaire=alice,
    encadreur=stan,
    defaults={
        "date_debut":  date(2026, 5, 4),
        "date_fin":    date(2026, 11, 4),
        "statut":      "EN_COURS",
        "description": (
            "Stage de 6 mois en developpement logiciel — Projet SIRH Intelligent. "
            "Departement Informatique & Systemes, ACERFI SARL, Yaounde."
        ),
    }
)
print(f"  StagePeriode  : {'creee' if c else 'existante'} (Stan encadre Alice)")

# ── 2. Projet de soutenance ───────────────────────────────────────────────────
projet, _ = ProjetSoutenance.objects.get_or_create(
    stagiaire=alice,
    defaults={
        "theme": (
            "Developpement d'un SIRH Intelligent avec analyses IA generative (Groq LLaMA 3.3)"
        ),
        "description": (
            "Conception et developpement d'une plateforme RH complete integrant 18 modules "
            "fonctionnels et un moteur d'analyse IA pour le suivi mensuel de la sante RH. "
            "Stack technique : Django 5.2 + DRF + React 18 + Vite + AdminLTE + Groq API."
        ),
        "statut":          "EN_COURS",
        "livrable":        "Application web fonctionnelle + Rapport technique 80 pages + Soutenance orale",
        "date_soutenance": date(2026, 11, 10),
    }
)
print(f"  ProjetSoutenance : OK — {projet.theme[:50]}...")

# ── 3. Rapport S1 — VALIDE (semaine du 4 au 8 mai) ───────────────────────────
r1, c1 = RapportHebdomadaire.objects.get_or_create(
    stagiaire=alice,
    semaine_numero=1,
    defaults={
        "date_debut_semaine": date(2026, 5, 4),
        "date_fin_semaine":   date(2026, 5, 8),
        "activites_realisees": (
            "- Reunion d'integration avec Stan Gabriel (encadreur) et l'equipe IT.\n"
            "- Presentation des outils de travail : Git, VS Code, Jira, Slack.\n"
            "- Lecture et analyse des specifications fonctionnelles du projet SIRH Intelligent (18 modules).\n"
            "- Installation et configuration de l'environnement de developpement : Python 3.14, Node.js 18, MySQL 8.\n"
            "- Prise en main du depot Git, revue de l'architecture du projet existant.\n"
            "- Participation au stand-up hebdomadaire de l'equipe IT (mardi 15h).\n"
            "- Etude des concepts JWT (JSON Web Tokens) et de l'authentification Bearer."
        ),
        "projets_en_cours": (
            "Projet SIRH Intelligent — Phase d'initialisation.\n"
            "Avancement global : 5%\n"
            "- Environnement de developpement : configure et fonctionnel.\n"
            "- Architecture du projet : comprise (Django apps, React pages, API REST).\n"
            "Prochaine etape : demarrer le developpement du module Authentification (frontend React + JWT)."
        ),
        "difficultes": (
            "- Comprehension initiale de l'architecture multi-tenancy Django "
            "(middleware entreprise + JWT DRF).\n"
            "- Prise en main de React 18 et du state management avec Zustand.\n"
            "- Identification des 18 modules et de leurs interdependances."
        ),
        "objectifs_semaine_suiv": (
            "- Developper le composant LoginPage.jsx avec integration JWT.\n"
            "- Mettre en place le store Zustand (authStore) pour la session utilisateur.\n"
            "- Creer les layouts RHLayout, ManagerLayout et EmployeLayout avec AdminLTE 3.2.\n"
            "- Implementer le systeme de protection des routes (RequireAuth HOC)."
        ),
        "statut":                "VALIDE",
        "commentaire_encadreur": (
            "Excellente premiere semaine. Alice a fait preuve d'une grande capacite d'adaptation "
            "et d'une curiosite intellectuelle remarquable. Elle a pose les bonnes questions lors "
            "de la reunion d'integration et a rapidement assimile l'architecture du projet. "
            "Sa demarche methodique pour la configuration de l'environnement est un bon indicateur "
            "pour la suite du stage. Je valide ce rapport sans reserve. Tres bon debut !"
        ),
        "date_soumission": make_aware(datetime(2026, 5, 8, 17, 30)),
        "date_validation": make_aware(datetime(2026, 5, 11, 9, 15)),
    }
)
print(f"  Rapport S1 (VALIDE)    : {'cree' if c1 else 'existant'}")

# ── 4. Rapport S2 — SOUMIS (semaine du 11 au 15 mai) ─────────────────────────
r2, c2 = RapportHebdomadaire.objects.get_or_create(
    stagiaire=alice,
    semaine_numero=2,
    defaults={
        "date_debut_semaine": date(2026, 5, 11),
        "date_fin_semaine":   date(2026, 5, 15),
        "activites_realisees": (
            "- Developpement du composant LoginPage.jsx avec formulaire d'authentification JWT.\n"
            "- Integration de l'instance Axios avec interceptors pour la gestion automatique des tokens.\n"
            "- Mise en place du store Zustand (authStore) : login, logout, persistance session.\n"
            "- Creation des trois layouts principaux : RHLayout, ManagerLayout, EmployeLayout.\n"
            "- Implementation du sidebar AdminLTE 3.2 avec navigation dynamique par role.\n"
            "- Implementation du HOC RequireAuth avec redirection selon le role utilisateur.\n"
            "- Code review avec Kevin ESSOMBA (developpeur senior IT) sur les bonnes pratiques React."
        ),
        "projets_en_cours": (
            "Module Authentification & Layouts : 85% termine.\n"
            "- LoginPage + gestion JWT (access + refresh token) : complete.\n"
            "- Store Zustand authStore : complete (persistance localStorage).\n"
            "- Layouts RH / Manager / Employe avec sidebar : complets.\n"
            "- HOC RequireAuth avec roles : complete.\n"
            "Reste : tests sur Firefox/Safari, gestion du token expire cote frontend (interceptor refresh)."
        ),
        "difficultes": (
            "- Double rendu React StrictMode en developpement (useEffect execute 2x) : "
            "resolu avec toast.error({ id: 'unique-id' }) pour dedupliquer les toasts.\n"
            "- Gestion de l'expiration du token JWT et du refresh automatique via Axios interceptors.\n"
            "- Positionnement CSS du sidebar AdminLTE en mode responsive (breakpoints Bootstrap 4)."
        ),
        "objectifs_semaine_suiv": (
            "- Demarrer le module Departements : backend ViewSet DRF + frontend CRUD.\n"
            "- Implementer le Dashboard RH avec cartes KPI (statistiques temps reel).\n"
            "- Apprendre les serializers DRF imbriques (nested serializers FK).\n"
            "- Mettre en place les tests unitaires de l'API avec APITestCase Django."
        ),
        "statut":          "SOUMIS",
        "date_soumission": make_aware(datetime(2026, 5, 15, 16, 45)),
    }
)
print(f"  Rapport S2 (SOUMIS)    : {'cree' if c2 else 'existant'}")

# ── 5. Rapport S3 — BROUILLON (semaine du 18 au 22 mai) ──────────────────────
r3, c3 = RapportHebdomadaire.objects.get_or_create(
    stagiaire=alice,
    semaine_numero=3,
    defaults={
        "date_debut_semaine": date(2026, 5, 18),
        "date_fin_semaine":   date(2026, 5, 22),
        "activites_realisees": (
            "- Developpement complet du module Departements : modeles, serializers, ViewSet DRF.\n"
            "- Creation des pages React GestionDepartements.jsx et GestionPostes.jsx (CRUD complet).\n"
            "- Implementation du systeme de notifications internes (7 types d'evenements).\n"
            "- Composant ClochNotifications avec badge en temps reel (polling 30s).\n"
            "- Debut du module Conges : modeles TypeConge, DemandeConge, SoldeConge avec migrations.\n"
            "- Reunion d'avancement hebdomadaire avec Stan Gabriel (mercredi 14h)."
        ),
        "projets_en_cours": (
            "Module Departements : 100% termine (backend + frontend + tests API).\n"
            "Module Notifications : 70% (backend complet, frontend ClochNotifications en finalisation).\n"
            "Module Conges : 30% (modeles migres, ViewSet en cours de developpement).\n"
            "Avancement global du projet SIRH : 18%"
        ),
        "difficultes": (
            "- Gestion des signaux Django (post_save) pour la creation automatique des notifications.\n"
            "- Calcul automatique des soldes de conges en fonction du type de conge et de l'anciennete.\n"
            "- Gestion du workflow de validation des conges (EMPLOYE -> MANAGER -> RH)."
        ),
        "objectifs_semaine_suiv": (
            "- Finaliser le module Conges (workflow de validation + calcul soldes automatiques).\n"
            "- Commencer le module Presences (pointages entree/sortie + rapport mensuel CSV).\n"
            "- Finaliser et soumettre ce rapport S3 apres relecture."
        ),
        "statut": "BROUILLON",
    }
)
print(f"  Rapport S3 (BROUILLON) : {'cree' if c3 else 'existant'}")

print("\n" + "=" * 50)
print("  Resume final")
print("=" * 50)
total = RapportHebdomadaire.objects.filter(stagiaire=alice).count()
print(f"  Stagiaire   : {alice.get_full_name()} (EMPLOYE)")
print(f"  Encadreur   : {stan.get_full_name()} (MANAGER)")
print(f"  Rapports    : {total}")
for r in RapportHebdomadaire.objects.filter(stagiaire=alice).order_by("semaine_numero"):
    print(f"    S{r.semaine_numero} ({r.date_debut_semaine} -> {r.date_fin_semaine}) : {r.statut}")
print(f"  Projet      : {projet.theme[:55]}...")
print(f"  Soutenance  : {projet.date_soutenance}")
