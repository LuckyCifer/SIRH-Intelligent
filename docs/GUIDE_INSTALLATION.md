# Guide d'installation — SIRH Intelligent
## Système d'Information des Ressources Humaines

**Version :** 3.0 (S3 — Multi-entreprises + Notifications)  
**OS supporté :** Windows 10/11, Linux, macOS  
**Auteur :** Yemeya Luc — ACERFI SARL 2026  

---

## Prérequis

| Outil | Version minimale | Vérification |
|-------|-----------------|-------------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| MySQL | 8.0+ | `mysql --version` |
| Git | 2.x | `git --version` |

> **Windows :** MySQL 9.5 via XAMPP ou MySQL Installer est recommandé.  
> **Python 3.14** est utilisé dans l'environnement de développement du projet.

---

## Étape 1 — Cloner / récupérer le projet

```bash
# Via Git
git clone <url-du-dépôt> gsria
cd gsria

# Ou dézipper l'archive fournie
cd gsria
```

Structure attendue après clonage :

```
gsria/
├── backend/
├── frontend/
├── docs/
├── CLAUDE.md
└── README.md
```

---

## Étape 2 — Créer la base de données MySQL

Se connecter au client MySQL :

```bash
# Windows (XAMPP)
"C:\xampp\mysql\bin\mysql.exe" -u root -p

# Windows (MySQL Installer)
mysql -u root -p

# Linux / macOS
mysql -u root -p
```

Exécuter le script SQL :

```sql
-- Création de la base de données
CREATE DATABASE sirh_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Vérification
SHOW DATABASES LIKE 'sirh_db';

-- Quitter
EXIT;
```

---

## Étape 3 — Configurer l'environnement backend

### 3.1 Créer le fichier `.env`

Créer le fichier `backend/.env` avec le contenu suivant (adapter les valeurs) :

```env
# Django
SECRET_KEY=votre-cle-secrete-aleatoire-longue-ici
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de données MySQL
DB_NAME=sirh_db
DB_USER=root
DB_PASSWORD=votre_mot_de_passe_mysql
DB_HOST=localhost
DB_PORT=3306

# Groq IA (optionnel — le système fonctionne sans)
GROQ_API_KEY=gsk_...votre_cle_groq...
GROQ_MODEL=llama-3.3-70b-versatile

# JWT
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7

# CORS (frontend Vite)
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

> **Générer une SECRET_KEY :** `python -c "import secrets; print(secrets.token_urlsafe(50))"`  
> **Obtenir une clé Groq gratuite :** https://console.groq.com (inscription rapide)  
> **Sans GROQ_API_KEY :** le rapport IA fonctionne en mode dégradé (score calculé sans narrative)

---

## Étape 4 — Installer les dépendances Python

```powershell
# Windows PowerShell — depuis le dossier backend/
cd backend

# Activer le virtualenv existant (s'il est présent)
venv\Scripts\activate

# Ou créer un nouveau virtualenv
python -m venv venv
venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt
```

```bash
# Linux / macOS
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Dépendances principales installées :**

| Package | Usage |
|---------|-------|
| `Django==5.2` | Framework web |
| `djangorestframework` | API REST |
| `djangorestframework-simplejwt` | Authentification JWT |
| `django-cors-headers` | CORS pour le frontend |
| `PyMySQL` | Connecteur MySQL pur Python |
| `python-dotenv` | Lecture du fichier .env |
| `Pillow` | Gestion des images (photos, logos) |
| `groq` | Client API Groq IA |

---

## Étape 5 — Appliquer les migrations

```powershell
# Windows (depuis backend/)
& "venv\Scripts\python.exe" manage.py migrate
```

```bash
# Linux / macOS (depuis backend/)
python manage.py migrate
```

Résultat attendu : 30+ migrations appliquées, dont :
- `entreprises.0001_initial`
- `notifications.0001_initial`
- `accounts.0004_user_entreprise`
- *(et toutes les migrations des autres apps)*

---

## Étape 6 — Charger la fixture entreprise par défaut

```powershell
# Windows
& "venv\Scripts\python.exe" manage.py loaddata entreprises/fixtures/entreprise_defaut.json
```

```bash
# Linux / macOS
python manage.py loaddata entreprises/fixtures/entreprise_defaut.json
```

Cela crée l'entreprise **ACERFI SARL** (pk=1) utilisée par tous les comptes de démo.

---

## Étape 7 — Créer un superutilisateur (compte admin)

```powershell
# Windows
& "venv\Scripts\python.exe" manage.py createsuperuser
```

Saisir : username `admin`, email, mot de passe de votre choix.

Alternativement, utiliser les comptes de démo (étape 8).

---

## Étape 8 — Charger les données de démonstration

Ce script crée des données de test idempotentes (ne duplique pas si déjà présent).

```powershell
# Windows
& "venv\Scripts\python.exe" manage.py shell --command="with open('fixtures/demo_data.py', encoding='utf-8') as f: exec(f.read())"
```

