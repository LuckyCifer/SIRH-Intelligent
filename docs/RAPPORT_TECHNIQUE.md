# Rapport Technique — SIRH Intelligent
## Système d'Information des Ressources Humaines avec IA intégrée

**Auteur :** Yemeya Luc  
**Établissement :** ISA (Institut Supérieur d'Informatique Appliquée)  
**Entreprise d'accueil :** ACERFI SARL — Douala, Cameroun  
**Année :** 2026  
**Stack principal :** Django 5.2 + React 18 + MySQL + Groq IA  

---

## Table des matières

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Architecture générale](#2-architecture-générale)
3. [Architecture backend Django](#3-architecture-backend-django)
4. [Architecture frontend React](#4-architecture-frontend-react)
5. [Base de données](#5-base-de-données)
6. [Authentification et sécurité](#6-authentification-et-sécurité)
7. [Module Comptes & Utilisateurs](#7-module-comptes--utilisateurs)
8. [Module Entreprises (multi-tenancy)](#8-module-entreprises-multi-tenancy)
9. [Module Départements & Postes](#9-module-départements--postes)
10. [Module Contrats de travail](#10-module-contrats-de-travail)
11. [Module Congés & Absences](#11-module-congés--absences)
12. [Module Présences & Pointages](#12-module-présences--pointages)
13. [Module Documents RH](#13-module-documents-rh)
14. [Module Paie & Bulletins](#14-module-paie--bulletins)
15. [Module Objectifs & Évaluations](#15-module-objectifs--évaluations)
16. [Module Recrutements](#16-module-recrutements)
17. [Module Formations](#17-module-formations)
18. [Module Sanctions disciplinaires](#18-module-sanctions-disciplinaires)
19. [Module Carrière](#19-module-carrière)
20. [Module Notifications internes](#20-module-notifications-internes)
21. [Module Rapport IA mensuel](#21-module-rapport-ia-mensuel)
22. [Intégration IA — Groq API](#22-intégration-ia--groq-api)
23. [Décisions d'architecture](#23-décisions-darchitecture)
24. [Difficultés rencontrées et solutions](#24-difficultés-rencontrées-et-solutions)
25. [Perspectives d'évolution](#25-perspectives-dévolution)

---

## 1. Contexte et objectifs

### 1.1 Contexte

ACERFI SARL est un centre de formation numérique basé à Douala, Cameroun, spécialisé dans les métiers du développement web, de la cybersécurité, du cloud computing et de l'intelligence artificielle. Avec une équipe en croissance, la gestion des ressources humaines reposait sur des outils disparates (feuilles Excel, courriels, fichiers PDF) — un processus chronophage et source d'erreurs.

Ce projet de fin d'études, réalisé dans le cadre de la certification ISA, vise à concevoir et développer un **Système d'Information des Ressources Humaines intelligent** (SIRH) couvrant l'intégralité du cycle de vie d'un employé, de son recrutement à sa sortie de l'entreprise.

### 1.2 Objectifs fonctionnels

- Centraliser toutes les données RH dans une base de données unique et sécurisée
- Automatiser les calculs de paie selon la fiscalité camerounaise (CNPS + IRPP)
- Offrir un tableau de bord analytique en temps réel pour les responsables RH
- Intégrer une IA générative (Groq API / LLaMA 3.3) pour l'analyse mensuelle de la santé RH
- Fournir une application accessible depuis n'importe quel navigateur, sans installation cliente

### 1.3 Périmètre du projet

Le SIRH couvre **18 modules fonctionnels** regroupés en quatre grandes catégories :

| Catégorie | Modules |
|-----------|---------|
| Administration | Comptes, Entreprises, Départements, Postes |
| Gestion quotidienne | Contrats, Congés, Présences, Documents |
| Performance | Objectifs, Évaluations, Formations, Sanctions, Carrière |
| Finance & IA | Paie, Rapport IA, Notifications, Recrutements |

---

## 2. Architecture générale

### 2.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        Navigateur Web                           │
│  React 18 + Vite + AdminLTE 3.2 + Bootstrap 4 (localhost:5173) │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTP/REST + JSON + JWT Bearer
                        │ Axios (timeout 15s)
┌───────────────────────▼─────────────────────────────────────────┐
│              Django 5.2 + Django REST Framework                 │
│              (localhost:8000)                                   │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  JWT     │  │  Middleware  │  │  ViewSets DRF + Mixins   │  │
│  │  Auth    │  │  CORS, Entr. │  │  (EntrepriseFilterMixin) │  │
│  └──────────┘  └──────────────┘  └──────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────┘
                        │ PyMySQL
┌───────────────────────▼─────────────────────────────────────────┐
│              MySQL 8.x — base sirh_db                          │
│              Charset : utf8mb4 / Collation : utf8mb4_unicode_ci │
└─────────────────────────────────────────────────────────────────┘
                        │ API HTTP externe
┌───────────────────────▼─────────────────────────────────────────┐
│              Groq API — llama-3.3-70b-versatile                 │
│              (appel asynchrone, daemon thread)                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Choix du pattern architectural

L'application suit une architecture **SPA + API REST** :
- Le frontend React est une Single Page Application qui communique exclusivement via l'API JSON
- Le backend Django expose des endpoints REST stateless
- L'authentification repose sur des tokens JWT (sans sessions Django côté API)
- Les deux services sont indépendants et pourraient être déployés sur des serveurs distincts

---

## 3. Architecture backend Django

### 3.1 Structure des apps

```
backend/
├── config/
│   ├── settings.py      Configuration centrale
│   ├── urls.py          Routage racine
│   └── wsgi.py
├── accounts/            Utilisateurs + rôles
├── entreprises/         Multi-tenancy
├── departements/        Départements + Postes
├── contrats/            Contrats de travail
├── conges/              Congés & Absences
├── presences/           Présences & Pointages
├── documents/           Documents RH
├── objectifs/           Objectifs & Évaluations
├── recrutements/        Offres + Candidatures + Entretiens
├── formations/          Formations + Inscriptions
├── sanctions/           Sanctions disciplinaires
├── paie/                Bulletins de paie
├── carriere/            Historique de carrière
├── rapport_ia/          Rapport IA mensuel (async)
├── notifications/       Notifications internes
├── rapports/            Rapports hérités (GSRIA S1)
├── analyse_ia/          Analyses IA héritées (GSRIA S1)
├── stagiaires/          Module stagiaires (GSRIA S1)
└── fixtures/            Données de démonstration
```

### 3.2 Pattern des apps

Chaque app suit la même organisation :

```
app/
├── __init__.py
├── apps.py          AppConfig
├── models.py        Modèles Django ORM
├── serializers.py   DRF Serializers
├── views.py         ViewSets + APIViews
├── urls.py          Router + urlpatterns
└── migrations/      Migrations Django
```

### 3.3 Middleware

| Middleware | Rôle |
|-----------|------|
| `SecurityMiddleware` | En-têtes de sécurité HTTP |
| `CorsMiddleware` | Cross-Origin Resource Sharing (frontend Vite) |
| `SessionMiddleware` | Sessions Django (pour l'admin) |
| `AuthenticationMiddleware` | Auth session Django (pas JWT) |
| `EntrepriseMiddleware` | Résout l'entreprise de l'utilisateur (s'exécute APRÈS auth Django, AVANT les vues DRF) |

**Note critique** : `EntrepriseMiddleware` s'exécute dans la pile Django AVANT que DRF effectue l'authentification JWT. Les vues DRF doivent donc accéder à `request.user.entreprise` (résolu par DRF) et non `request.entreprise` (résolu par le middleware, qui peut être `None` si le user est `AnonymousUser`).

---

## 4. Architecture frontend React

### 4.1 Structure

```
frontend/src/
├── api/
│   ├── axios.js             Client HTTP centralisé (timeout 15s)
│   ├── auth.js
│   ├── comptes.js
│   ├── departements.js
│   ├── contrats.js
│   ├── conges.js
│   ├── presences.js
│   ├── documents.js
│   ├── objectifs.js
│   ├── recrutements.js
│   ├── formations.js
│   ├── sanctions.js
│   ├── paie.js
│   ├── rapport_ia.js
│   ├── entreprise.js
│   └── notifications.js
├── components/
│   ├── layout/
│   │   ├── RHLayout.jsx       Mise en page RH/Admin
│   │   ├── ManagerLayout.jsx  Mise en page Manager
│   │   └── EmployeLayout.jsx  Mise en page Employé
│   └── ui/
│       ├── ClochNotifications.jsx  Cloche de notifications (navbar)
│       ├── EtatVide.jsx            État vide réutilisable
│       └── ChargementPage.jsx      Spinner centré réutilisable
├── context/
│   └── ThemeContext.jsx       Contexte clair/sombre (localStorage)
├── pages/
│   ├── auth/                  Login, AccueilPublic
│   ├── rh/                    Tableau de bord RH, Paie, Rapport IA...
│   ├── manager/               Tableau de bord Manager, Congés équipe...
│   ├── employe/               Tableau de bord Employé, Mes congés...
│   ├── entreprise/rh/         Paramètres entreprise
│   └── notifications/shared/  Centre de notifications
├── store/
│   └── authStore.js           État global Zustand (JWT + user)
└── App.jsx                    Routage React Router v6
```

### 4.2 Gestion de l'état

| Outil | Usage |
|-------|-------|
| **Zustand** (`authStore`) | Token JWT, profil utilisateur, état de connexion |
| **useState** local | Données de page, formulaires, états de chargement |
| **useEffect** | Chargement de données au montage du composant |
| **ThemeContext** | Thème clair/sombre persisté en `localStorage` |

### 4.3 Système de routage

```
/                         AccueilPublic (public, sans auth)
/login                    Page de connexion
/rh/*                     Routes RH (rôles RH + ADMIN)
/manager/*                Routes Manager (rôle MANAGER)
/employe/*                Routes Employé (rôle EMPLOYE)
/notifications            Centre notifications (tous rôles)
/annuaire                 Annuaire (tous rôles)
```

Les routes protégées utilisent le composant `<RequireAuth roles={[...]}>` qui redirige vers `/login` si le token est absent ou expiré.

---

## 5. Base de données

### 5.1 Configuration

| Paramètre | Valeur |
|-----------|--------|
| SGBD | MySQL 8.x |
| Nom | `sirh_db` |
| Charset | `utf8mb4` |
| Collation | `utf8mb4_unicode_ci` |
| Connecteur Python | PyMySQL (pur Python, pas de dépendance C) |

### 5.2 Stratégie de migrations

L'ORM Django gère intégralement le schéma. Les migrations sont versionnées et peuvent être rejouées de zéro. Les champs FK ajoutés en cours de projet sont tous `null=True, blank=True` pour garantir la rétrocompatibilité avec les données existantes.

### 5.3 Principaux modèles et relations

```
User (accounts)
  ├── FK → Departement
  ├── FK → Poste
  └── FK → Entreprise

Entreprise (entreprises)
  └── OneToMany → User, Departement, Poste, Contrat,
                  DemandeConge, Pointage, Formation,
                  Sanction, Objectif, OffreEmploi,
                  BulletinPaie, RapportIAMensuel

BulletinPaie (paie)
  ├── FK → User (employe)
  ├── cotisation_cnps_employe  (2.8% du brut)
  ├── cotisation_cnps_employeur (7.7% du brut)
  └── irpp  (tranches progressives camerounaises)

RapportIAMensuel (rapport_ia)
  ├── FK → Entreprise
  ├── statut  (EN_ATTENTE / EN_COURS / TERMINE / ERREUR)
  ├── score_sante_rh  (0-100)
  └── contenu_json  (réponse complète Groq)
```

---

## 6. Authentification et sécurité

### 6.1 Authentification JWT

L'authentification repose sur `djangorestframework-simplejwt` avec les paramètres suivants :

| Paramètre | Valeur |
|-----------|--------|
| Type de token | Bearer JWT (RS256) |
| Durée access token | 60 minutes |
| Durée refresh token | 7 jours |
| Rotation des refresh tokens | Activée |
| Endpoint login | `POST /api/auth/login/` |
| Endpoint refresh | `POST /api/auth/refresh/` |

Le token d'accès est stocké en mémoire (`authStore` Zustand). Le token de rafraîchissement est stocké dans `localStorage`. Axios intercepte automatiquement les erreurs 401 et tente un refresh silencieux.

### 6.2 Contrôle d'accès (RBAC)

Quatre rôles sont définis dans `accounts.User.Role` :

| Rôle | Description | Accès |
|------|-------------|-------|
| `EMPLOYE` | Employé standard | Ses propres données uniquement |
| `MANAGER` | Responsable d'équipe | Données de son équipe |
| `RH` | Responsable RH | Accès global en lecture/écriture |
| `ADMIN` | Administrateur système | Accès total + Django admin |

Les permissions DRF (`IsAdminRH`, `IsManagerOrRH`, `IsAuthenticated`) sont définies dans `accounts/permissions.py` et appliquées au niveau des ViewSets.

### 6.3 Sécurité des API

- **CORS** : uniquement `http://localhost:5173` en développement
- **CSRF** : désactivé pour les endpoints API (JWT stateless)
- **SQL injection** : protégé par l'ORM Django (requêtes paramétrées)
- **XSS** : le frontend React échappe automatiquement les données dans le JSX
- **Secrets** : dans `.env` non versionné (`.gitignore`)
- **Timeout axios** : 15 secondes côté client

---

## 7. Module Comptes & Utilisateurs

**App Django :** `accounts`

### Modèle User

Étend `AbstractUser` de Django avec :
- `role` : EMPLOYE / MANAGER / RH / ADMIN
- `filiere` : domaine de formation (BUREAUTIQUE, DEV_WEB, IA, CLOUD...)
- `telephone`, `photo`, `bio` : informations personnelles
- `departement`, `poste` : rattachement organisationnel
- `entreprise` : rattachement multi-tenant

### Endpoints principaux

| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/api/auth/login/` | Connexion, retourne access + refresh token |
| POST | `/api/auth/refresh/` | Renouveler le token d'accès |
| GET/PATCH | `/api/accounts/me/` | Profil de l'utilisateur connecté |
| GET | `/api/accounts/users/` | Liste des utilisateurs (RH/Admin) |
| POST | `/api/accounts/register/` | Créer un compte employé |

---

## 8. Module Entreprises (multi-tenancy)

**App Django :** `entreprises`

### Architecture multi-tenant

Toutes les données du SIRH sont segmentées par entreprise grâce à un champ `entreprise` FK (null=True) présent sur chacun des 11 modèles principaux. Ce design permet d'héberger plusieurs entreprises clientes sur la même instance.

### Modèle Entreprise

| Champ | Type | Description |
|-------|------|-------------|
| `nom` | CharField | Nom légal |
| `slug` | SlugField unique | Identifiant URL |
| `secteur` | TextChoices | IT, Formation, Industrie... |
| `taille` | TextChoices | TPE/PME/ETI/GE |
| `couleur_primaire` | CharField | Hex CSS (#1F3864) |
| `couleur_secondaire` | CharField | Hex CSS (#2E74B5) |
| `logo` | ImageField | Logo pour l'interface |
| `date_expiration_abonnement` | DateField | Gestion des licences |

### EntrepriseFilterMixin

`EntrepriseFilterMixin` est un mixin DRF appliqué à tous les ViewSets. Il surcharge `get_queryset()` pour filtrer automatiquement les données par `request.user.entreprise`, garantissant l'isolation des données entre entreprises.

### Personnalisation dynamique

Les couleurs de l'entreprise sont chargées au login via `EntrepriseThemeLoader` (composant React dans `App.jsx`) et appliquées sur les variables CSS `--acerfi-blue` et `--acerfi-dark`, permettant une interface personnalisée par entreprise sans rechargement de page.

---

## 9. Module Départements & Postes

**App Django :** `departements`

Gestion de l'arborescence organisationnelle avec deux modèles liés :
- `Departement` : unité organisationnelle avec responsable
- `Poste` : intitulé de poste rattaché à un département, avec grille salariale

L'annuaire employés (`/annuaire`) exploite ces données pour afficher une fiche détaillée de chaque collaborateur.

---

## 10. Module Contrats de travail

**App Django :** `contrats`

Gestion des contrats avec alerte d'expiration automatique. Le management command `verifier_alertes_rh` (app `notifications`) génère des notifications à J-30, J-15, J-7 et J-3 avant la fin d'un CDD.

| Type | Description |
|------|-------------|
| CDI | Contrat à Durée Indéterminée |
| CDD | Contrat à Durée Déterminée (date d'expiration obligatoire) |
| STAGE | Convention de stage |
| FREELANCE | Contrat de prestation |

---

## 11. Module Congés & Absences

**App Django :** `conges`

Workflow complet de demande de congé :

```
EMPLOYE soumet → MANAGER/RH valide ou refuse → EMPLOYE notifié
```

Calcul automatique des soldes de congés (en jours ouvrés). Intégration notification : `notifier_conge_soumis()` et `notifier_conge_valide()` sont appelées depuis `conges/views.py` dans un bloc `try/except` silencieux pour ne pas bloquer la vue en cas d'erreur de notification.

---

## 12. Module Présences & Pointages

**App Django :** `presences`

Enregistrement des entrées/sorties avec calcul automatique des heures travaillées. Le Manager peut consulter les présences de son équipe. Indicateurs de ponctualité disponibles dans le tableau de bord RH.

---

## 13. Module Documents RH

**App Django :** `documents`

Gestion des documents administratifs (attestations de travail, bulletins d'attestation, contrats scannés). Upload de fichiers via `FileField` (MEDIA_ROOT configuré dans Django). Accès limité au propriétaire du document ou à un RH.

---

## 14. Module Paie & Bulletins

**App Django :** `paie`

### Calcul de paie — fiscalité camerounaise 2024

Le calcul du bulletin de paie respecte la réglementation camerounaise en vigueur :

| Cotisation | Taux | Assiette |
|------------|------|----------|
| CNPS employé | 2,8% | Salaire brut |
| CNPS employeur | 7,7% | Salaire brut |
| IRPP | Tranches progressives | Salaire imposable |

**Tranches IRPP (taux annuels) :**
- De 0 à 2 000 000 FCFA : 10%
- De 2 000 001 à 3 000 000 FCFA : 15%
- De 3 000 001 à 5 000 000 FCFA : 25%
- Au-delà de 5 000 000 FCFA : 35%

**Exonération mensuelle :** les revenus inférieurs à 166 666 FCFA/mois sont exonérés d'IRPP.

### Workflow de génération

1. Le RH crée un bulletin pour un employé pour un mois donné
2. Le système calcule automatiquement les cotisations
3. Le RH marque le bulletin comme payé → `notifier_bulletin_disponible()` envoie une notification à l'employé
4. L'employé consulte ses bulletins sur `/employe/paie`

---

## 15. Module Objectifs & Évaluations

**App Django :** `objectifs`

Gestion des objectifs SMART avec évaluation de performance. Chaque objectif est suivi via un indicateur de progression (pourcentage). L'IA Groq analyse les évaluations pour produire des recommandations de développement individualisées.

Le management command `verifier_alertes_rh` génère des notifications pour les objectifs en retard (`notifier_objectif_en_retard()`).

---

## 16. Module Recrutements

**App Django :** `recrutements`

Pipeline de recrutement complet :

```
Offre créée → Candidature reçue → Entretien planifié → Décision → Embauche
```

L'IA Groq analyse les CV candidats de manière asynchrone via `threading.Thread(daemon=True)` pour extraire compétences, points forts et adéquation au poste — sans bloquer la réponse API.

---

## 17. Module Formations

**App Django :** `formations`

Catalogue de formations avec système d'inscription. Suivi des compétences acquises par employé. Indicateurs de taux de formation dans le tableau de bord RH.

---

## 18. Module Sanctions disciplinaires

**App Django :** `sanctions`

Enregistrement confidentiel des sanctions (avertissement, mise à pied, licenciement). Accès réservé aux rôles RH et ADMIN. Historique consultable pour alimenter les évaluations de performance.

---

## 19. Module Carrière

**App Django :** `carriere`

Traçabilité des évolutions de poste, promotions et augmentations salariales. Chaque mouvement est horodaté et rattaché à un employé. Fonctionnalité utile pour les entretiens annuels et la gestion des talents.

---

## 20. Module Notifications internes

**App Django :** `notifications`

### Architecture

Le module `notifications` fournit un système de messagerie interne asynchrone et non intrusif.

**Modèle Notification :**

| Champ | Type | Valeurs |
|-------|------|---------|
| `type` | TextChoices | INFO / SUCCES / ALERTE / URGENT |
| `categorie` | TextChoices | CONGE / EVALUATION / CONTRAT / PAIE / FORMATION / RECRUTEMENT / SYSTEME |
| `destinataire` | FK User | Utilisateur destinataire |
| `lue` | BooleanField | Statut de lecture |

**Services disponibles :**

```python
notifier_conge_soumis(demande)
notifier_conge_valide(demande, approuve=True/False)
notifier_evaluation_soumise(evaluation)
notifier_contrat_expirant(contrat, jours_restants)
notifier_bulletin_disponible(bulletin)
notifier_objectif_en_retard(objectif)
```

### Frontend — ClochNotifications

Le composant `ClochNotifications.jsx` dans la navbar effectue un polling toutes les 30 secondes via `setInterval`. Le `clearInterval` est appelé dans le `return` du `useEffect` pour éviter les fuites mémoire au démontage du composant. Un badge rouge affiche le compteur des notifications non lues.

### Commande cron

```bash
python manage.py verifier_alertes_rh
```

À planifier via le planificateur de tâches Windows (Task Scheduler) ou `cron` Linux pour une exécution quotidienne.

---

## 21. Module Rapport IA mensuel

**App Django :** `rapport_ia`

### Flux de génération

```
1. POST /api/rapport-ia/rapports/generer/
   → Crée RapportIAMensuel (statut=EN_COURS)
   → Lance threading.Thread(target=generer_rapport_ia, daemon=True)
   → Retourne immédiatement {id, statut}

2. GET /api/rapport-ia/rapports/{id}/statut-generation/
   → Polling frontend (setInterval 3s)
   → Retourne {statut, score_sante_rh}

3. Quand statut=TERMINE :
   GET /api/rapport-ia/rapports/{id}/
   → Retourne le rapport complet (JSON + Markdown)
```

### Score de santé RH

Le score (0-100) est calculé selon un barème pondéré sur plusieurs indicateurs :

| Indicateur | Poids |
|------------|-------|
| Taux d'absentéisme | 25% |
| Taux d'atteinte des objectifs | 25% |
| Taux de contrats actifs | 20% |
| Taux de présence | 20% |
| Taux de formation | 10% |

**Échelle d'interprétation :**
- 85-100 : Excellente santé RH
- 70-84 : Bonne santé RH
- 55-69 : Santé RH correcte
- 40-54 : Santé RH fragile
- 0-39 : Santé RH critique

---

## 22. Intégration IA — Groq API

### 22.1 Choix de Groq

Groq a été choisi pour sa latence très faible sur le modèle `llama-3.3-70b-versatile` (réponse en 1-3 secondes vs 10-20s pour d'autres providers). La clé API gratuite (tier Free) est suffisante pour les besoins du projet en développement.

### 22.2 Architecture asynchrone

L'appel à l'API Groq est effectué dans un **daemon thread** Python :

```python
thread = threading.Thread(
    target=generer_rapport_ia,
    args=(rapport.id,),
    daemon=True
)
thread.start()
```

L'option `daemon=True` garantit que si le processus Django s'arrête, les threads orphelins sont terminés automatiquement. Le frontend poll le statut toutes les 3 secondes jusqu'à `TERMINE` ou `ERREUR`.

### 22.3 Fallback sans clé API

Si `GROQ_API_KEY` est absent ou invalide, le service `calculer_score_sans_ia()` calcule un score de santé RH basé sur les métriques collectées, sans narrative générée par l'IA. Le rapport reste utilisable.

### 22.4 Prompt système

Le prompt système définit le rôle de l'IA (expert RH ACERFI Cameroun), le format de réponse attendu (JSON strict) et le barème d'interprétation. La réponse JSON est parsée et ses composants (score, résumé, alertes, recommandations, rapport Markdown) sont stockés dans les champs correspondants du modèle `RapportIAMensuel`.

---

## 23. Décisions d'architecture

### 23.1 PyMySQL vs mysqlclient

**Choix :** PyMySQL  
**Raison :** PyMySQL est un connecteur pur Python, sans dépendance à des bibliothèques C natives. Cela simplifie l'installation sur Windows (pas de compilation) et améliore la portabilité. La performance est légèrement inférieure mais négligeable pour ce type d'application.

### 23.2 Zustand vs Redux

**Choix :** Zustand  
**Raison :** Zustand est beaucoup plus léger (1 Ko vs ~50 Ko pour Redux + Toolkit). Pour l'état global limité de cette application (JWT + profil utilisateur), Zustand offre une API plus simple sans boilerplate excessif.

### 23.3 AdminLTE vs Tailwind CSS

**Choix :** AdminLTE 3.2 (Bootstrap 4)  
**Raison :** AdminLTE fournit un ensemble complet de composants d'interface d'administration (sidebar, cartes, tableaux, formulaires) immédiatement utilisables. Pour un projet académique avec contrainte de temps, cela a permis de se concentrer sur la logique métier plutôt que sur le design.

### 23.4 Champ entreprise null=True sur tous les modèles

**Choix :** FK nullable sur tous les modèles  
**Raison :** Garantit la rétrocompatibilité avec les données créées avant l'ajout du champ. Les migrations Django appliquées sur une base de données existante ne nécessitent pas de valeur par défaut, ce qui évite les erreurs de migration.

### 23.5 Daemon thread pour l'IA

**Choix :** `threading.Thread(daemon=True)` plutôt que Celery  
**Raison :** Celery nécessite un broker (Redis ou RabbitMQ) — une dépendance d'infrastructure non justifiée pour un projet académique. Le daemon thread Python est suffisant pour les besoins du projet, avec le risque acceptable de perdre la tâche en cas de redémarrage du serveur (le rapport restera en statut `EN_COURS` et l'utilisateur pourra regénérer).

---

## 24. Difficultés rencontrées et solutions

### 24.1 Middleware JWT — timing d'authentification

**Problème :** `EntrepriseMiddleware` s'exécute dans la pile middleware Django AVANT que DRF effectue l'authentification JWT. Résultat : `request.user` est `AnonymousUser` dans le middleware → `request.entreprise` est `None` → `MonEntrepriseView` retournait systématiquement 404, causant un spinner infini sur `/rh/parametres-entreprise`.

**Solution :** Suppression de la dépendance à `request.entreprise` dans la vue. `MonEntrepriseView._get_entreprise(request)` lit directement `request.user.entreprise` (disponible après auth JWT DRF) avec un fallback sur `Entreprise.objects.first()` pour les données de démo.

### 24.2 React 18 StrictMode — double appel useEffect

**Problème :** React 18 en mode développement exécute chaque `useEffect` deux fois (montage → démontage → remontage) pour détecter les effets de bord non idempotents. Cela causait l'affichage en double des toasts d'erreur.

**Solution :** `Promise.allSettled()` pour les appels parallèles + identifiants uniques sur les toasts (`toast.error(..., { id: 'unique-id' })`), ce qui déduplique automatiquement les toasts avec le même ID.

### 24.3 PowerShell et redirection stdin

**Problème :** PowerShell bloque l'opérateur `<` (réservé à une utilisation future). La commande `python manage.py shell < script.py` ne fonctionne pas.

**Solution :** `manage.py shell --command="with open('path.py', encoding='utf-8') as f: exec(f.read())"`.

### 24.4 Encodage BOM UTF-8 lors du piping

**Problème :** Piping d'un script Python via PowerShell introduit des caractères BOM (Byte Order Mark) en début de fichier, causant `SyntaxError: invalid character`.

**Solution :** Passage explicite du paramètre `encoding='utf-8'` à `open()` + utilisation de l'approche `--command` plutôt que le piping.

### 24.5 Imports axios — convention de nommage

**Problème :** Confusion entre `import api from './api'` (inexistant) et `import api from './axios'` (correct). Les erreurs de module non trouvé bloquaient le build Vite.

**Solution :** Convention établie dans `CLAUDE.md` : toujours `import api from "./axios"`.

### 24.6 Conflits de noms dans App.jsx

**Problème :** `DetailRapport` était déjà importé depuis les pages stagiaires lors de l'ajout du module `rapport_ia`.

**Solution :** Import nommé explicite — `import RapportIADetailPage from "./pages/rapport_ia/..."`.

---

## 25. Perspectives d'évolution

### 25.1 Déploiement en production

Le projet est actuellement en configuration développement (`DEBUG=True`, CORS limité à localhost). Pour un déploiement en production :

- Configurer `gunicorn` + `nginx` pour le backend
- Builder le frontend (`npm run build`) et servir les fichiers statiques via nginx
- Configurer `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` avec le domaine de production
- Remplacer `PyMySQL` par `mysqlclient` pour de meilleures performances
- Configurer SSL/TLS (Let's Encrypt)

### 25.2 Remplacer les daemon threads par Celery

Pour un déploiement robuste, les appels IA asynchrones devraient être migrés vers **Celery** avec **Redis** comme broker. Cela garantit la persistance des tâches en cas de redémarrage du serveur et offre un tableau de bord de monitoring (Flower).

### 25.3 Application mobile

L'API REST étant découplée du frontend, une application mobile React Native ou Flutter pourrait consommer la même API sans modification backend. Les endpoints sont déjà prêts.

### 25.4 Notifications en temps réel

Remplacer le polling `setInterval` (30s) de `ClochNotifications` par une connexion **WebSocket** (Django Channels) pour des notifications instantanées.

### 25.5 Module de planification des congés

Ajouter un calendrier interactif (FullCalendar) affichant les présences et absences par équipe, avec détection automatique des conflits de congés.

### 25.6 Exportation des rapports

Générer des rapports PDF (via `WeasyPrint` ou `ReportLab`) pour les bulletins de paie, rapports IA et tableaux de bord — à destination de l'impression ou de l'envoi par email.

### 25.7 Authentification LDAP / SSO

Intégration avec un annuaire LDAP d'entreprise (Microsoft Active Directory) ou un fournisseur SSO (Google Workspace, Microsoft Azure AD) via `django-auth-ldap` ou `python-social-auth`.

---

## Conclusion

Ce projet démontre la faisabilité de développer un SIRH complet et fonctionnel en moins de 6 mois avec des technologies modernes. L'intégration de l'IA générative (Groq/LLaMA 3.3) apporte une valeur ajoutée concrète au-delà du CRUD traditionnel, en transformant les données brutes RH en insights actionnables. La plateforme est prête pour un déploiement pilote et une utilisation réelle chez ACERFI SARL.

---

*Document généré le 2026-06-10 — Yemeya Luc, ISA*
