# SIRH — Système d'Information des Ressources Humaines Intelligent

Plateforme RH complète avec analyses IA. Développé par Yemeya Luc — ACERFI SARL 2026.

## Stack technique

- **Backend** : Django 5.2 + DRF + PyMySQL + MySQL (`sirh_db`)
- **Frontend** : React 19 + Vite 8 + AdminLTE 3.2 + Bootstrap 4
- **IA** : Gemini (gemini-flash-latest, SDK google-genai) + OpenRouter (secours) + plan B sans IA — async daemon thread via `ia/client.py`
- **Auth** : JWT (djangorestframework-simplejwt) — Bearer token
- **Charts** : Recharts (déjà installé, pas de nouvelle lib)

## Structure du projet

```
gsria/
├── backend/          Django 5.2
│   ├── config/       settings.py, urls.py
│   ├── fixtures/     demo_data.py, entreprise_defaut.json
│   ├── venv/         Python 3.14
│   └── <18 apps>/
└── frontend/         React 19 + Vite
    └── src/
        ├── api/      axios.js + un fichier par module
        ├── components/layout/  RHLayout, ManagerLayout, EmployeLayout
        ├── components/ui/      ClochNotifications, EtatVide, ChargementPage
        ├── pages/    par rôle + module
        └── store/    authStore.js (Zustand)
```

## Apps Django (18 modules)

| # | App | Description |
|---|-----|-------------|
| 1 | `accounts` | Utilisateurs + rôles (EMPLOYE/MANAGER/RH/ADMIN) |
| 2 | `entreprises` | Multi-entreprises + middleware JWT |
| 3 | `departements` | Départements + Postes |
| 4 | `contrats` | Contrats de travail (CDI/CDD/STAGE) |
| 5 | `conges` | Congés & Absences + soldes |
| 6 | `presences` | Présences & Pointages |
| 7 | `documents` | Documents RH |
| 8 | `objectifs` | Objectifs & Évaluations de performance |
| 9 | `rapports` | Rapports d'activité (héritage) |
| 10 | `analyse_ia` | Analyses IA (Gemini/OpenRouter) par rapport hebdomadaire |
| 11 | `recrutements` | Offres d'emploi + Candidatures + Entretiens |
| 12 | `formations` | Formations + Inscriptions + Compétences |
| 13 | `sanctions` | Sanctions disciplinaires |
| 14 | `paie` | Paie camerounaise 2024 (CNPS, IRPP+CAC, CFC, FNE, RAV, TDL, heures sup.) |
| 15 | `carriere` | Historique de carrière |
| 16 | `rapport_ia` | Rapport IA mensuel (async + Gemini/OpenRouter, plan B sans IA) |
| 17 | `notifications` | Notifications internes (7 types) |
| 18 | `stagiaires` | Héritage GSRIA |

## Rôles utilisateurs

| Rôle | Accès frontend | Permission Django |
|------|----------------|-------------------|
| `EMPLOYE` | `/employe/*` | IsAuthenticated |
| `MANAGER` | `/manager/*` | IsManagerOrRH |
| `RH` | `/rh/*` | IsRH (= IsAdminRH) |
| `ADMIN` | `/rh/*` + superadmin | IsRH + is_staff |

Règles de droits (détail : docs/SECURITE_DROITS_ACCES.md, tests : `python manage.py test accounts`) :
- MANAGER agit sur son équipe seulement : `membres_equipe()` / `peut_gerer()` (accounts/permissions.py) ;
  ne fixe pas ses propres objectifs, ne valide pas son propre congé
- Contrats, sanctions, documents, départements/postes, config présences, saisie de pointages,
  modification directe des demandes/soldes de congé : RH uniquement
- Données imbriquées et annuaire : `UserResumeSerializer` (pas de CNI/NIU/CNPS/état civil/Mobile Money,
  loi n° 2024/017) ; `UserSerializer` complet réservé aux RH et au profil de l'intéressé

## Variables d'environnement (backend `.env`)

