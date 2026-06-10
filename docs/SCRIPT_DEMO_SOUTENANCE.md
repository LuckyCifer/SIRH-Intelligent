# Script de démonstration — Soutenance ISA
## SIRH Intelligent — Système d'Information des Ressources Humaines

**Durée totale :** 15 minutes  
**Présentateur :** Yemeya Luc  
**Date :** Juin 2026  

---

## Préparation avant la démo (à faire 30 min avant)

### Vérifications techniques

```powershell
# Terminal 1 — Démarrer le backend
cd C:\Users\iNtel\OneDrive\Documents\gsria\backend
& "venv\Scripts\python.exe" manage.py runserver

# Terminal 2 — Démarrer le frontend
cd C:\Users\iNtel\OneDrive\Documents\gsria\frontend
npm run dev
```

### État attendu avant de commencer

- [ ] MySQL démarré (Services Windows ou XAMPP)
- [ ] Backend Django en cours d'exécution sur **http://localhost:8000**
- [ ] Frontend Vite en cours d'exécution sur **http://localhost:5173**
- [ ] Navigateur ouvert sur **http://localhost:5173** en mode plein écran
- [ ] Mode sombre ou clair choisi selon la préférence
- [ ] Console navigateur (F12) fermée
- [ ] Données de démo chargées (au moins 1 rapport IA généré en avance)

### Comptes à utiliser pendant la démo

| Scène | Compte | Rôle |
|-------|--------|------|
| 1-6 | `admin.rh` / `Demo2026!` | RH |
| 7 | `alice.mballa` / `Demo2026!` | Employé |
| 8 | `manager.it` / `Demo2026!` | Manager |

---

## Structure de la démo

| # | Scène | Durée | Points clés |
|---|-------|-------|-------------|
| 1 | Page d'accueil publique | 45s | Premier contact, liste des fonctionnalités |
| 2 | Connexion & Tableau de bord RH | 90s | Authentification JWT, indicateurs temps réel |
| 3 | Gestion des employés & Annuaire | 90s | CRUD, multi-rôles |
| 4 | Congés & Workflow de validation | 120s | Workflow, notifications |
| 5 | Paie automatisée | 90s | Fiscalité camerounaise, CNPS + IRPP |
| 6 | Rapport IA mensuel (CLOU DE LA DÉMO) | 150s | Groq LLaMA 3.3, score santé RH |
| 7 | Espace Employé | 60s | Vue multi-rôles |
| 8 | Multi-entreprises & Notifications | 60s | Architecture, personnalisation |

**Total : ~855 secondes = 14 min 15 s** (marge de 45 secondes)

---

## Scène 1 — Page d'accueil publique (45 secondes)

**URL :** http://localhost:5173/

**Script :**

> "Je vais commencer par vous présenter la page d'accueil publique de la plateforme. Cette page est accessible sans authentification et présente les 12 modules fonctionnels du SIRH."

*Pointer les fonctionnalités dans la grille.*

> "La plateforme a été développée pour ACERFI SARL, un centre de formation numérique à Douala. Elle couvre l'intégralité du cycle de vie d'un employé, de son recrutement à sa sortie."

*Montrer le bouton "Se connecter".*

> "Passons à la connexion."

---

## Scène 2 — Connexion & Tableau de bord RH (90 secondes)

**URL :** http://localhost:5173/login

**Script :**

> "La page de connexion est sécurisée par JWT. La session dure 60 minutes, avec renouvellement automatique via un refresh token de 7 jours."

*Se connecter avec `admin.rh` / `Demo2026!`.*

> "Je me connecte avec le compte Responsable RH."

*Après connexion, pointer les indicateurs du tableau de bord.*

> "Le tableau de bord RH présente les indicateurs clés en temps réel : le nombre d'employés actifs, les congés en attente de validation, les bulletins du mois, et les contrats expirant sous 30 jours."

*Pointer les graphiques Recharts.*

> "Les graphiques sont générés avec la bibliothèque Recharts. Ils se mettent à jour automatiquement à chaque connexion."

*Pointer la cloche de notifications dans la navbar.*

> "La cloche de notifications effectue un polling toutes les 30 secondes. Le badge rouge indique 3 notifications non lues — nous y reviendrons."

**Points techniques à mentionner si questionné :**
- JWT avec djangorestframework-simplejwt
- Zustand pour la gestion d'état (authStore)
- AdminLTE 3.2 + Bootstrap 4 pour le template

---

## Scène 3 — Gestion des employés & Annuaire (90 secondes)

**URL :** /rh/employes → cliquer sur un employé → /annuaire

**Script :**

> "Voici la liste des employés. Chaque employé est rattaché à un département et un poste. La gestion des rôles est centrale dans l'architecture : EMPLOYE, MANAGER, RH et ADMIN."

*Cliquer sur alice.mballa pour voir le profil.*

> "Le profil complet d'un employé inclut ses informations personnelles, son rattachement organisationnel et sa filière de formation."

*Naviguer vers /annuaire.*

> "L'annuaire est accessible à tous les rôles — employés, managers et RH. C'est un outil collaboratif pour retrouver les coordonnées d'un collègue."

