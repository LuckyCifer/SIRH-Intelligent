# Script de démonstration — Soutenance ISA
## SIRH Intelligent — Système d'Information des Ressources Humaines

**Durée totale :** 15 minutes  
**Présentateur :** Yemeya Luc  
**Date :** Novembre 2026  

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
| 8 | `paul.atangana` / `Demo2026!` | Manager |

---

## Structure de la démo

| # | Scène | Durée | Points clés |
|---|-------|-------|-------------|
| 1 | Page d'accueil publique | 45s | Premier contact, liste des fonctionnalités |
| 2 | Connexion & Tableau de bord RH | 90s | Authentification JWT, indicateurs temps réel |
| 3 | Gestion des employés & Annuaire | 90s | CRUD, multi-rôles |
| 4 | Congés & Workflow de validation | 120s | Workflow, notifications |
| 5 | Paie automatisée | 90s | Fiscalité camerounaise, CNPS + IRPP |
| 6 | Rapport IA mensuel (CLOU DE LA DÉMO) | 150s | Gemini, plan B hors ligne, score santé RH |
| 7 | Espace Employé | 60s | Vue multi-rôles |
| 8 | Multi-entreprises & Notifications | 60s | Architecture, personnalisation |

**Total : ~855 secondes = 14 min 15 s** (marge de 45 secondes)

---

## Scène 1 — Page d'accueil publique (45 secondes)

**URL :** http://localhost:5173/

**Script :**

> "Je vais commencer par vous présenter la page d'accueil publique de la plateforme. Cette page est accessible sans authentification et présente les 19 modules fonctionnels du SIRH."

*Pointer les fonctionnalités dans la grille.*

> "La plateforme a été développée pour ACERFI SARL, un centre de formation numérique basé à Yaoundé. Elle couvre l'intégralité du cycle de vie d'un employé, de son recrutement à sa sortie."

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

> "Voici le détail d'un bulletin. Le système distingue trois bases : le brut taxable pour l'impôt, l'assiette CNPS, et le total versé."