```bash
# Linux / macOS
python manage.py shell -c "
with open('fixtures/demo_data.py', encoding='utf-8') as f:
    exec(f.read())
"
```

**Comptes créés :**

| Rôle | Username | Mot de passe | Prénom |
|------|----------|--------------|--------|
| RH | `admin.rh` | `Demo2026!` | Administrateur |
| Manager | `manager.it` | `Demo2026!` | Manager IT |
| Employé | `alice.mballa` | `Demo2026!` | Alice |
| Employé | `paul.fopa` | `Demo2026!` | Paul |
| Employé | `jean.nkomo` | `Demo2026!` | Jean |
| Employé | `marie.biya` | `Demo2026!` | Marie |

**Données créées :** 6 départements, 10 postes, 6 contrats.

---

## Étape 9 — Installer les dépendances frontend

```bash
# Depuis le dossier frontend/
cd frontend
npm install
```

### 9.1 Configurer l'URL de l'API (optionnel)

Vérifier que `frontend/.env` (ou `frontend/.env.local`) contient :

```env
VITE_API_URL=http://localhost:8000/api
```

Si le fichier n'existe pas, créer `frontend/.env` avec cette valeur.

---

## Étape 10 — Démarrer les serveurs

### 10.1 Backend Django

```powershell
# Windows (depuis backend/)
& "venv\Scripts\python.exe" manage.py runserver
```

```bash
# Linux / macOS (depuis backend/)
python manage.py runserver
```

Backend disponible sur : **http://localhost:8000**  
Interface admin Django : **http://localhost:8000/admin**

### 10.2 Frontend Vite (dans un second terminal)

```bash
# Depuis frontend/
npm run dev
```

Frontend disponible sur : **http://localhost:5173**

---

## Première connexion

1. Ouvrir **http://localhost:5173**
2. La page d'accueil publique s'affiche
3. Cliquer sur **"Se connecter"** ou aller sur **http://localhost:5173/login**
4. Se connecter avec `admin.rh` / `Demo2026!` pour accéder au tableau de bord RH

---

## Planification des alertes automatiques (optionnel)

Le management command `verifier_alertes_rh` vérifie les contrats expirants et objectifs en retard. Pour une exécution quotidienne :

### Windows — Task Scheduler

```
Nom : SIRH Alertes RH
Déclencheur : Quotidien, 08h00
Action : Programme = C:\chemin\gsria\backend\venv\Scripts\python.exe
         Arguments = manage.py verifier_alertes_rh
         Démarrer dans = C:\chemin\gsria\backend
```

### Linux — crontab

```bash
# Exécution quotidienne à 8h00
0 8 * * * /chemin/gsria/backend/venv/bin/python /chemin/gsria/backend/manage.py verifier_alertes_rh
```

---

## Build de production (frontend)

```bash
cd frontend
npm run build
# Les fichiers statiques sont générés dans frontend/dist/
# À servir via nginx ou un CDN
```

---

## Dépannage

### Erreur : `No module named 'pymysql'`

```bash
pip install PyMySQL
```

### Erreur : `Access denied for user 'root'@'localhost'`

Vérifier `DB_PASSWORD` dans `backend/.env`. S'assurer que MySQL est démarré.

### Erreur : `CORS blocked`

Vérifier `CORS_ALLOWED_ORIGINS=http://localhost:5173` dans `.env` et relancer Django.

### Erreur : `Table 'sirh_db.xxx' doesn't exist`

Les migrations n'ont pas été appliquées. Exécuter `python manage.py migrate`.

### Erreur : `django.db.utils.OperationalError: (2003, "Can't connect to MySQL server")`

MySQL n'est pas démarré. Démarrer le service MySQL via les Services Windows ou XAMPP.

### Le frontend affiche un spinner infini sur `/rh/parametres-entreprise`

Vérifier que la fixture entreprise a été chargée (étape 6). Si le problème persiste, ouvrir la console du navigateur et vérifier la réponse de `/api/entreprises/mon-entreprise/`.

### L'analyse IA reste en statut `EN_COURS`

Vérifier que `GROQ_API_KEY` est correctement renseignée dans `.env`. Consulter les logs Django (`python manage.py runserver` affiche les erreurs en console).

---

## Structure des URLs API

| Préfixe | App Django |
|---------|-----------|
| `/api/auth/` | Authentification JWT |
| `/api/accounts/` | Comptes utilisateurs |
| `/api/entreprises/` | Multi-entreprises |
| `/api/departements/` | Départements & Postes |
| `/api/contrats/` | Contrats |
| `/api/conges/` | Congés |
| `/api/presences/` | Présences |
| `/api/documents/` | Documents |
| `/api/objectifs/` | Objectifs |
| `/api/recrutements/` | Recrutements |
| `/api/formations/` | Formations |
| `/api/sanctions/` | Sanctions |
| `/api/paie/` | Paie |
| `/api/rapport-ia/` | Rapport IA |
| `/api/notifications/` | Notifications |
| `/api/carriere/` | Carrière |

---

*Guide d'installation v3.0 — Yemeya Luc, ACERFI SARL 2026*