**Points techniques :**
- `AbstractUser` Django étendu avec 4 rôles
- FK vers Departement et Poste
- Permissions DRF : `IsAdminRH`, `IsManagerOrRH`, `IsAuthenticated`

---

## Scène 4 — Congés & Workflow de validation (120 secondes)

**URL :** /rh/conges

**Script :**

> "Le module Congés implémente un workflow complet. Un employé soumet une demande, le manager ou le RH la valide ou la refuse, et l'employé est notifié automatiquement."

*Montrer une demande en attente.*

> "Cette demande d'Alice Mballa est en attente de validation. Je peux voir les dates, le motif et son solde de congés disponible."

*Cliquer sur "Approuver".*

> "En approuvant la demande, le système appelle automatiquement le service de notifications. Alice va recevoir une notification dans son espace employé."

*Pointer la notification dans la cloche.*

> "La notification apparaît dans la cloche avec la catégorie CONGE et le type SUCCES."

**Points techniques :**
- Service `notifier_conge_valide()` dans `notifications/services.py`
- Try/except silencieux pour ne pas bloquer la vue
- Soldes calculés automatiquement en jours ouvrés

---

## Scène 5 — Paie automatisée (90 secondes)

**URL :** /rh/paie → créer un bulletin ou en ouvrir un existant

**Script :**

> "Le module de paie est l'un des plus importants du projet. Il applique automatiquement la fiscalité camerounaise 2024."

*Ouvrir un bulletin existant pour montrer le détail.*

> "Voici le détail d'un bulletin. Le salaire brut est de 450 000 FCFA. Le système calcule automatiquement :"

*Pointer chaque ligne :*
- > "La cotisation CNPS employé : 2,8% du brut, soit 12 600 FCFA"
- > "La cotisation CNPS employeur : 7,7% du brut — à la charge de l'entreprise"
- > "L'IRPP selon les tranches progressives camerounaises"
- > "Et le net à payer"

> "Les salaires inférieurs à 166 666 FCFA par mois sont exonérés d'IRPP — c'est la réglementation en vigueur."

*Montrer le bouton "Marquer comme payé".*

> "Lorsque l'employé est payé, le RH marque le bulletin, ce qui déclenche une notification automatique."

---

## Scène 6 — Rapport IA mensuel (150 secondes) ⭐ CLOU DE LA DÉMO

**URL :** /rh/rapport-ia

**IMPORTANT :** Préparer un rapport déjà généré pour éviter l'attente de 30s en direct. Avoir aussi le formulaire de génération prêt pour montrer le processus.

**Script — montrer un rapport existant d'abord :**

> "Voici le Rapport IA Mensuel — c'est la fonctionnalité la plus innovante du projet. Il analyse toutes les données RH du mois et génère un rapport de santé RH complet grâce à l'IA."

*Pointer le score de santé RH.*

> "Le score de santé RH ici est de 78 sur 100. Il est calculé selon 5 indicateurs pondérés : taux d'absentéisme, objectifs atteints, contrats actifs, présences et formations."

*Pointer le résumé exécutif.*

> "Le résumé exécutif est généré par le modèle LLaMA 3.3 de Groq. Ce modèle de 70 milliards de paramètres analyse les données contextualisées pour ACERFI Cameroun."

*Pointer les alertes et recommandations.*

> "Le rapport fournit des alertes priorisées — CRITIQUE, IMPORTANT, INFO — et des recommandations concrètes avec leur priorité."

**Montrer la génération en direct (si le jury veut) :**

*Cliquer sur "Nouveau rapport" puis sélectionner le mois actuel.*

> "Je vais générer un nouveau rapport pour ce mois. Observez : la réponse API est immédiate, le rapport est créé avec le statut EN_COURS. L'appel à l'API Groq se fait dans un thread daemon Python séparé pour ne pas bloquer le serveur."

*Montrer la barre de progression pendant 10 secondes.*

> "Le frontend poll le statut toutes les 3 secondes. En 15 à 30 secondes, le rapport est complet."

**Points techniques à mentionner :**
- `threading.Thread(target=..., daemon=True)` — non-bloquant
- Modèle llama-3.3-70b-versatile (Groq)
- Fallback calculé sans GROQ_API_KEY
- Score pondéré sur 5 indicateurs collectés depuis tous les modules
- Prompt système contextualisé (expert RH Cameroun)

---

## Scène 7 — Espace Employé (60 secondes)

*Se déconnecter, puis se reconnecter avec `alice.mballa` / `Demo2026!`*

**URL :** http://localhost:5173/employe/dashboard

**Script :**

> "Regardons maintenant la vue de l'employé. La même plateforme, mais avec un périmètre restreint à ses propres données."

*Pointer le tableau de bord.*

> "Alice voit son solde de congés, ses objectifs en cours, et son dernier bulletin. Sa demande de congé approuvée tout à l'heure est maintenant visible."

*Naviguer vers /employe/paie.*

> "Elle peut consulter ses bulletins de paie. Elle a bien reçu la notification."