*Pointer chaque ligne (exemple du bulletin de référence : salaire de base 300 000, 2 ans d'ancienneté, prime de responsabilité 20 000, transport 25 000) :*
- > "La CNPS salariale : 4,2 % de l'assiette plafonnée à 750 000 FCFA, soit 13 944 FCFA"
- > "Côté employeur : 4,2 % pension, 7 % prestations familiales et 1,75 % accidents du travail"
- > "L'IRPP : abattement de 30 %, déduction de la CNPS et de 500 000 FCFA par an, puis barème 10 / 15 / 25 / 35 %, plus 10 % de centimes communaux"
- > "Le Crédit foncier, la redevance audiovisuelle et la taxe de développement local, par barèmes officiels"
- > "Net à payer : 310 045 FCFA — calcul vérifié par des tests automatiques"

> "Aucune retenue d'IRPP n'est opérée sous 62 000 FCFA par mois. Les barèmes ont été vérifiés sur les sources de la DGI et du MINFI."

*Montrer le bouton "Marquer comme payé".*

> "Lorsque l'employé est payé, le RH marque le bulletin, ce qui déclenche une notification automatique."

---

## Scène 6 — Rapport IA mensuel (150 secondes) ⭐ CLOU DE LA DÉMO

**URL :** /rh/rapport-ia

**IMPORTANT :** Préparer un rapport déjà généré pour éviter l'attente de 30s en direct. Avoir aussi le formulaire de génération prêt pour montrer le processus.

**Script — montrer un rapport existant d'abord :**

> "Voici le Rapport IA Mensuel — c'est la fonctionnalité la plus innovante du projet. Il analyse toutes les données RH du mois et génère un rapport de santé RH complet grâce à l'IA."

*Pointer le score de santé RH.*

> "Le score de santé RH synthétise les présences, les congés, les objectifs, les formations, la paie et la discipline du mois."

*Pointer le résumé exécutif.*

> "Le résumé exécutif est rédigé par Gemini de Google, à partir des données agrégées de l'entreprise — et uniquement de celle-ci."

> "Sans Internet, le rapport n'échoue pas : un plan B calcule le score, les alertes et les recommandations par règles explicites, et l'indique clairement."

*Pointer les alertes et recommandations.*

> "Le rapport fournit des alertes priorisées — CRITIQUE, IMPORTANT, INFO — et des recommandations concrètes avec leur priorité."

**Montrer la génération en direct (si le jury veut) :**

*Cliquer sur "Nouveau rapport" puis sélectionner le mois actuel.*

> "Je vais générer un nouveau rapport pour ce mois. Observez : la réponse API est immédiate, le rapport est créé avec le statut EN_COURS. L'appel à l'IA se fait dans un thread séparé pour ne pas bloquer le serveur."

*Montrer la barre de progression pendant 10 secondes.*

> "Le frontend poll le statut toutes les 3 secondes. En 15 à 30 secondes, le rapport est complet."

**Points techniques à mentionner :**
- `threading.Thread(target=..., daemon=True)` — non-bloquant
- Gemini (SDK officiel google-genai), secours OpenRouter, puis plan B par règles
- Sans réseau : bascule immédiate (aucune cascade de tentatives)
- Score pondéré : présence 30, objectifs 25, congés 20, formations 15, paie 15, discipline 10
- Contrôle de qualité des données : pointages incomplets ou paie non établie signalés
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

> "Voilà pour la démonstration. La plateforme est opérationnelle : 114 tests automatisés au vert et 78 pages vérifiées pour les trois rôles."

---

## Conclusion (hors démo — pour la présentation orale)

Points à mettre en avant face au jury :

1. **Couverture fonctionnelle complète** : 18 modules couvrant l'intégralité du cycle de vie RH
2. **Innovation IA** : Gemini transforme les données en recommandations ; un plan B garantit le service sans Internet
3. **Architecture propre** : séparation frontend/backend, JWT stateless, multi-tenancy
4. **Fiscalité locale** : paie conforme à la réglementation camerounaise 2024
5. **Rigueur** : 114 tests automatisés, conformité légale documentée (paie, congés, données personnelles), application conteneurisée

---

## Questions probables du jury & réponses préparées

**Q : Pourquoi Django et pas Node.js/Express ?**

> "Django offre un ORM puissant, un système de migrations intégré et un panel d'administration gratuit. Pour une application CRUD avec beaucoup de modèles de données RH, Django est plus productif que Node.js/Express où il faudrait assembler plusieurs bibliothèques."

**Q : Pourquoi Gemini ?**

> "Le prototype utilisait Groq, mais la désactivation du modèle utilisé avait été annoncée pour juillet 2026. Gemini offre une offre gratuite suffisante et de bonnes performances en français. Tous les appels passent par un client unique : changer de fournisseur ne touche qu'un fichier. OpenRouter sert de secours, et un plan B sans IA garantit que le rapport est produit même sans Internet."

**Q : Comment gérez-vous la sécurité des données RH ?**

> "JWT de 60 minutes ; droits par rôle — un manager n'agit que sur son équipe ; isolation stricte entre entreprises, testée avec deux entreprises complètes ; minimisation des données personnelles selon la loi n° 2024/017 en vigueur depuis le 23 juin 2026 : l'annuaire ne montre ni CNI, ni NIU, ni numéro CNPS. 18 tests de sécurité et 7 d'isolation le vérifient."

**Q : Le système de paie est-il certifié ?**

> "Non, il n'est pas certifié. Mais chaque barème — CNPS, IRPP, CAC, CFC, FNE, RAV, TDL, heures supplémentaires — a été vérifié sur des sources officielles et verrouillé par des tests, avec un bulletin de référence calculé à la main. Les mesures de la loi de finances 2024 suspendues par le MINFI sont paramétrables. Une mise en production passerait par la validation d'un expert-comptable."

**Q : Comment déployer en production ?**

> "L'application est déjà conteneurisée : Docker Compose avec MySQL, Django sous gunicorn et nginx. Pour la production : HTTPS, secrets hors du dépôt, sauvegardes de la base, et une file de tâches pour l'IA. Le détail est dans docs/DEPLOIEMENT.md."

**Q : Pourquoi null=True sur les FK entreprise ?**

> "Pour la rétrocompatibilité des migrations. L'isolation ne dépend pas de ce champ : elle passe par l'employé, donc une ligne au champ vide reste rattachée à la bonne entreprise. Une contrainte NOT NULL pourra être ajoutée une fois toutes les données migrées."

**Q : Que se passe-t-il si l'IA ne répond pas ?**

> "Délai maximal de 60 secondes par appel, Gemini puis OpenRouter. Sans réseau, la bascule est immédiate vers le plan B : score, alertes et recommandations par règles, avec la mention « Analyse IA indisponible ». Une évaluation est notée à partir des notes du manager ; un CV reçoit un score de correspondance des compétences, calculé localement, et un CV scanné est signalé plutôt que noté à tort. Le rapport peut être régénéré avec l'IA plus tard."

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

*Script de démo v2.0 — Yemeya Luc — Soutenance ISA 2026*