```
DB_NAME=sirh_db
DB_USER=root
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=3306
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-flash-latest
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7
```

Production (détail : docs/DEPLOIEMENT.md) : `DEBUG=False` exige une vraie `SECRET_KEY` ;
`HTTPS=True` active redirection HTTPS, cookies sécurisés, HSTS ; `CSRF_TRUSTED_ORIGINS` ;
mot de passe MySQL Docker dans `.env` racine (`MYSQL_ROOT_PASSWORD`).

## Variables d'environnement (frontend `.env`)

```
VITE_API_URL=http://localhost:8000/api
```

## Commandes essentielles

```powershell
# Backend
cd backend
venv\Scripts\activate
python manage.py runserver

# Migrations
& "venv\Scripts\python.exe" manage.py makemigrations
& "venv\Scripts\python.exe" manage.py migrate

# Données de démo
& "venv\Scripts\python.exe" manage.py shell --command="
with open('fixtures/demo_data.py', encoding='utf-8') as f: exec(f.read())
"

# Alertes RH automatiques (cron)
& "venv\Scripts\python.exe" manage.py verifier_alertes_rh

# Frontend
cd frontend
npm run dev
npm run build
```

## Comptes de démonstration

| Rôle | Username | Mot de passe |
|------|----------|--------------|
| RH | `admin.rh` | `Demo2026!` |
| Manager | `paul.atangana` | `Demo2026!` |  (`manager.it` est désactivé)
| Employé | `alice.mballa` | `Demo2026!` |
| Employé | `paul.fopa` | `Demo2026!` |

Compte existant : `Lucky` / (mot de passe original)

## Points d'attention techniques

### Middleware JWT vs DRF
Le `EntrepriseMiddleware` s'exécute dans la pile Django AVANT que DRF
authentifie via JWT. Par conséquent `request.user` est `AnonymousUser`
dans le middleware. Dans les vues DRF, utiliser `request.user.entreprise`
(pas `request.entreprise`) pour accéder à l'entreprise.

### Double toast React StrictMode
React StrictMode exécute les `useEffect` deux fois en développement.
Fix : `Promise.allSettled` + `toast.error(..., { id: 'unique-id' })` pour dédupliquer.

### Imports axios
Toujours `import api from "./axios"` (pas `./api`).

### URLs DRF
`@action` avec underscores → URLs avec tirets : `statut_generation` → `/statut-generation/`.