> "L'architecture multi-rôles garantit l'isolation des données : un employé ne peut pas accéder aux données de ses collègues ni aux fonctions d'administration."

**Points techniques :**
- `<RequireAuth roles={['EMPLOYE']}>` dans App.jsx
- Filtrage DRF : `queryset.filter(employe=request.user)`
- Même API, permissions différentes

---

## Scène 8 — Multi-entreprises & Notifications (60 secondes)

*Rester connecté comme alice.mballa ou se reconnecter comme admin.rh*

**URL :** /notifications → puis /rh/parametres-entreprise (admin.rh requis)

**Script :**

*Naviguer vers /notifications.*

> "Le centre de notifications regroupe toutes les notifications. On peut filtrer par catégorie — Congés, Paie, Contrats, Évaluations — et par statut Lu / Non lu."

*Montrer le bouton "Tout marquer comme lu".*

*Se reconnecter comme admin.rh si nécessaire, puis aller sur /rh/parametres-entreprise.*

> "Enfin, l'architecture multi-entreprises. La plateforme peut héberger plusieurs entreprises clientes en isolation complète. Chaque entreprise peut personnaliser son interface — logo, couleur primaire, couleur secondaire."

*Montrer le sélecteur de couleur.*

> "Ces couleurs sont chargées dynamiquement au login et appliquées via des variables CSS — aucune duplication de code."

> "Voilà pour la démonstration. La plateforme est opérationnelle avec 18 modules, 746 modules JavaScript compilés, 0 erreur de build."

---

## Conclusion (hors démo — pour la présentation orale)

Points à mettre en avant face au jury :

1. **Couverture fonctionnelle complète** : 18 modules couvrant l'intégralité du cycle de vie RH
2. **Innovation IA** : intégration LLaMA 3.3 pour transformer les données en insights actionnables
3. **Architecture propre** : séparation frontend/backend, JWT stateless, multi-tenancy
4. **Fiscalité locale** : paie conforme à la réglementation camerounaise 2024
5. **Production-ready** : le projet est déployable avec quelques ajustements de configuration

---

## Questions probables du jury & réponses préparées

**Q : Pourquoi Django et pas Node.js/Express ?**

> "Django offre un ORM puissant, un système de migrations intégré et un panel d'administration gratuit. Pour une application CRUD avec beaucoup de modèles de données RH, Django est plus productif que Node.js/Express où il faudrait assembler plusieurs bibliothèques."

**Q : Pourquoi Groq et pas OpenAI ?**

> "Groq présente une latence bien inférieure sur le modèle LLaMA — 1 à 3 secondes vs 10 à 20 secondes pour GPT-4. De plus, le tier gratuit de Groq est suffisant pour un projet académique. L'architecture permet facilement de switcher vers un autre provider en changeant la clé API."

**Q : Comment gérez-vous la sécurité des données RH ?**

> "Plusieurs niveaux de sécurité : JWT avec durée courte (60 min), contrôle d'accès basé sur les rôles (RBAC), isolation des données par entreprise (multi-tenancy), variables d'environnement pour les secrets, ORM Django contre les injections SQL."

**Q : Le système de paie est-il certifié ?**

> "Non, il s'agit d'une implémentation académique. Les taux CNPS (2,8% employé, 7,7% employeur) et les tranches IRPP sont conformes à la réglementation camerounaise 2024 selon les sources officielles, mais une utilisation en production nécessiterait une validation par un expert-comptable."

**Q : Comment déployer en production ?**

> "L'architecture est prête : gunicorn + nginx pour le backend, npm run build + nginx pour le frontend statique. Il faudrait ajuster les variables d'environnement (DEBUG=False, ALLOWED_HOSTS, CORS) et configurer SSL. Celery + Redis remplacerait les daemon threads pour les tâches async."

**Q : Pourquoi null=True sur les FK entreprise ?**

> "Pour la rétrocompatibilité des migrations. Les données existantes avant l'ajout du champ entreprise ne seraient pas impactées. En production, une contrainte NOT NULL pourrait être ajoutée une fois toutes les données migrées."

**Q : Comment gérez-vous les pannes Groq API ?**

> "Double protection : timeout de 15 secondes côté axios frontend + fallback dans le service Python. Si Groq ne répond pas ou si la clé est absente, la fonction `calculer_score_sans_ia()` produit un score basé sur les métriques calculées sans narrative IA. Le rapport reste exploitable."

---

## Minutage détaillé (aide-mémoire)

```
00:00 - 00:45  Scène 1 — Accueil public
00:45 - 02:15  Scène 2 — Connexion + Dashboard RH
02:15 - 03:45  Scène 3 — Employés + Annuaire
03:45 - 05:45  Scène 4 — Congés + Workflow
05:45 - 07:15  Scène 5 — Paie + Fiscalité
07:15 - 09:45  Scène 6 — Rapport IA ⭐
09:45 - 10:45  Scène 7 — Espace Employé
10:45 - 11:45  Scène 8 — Multi-entreprises + Notifications
11:45 - 15:00  Questions du jury
```

---

*Script de démo v1.0 — Yemeya Luc — Soutenance ISA 2026*
