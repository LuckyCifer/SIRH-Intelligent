# SIRH — Système d'Information des Ressources Humaines Intelligent

Plateforme RH complète avec analyses IA. Développé par Yemeya Luc — ACERFI SARL 2026.

## Stack technique

- **Backend** : Django 5.2 + DRF + PyMySQL + MySQL (`sirh_db`)
- **Frontend** : React 18 + Vite + AdminLTE 3.2 + Bootstrap 4
- **IA** : Groq API (llama-3.3-70b-versatile) — async daemon thread
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
└── frontend/         React 18 + Vite
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
| 10 | `analyse_ia` | Analyses IA Groq par rapport |
| 11 | `recrutements` | Offres d'emploi + Candidatures + Entretiens |
| 12 | `formations` | Formations + Inscriptions + Compétences |
| 13 | `sanctions` | Sanctions disciplinaires |
| 14 | `paie` | Paie simplifiée (CNPS 2.8%/7.7%, IRPP tranches) |
| 15 | `carriere` | Historique de carrière |
| 16 | `rapport_ia` | Rapport IA mensuel (async + Groq) |
| 17 | `notifications` | Notifications internes (7 types) |
| 18 | `stagiaires` | Héritage GSRIA |

## Rôles utilisateurs

| Rôle | Accès frontend | Permission Django |
|------|----------------|-------------------|
| `EMPLOYE` | `/employe/*` | IsAuthenticated |
| `MANAGER` | `/manager/*` | IsManagerOrRH |
| `RH` | `/rh/*` | IsRH (= IsAdminRH) |
| `ADMIN` | `/rh/*` + superadmin | IsRH + is_staff |

## Variables d'environnement (backend `.env`)

```
DB_NAME=sirh_db
DB_USER=root
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=3306
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7
```

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
| Manager | `manager.it` | `Demo2026!` |
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
React 18 StrictMode exécute les `useEffect` deux fois en développement.
Fix : `Promise.allSettled` + `toast.error(..., { id: 'unique-id' })` pour dédupliquer.

### Imports axios
Toujours `import api from "./axios"` (pas `./api`).

### URLs DRF
`@action` avec underscores → URLs avec tirets : `statut_generation` → `/statut-generation/`.

### Multi-tenancy
Champ `entreprise` FK (null=True, blank=True) sur tous les modèles.
`EntrepriseFilterMixin` dans les ViewSets pour filtrer par entreprise.

### Analyse IA async
Utilise `threading.Thread(target=..., daemon=True)` — ne bloque pas la réponse API.
Fallback sans GROQ_API_KEY : score calculé sans IA narrative.

### Paie — fiscalité camerounaise 2024
CNPS employé : 2,8% du salaire brut
CNPS employeur : 7,7% du salaire brut
IRPP : tranches progressives (exonération < 166 666 FCFA/mois)

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