### Multi-tenancy (isolation entre entreprises)
Source unique : `entreprises/isolation.py`.
- `CHEMINS` : chemin de chaque modèle vers son entreprise (via l'employé de préférence).
- `IsolationEntrepriseMixin` en PREMIER dans les bases de chaque vue : filtre dans
  `filter_queryset` (listes + get_object), contrôle les relations dans `create`/`update`
  (y compris un `employe` lu brut), rattache l'entreprise des objets créés.
- Actions personnalisées / statistiques : appliquer `filtrer_par_entreprise(qs, user)`
  explicitement (elles ne passent pas par filter_queryset).
- Superutilisateur = administrateur de la plateforme (toutes les entreprises, crée les entreprises).
- Tests : `python manage.py test entreprises` (deux entreprises complètes).

### Analyse IA async
Utilise `threading.Thread(target=..., daemon=True)` — ne bloque pas la réponse API.
Client centralisé : `ia/client.py` (SDK officiel `google-genai`) → `appeler_ia()` tente Gemini
(2 essais) puis la cascade OpenRouter ; délai 60 s par appel ; sans réseau, échec immédiat.
CV : `recrutements/cv.py` extrait le texte localement (pypdf, python-docx) et le pseudonymise avant
envoi à l'IA (loi 2024/017) ; plan B = correspondance des compétences ; CV scanné signalé.
CV fictifs de démo : `fixtures/cv_demo.py` (candidatures sans fichier uniquement).
Plan B : `IAIndisponible` → chaque module produit un résultat calculé sans IA, étiqueté
(`motif_plan_b`) — détail : docs/IA_PLAN_B.md, tests : `python manage.py test rapport_ia`.

### Paie — fiscalité camerounaise 2024
CNPS employé          : 4,2% du salaire brut cotisable (plafonné 750 000 FCFA/mois)
CNPS patronal pension : 4,2% du salaire brut cotisable
CNPS patronal famille : 7,0% du salaire brut cotisable
CNPS patronal AT      : 1,75% / 2,5% / 5% (risques A/B/C)
CFC salarié           : 1,0% | CFC patronal : 1,5% | FNE : 1,0% (assiette : brut taxable NON plafonné)
IRPP                  : tranches progressives sur SNC + CAC 10%
RAV                   : forfait 0 → 13 000 FCFA/mois selon le brut
TDL                   : forfait 250 → 2 500 FCFA/mois selon le salaire de base (> 62 000)
Heures sup.           : +20/30/40 % (tranches 8/8/4 au-delà de 40 h/sem.), dimanche +40 %, nuit +50 %
                        décret 95/677/PM art. 12 ; taux horaire = salaire / (520/3)
Tests                 : `python manage.py test paie` — cas de référence dans docs/BULLETIN_PAIE_PAS_A_PAS.md
Exonération IRPP      : SNC < 500 000 FCFA/an (< 41 666 FCFA/mois)
Assiettes             : transport permanent imposable (non cotisable) ; logement imposable ≤ 15 %
                        (cotisable au réel) ; représentation/alloc. non imposables ; AT CNPS sans plafond
LF 2024               : plafond 30 % (400 000/mois) + logement intégral — SUSPENDUS (MINFI 12/01/2024),
                        réglage PAIE_APPLIQUER_LF2024 (False par défaut)
Note : Les constantes TAUX_CNPS_EMPLOYE=0.028 et TAUX_CNPS_EMPLOYEUR=0.077 dans
       paie/models.py sont des valeurs LEGACY pour le fallback uniquement.
       Le CalculateurPaie (paie/calculateur.py) utilise les taux 2024 corrects.

### Congés — Code du travail (loi 92/007), art. 89 à 93
1,5 jour OUVRABLE/mois (lundi → samedi, hors fériés) ; 2,5 j/mois si < 18 ans ;
mères : +2 j/enfant < 6 ans (+1 j seulement si congé ≤ 6 j) ; ancienneté +2 j par 5 ans ;
jouissance après 12 mois ; allocation 1/16. Tests : `python manage.py test conges`.
Mères : majoration automatique si fiche employé sexe = F (nb_enfants_moins_6_ans).
Solde (conges/soldes.py, source unique) : congé de l'année N imputé sur le droit acquis en N-1
  − pris − en attente ; dépassement refusé sauf dérogation RH motivée (derogation_solde/par/motif) ;
  CONGES_ANTICIPATION_AUTORISEE=True ajoute le droit en cours.
Jours fériés (loi 73/5 modifiée) : source unique CalculateurConges, 10 jours/an, fête civile
  un dimanche reportée au lundi ; ajustements annuels (Aïd, ponts) via admin « JourFerieAjuste ».
  Frontend : hook useJoursFeries (endpoint /presences/jours-feries/<annee>/).

### Rapports
Le modèle de l'app `rapports` s'appelle `RapportHebdomadaire`
(table MySQL : `rapports_rapporthebdomadaire`), pas `RapportActivite`.

## Routes frontend principales

```
/                          Page d'accueil publique
/login                     Connexion

/employe/dashboard         Tableau de bord employé
/employe/conges            Mes congés
/employe/presences         Mes présences
/employe/paie              Mes bulletins

/manager/dashboard         Tableau de bord manager
/manager/conges            Congés équipe
/manager/presences         Présences équipe

/rh/dashboard              Dashboard RH (stats + IA)
/rh/parametres-entreprise  Paramètres entreprise
/rh/rapport-ia             Rapport IA mensuel
/rh/paie                   Gestion paie

/notifications             Centre de notifications (tous rôles)
/annuaire                  Annuaire employés (tous rôles)
```
