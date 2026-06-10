# GSRIA -- Guide de demarrage S1

## Sequence de demarrage

### 1. Demarrer MySQL
Demarrer le service MySQL95 depuis les Services Windows (ou XAMPP).

### 2. Creer la base de donnees (premiere fois seulement)
```sql
CREATE DATABASE sirh_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configurer le .env backend
Editer backend/.env et renseigner DB_PASSWORD et GROQ_API_KEY.

### 4. Backend
```bash
cd backend
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Backend sur : http://localhost:8000

### 5. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend sur : http://localhost:5173

---

## Endpoints API disponibles en S1

| Methode | URL                              | Description                    |
|---------|----------------------------------|--------------------------------|
| POST    | /api/auth/login/                 | Connexion JWT                  |
| POST    | /api/auth/refresh/               | Rafraichir le token            |
| POST    | /api/accounts/register/          | Creer un compte                |
| GET/PUT | /api/accounts/me/                | Mon profil                     |
| GET     | /api/accounts/users/             | Liste utilisateurs (Admin)     |
| GET/POST| /api/stagiaires/periodes/        | Periodes de stage              |
| GET/POST| /api/stagiaires/projets/         | Projets de soutenance          |
| GET/POST| /api/rapports/                   | Rapports hebdomadaires         |
| POST    | /api/rapports/{id}/soumettre/    | Soumettre + declenche IA       |
| POST    | /api/rapports/{id}/valider/      | Valider ou rejeter             |
| GET     | /api/analyse/                    | Liste des analyses IA          |
| GET     | /api/analyse/alertes/            | Stagiaires en alerte           |

