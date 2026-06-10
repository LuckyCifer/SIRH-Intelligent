# Checklist de soutenance — SIRH Intelligent
## À vérifier le jour J avant la présentation

**Auteur :** Yemeya Luc — ISA 2026  

---

## La veille de la soutenance

### Documentation

- [ ] `docs/RAPPORT_TECHNIQUE.md` — relu et corrigé
- [ ] `docs/GUIDE_INSTALLATION.md` — testé sur un poste vierge
- [ ] `docs/GUIDE_UTILISATEUR.md` — vérifié
- [ ] `docs/SCRIPT_DEMO_SOUTENANCE.md` — répété au moins 2 fois
- [ ] `README.md` — à jour avec les vraies informations

### Code et données

- [ ] Toutes les migrations appliquées (`python manage.py migrate` sans erreur)
- [ ] Fixture entreprise chargée (pk=1 ACERFI SARL présente)
- [ ] Données de démonstration chargées (`fixtures/demo_data.py`)
- [ ] Au moins 1 rapport IA déjà généré (pour éviter l'attente de 30s en démo)
- [ ] `backend/.env` configuré avec les bonnes valeurs
- [ ] `GROQ_API_KEY` valide et testée

### Build frontend

```bash
cd frontend
npm run build
```

- [ ] Build réussi (0 erreur, 0 avertissement critique)
- [ ] Nombre de modules : environ 746

---

## Le matin de la soutenance (2h avant)

### Services

- [ ] MySQL démarré (vérifier dans les Services Windows ou XAMPP)
- [ ] Backend Django lancé : `http://localhost:8000` répond
- [ ] Frontend Vite lancé : `http://localhost:5173` s'affiche
- [ ] Test de connexion avec `admin.rh` / `Demo2026!` → tableau de bord RH affiché

### Test des fonctionnalités critiques

- [ ] **Connexion JWT** : se connecter, se déconnecter, se reconnecter
- [ ] **Tableau de bord RH** : indicateurs chargés, graphiques affichés
- [ ] **Congés** : au moins 1 demande en statut "En attente" disponible
- [ ] **Paie** : au moins 1 bulletin disponible avec le détail CNPS + IRPP
- [ ] **Rapport IA** : 1 rapport déjà généré avec score > 0 disponible
- [ ] **Notifications** : au moins 2-3 notifications non lues (pour la démo de la cloche)
- [ ] **Annuaire** : liste des employés chargée
- [ ] **Paramètres entreprise** : page chargée sans spinner infini
- [ ] **Espace employé** : connexion avec `alice.mballa` → tableau de bord employé affiché
- [ ] **Cloche notifications** : badge rouge visible dans la navbar

### Réseau et affichage

- [ ] Mode plein écran configuré (F11)
- [ ] Résolution d'écran correcte (1920x1080 recommandé)
- [ ] Console navigateur (F12) fermée
- [ ] Zoom navigateur à 100%
- [ ] Police lisible pour le jury (zoom à 110% si petit écran)

---

## 30 minutes avant la soutenance

### Préparation de l'environnement de démo

- [ ] Navigateur ouvert sur `http://localhost:5173`
- [ ] 2 terminaux ouverts : un pour le backend, un pour le frontend
- [ ] Onglets navigateur préparés (optionnel) :
  - Onglet 1 : `http://localhost:5173` (accueil public)
  - Onglet 2 : prêt pour la connexion admin.rh
- [ ] Script de démo imprimé ou sur second écran

### Données de démo fraîches

```powershell
# Optionnel : régénérer les données si nécessaire
& "venv\Scripts\python.exe" manage.py shell --command="with open('fixtures/demo_data.py', encoding='utf-8') as f: exec(f.read())"
```

- [ ] Connexion `admin.rh` / `Demo2026!` → OK
- [ ] Connexion `alice.mballa` / `Demo2026!` → OK
- [ ] Connexion `manager.it` / `Demo2026!` → OK

---

## Pendant la démonstration

### Points de vérification en cours de démo

- [ ] Scène 1 (Accueil) : page publique chargée sans erreur
- [ ] Scène 2 (Connexion) : cloche de notifications visible avec badge
- [ ] Scène 4 (Congés) : validation d'une demande → notification générée
- [ ] Scène 5 (Paie) : bulletins avec calcul CNPS + IRPP correct
- [ ] Scène 6 (Rapport IA) : rapport existant affiché avec score RH
- [ ] Scène 7 (Employé) : vue restreinte correcte
- [ ] Scène 8 (Paramètres) : chargement sans erreur

### En cas de problème technique

| Problème | Solution rapide |
|----------|----------------|
| Backend ne répond pas | Redémarrer `python manage.py runserver` |
| 401 Unauthorized | Se déconnecter et se reconnecter |
| Rapport IA bloqué EN_COURS | Mentionner le daemon thread, montrer un rapport existant |
| Spinner infini paramètres | Vérifier que la fixture entreprise est chargée |
| Page blanche React | Vérifier que le frontend est bien lancé sur 5173 |
| Erreur CORS | Vérifier CORS_ALLOWED_ORIGINS dans .env |

---

## Checklist questions du jury

Questions préparées dans `SCRIPT_DEMO_SOUTENANCE.md` (section "Questions probables") :

- [ ] Pourquoi Django et non Node.js ?
- [ ] Pourquoi Groq et non OpenAI ?
- [ ] Sécurité des données RH
- [ ] Le système de paie est-il certifié ?
- [ ] Déploiement en production
- [ ] Pourquoi null=True sur les FK entreprise ?
- [ ] Gestion des pannes Groq API

---

## Checklist documents à remettre au jury

- [ ] `docs/RAPPORT_TECHNIQUE.md` (imprimé ou envoyé par email)
- [ ] `README.md` (imprimé ou envoyé par email)
- [ ] Archive du code source (ZIP ou lien Git)
- [ ] Présentation PowerPoint / Slides (si demandé)

---

## Après la soutenance

- [ ] Sauvegarder une copie de la base de données : `mysqldump sirh_db > sirh_db_backup.sql`
- [ ] Archiver le code source
- [ ] Mettre à jour le `README.md` avec la note obtenue (si applicable)

---

## Résumé de l'état final du projet

| Indicateur | Valeur |
|-----------|--------|
| Modules fonctionnels | 18 |
| Apps Django | 18 (dont 3 héritées GSRIA S1) |
| Pages React | 40+ |
| Migrations appliquées | 30+ |
| Modules JavaScript compilés | 746 |
| Erreurs de build | 0 |
| Comptes de démo | 6 |
| Modèles Django | 20+ |
| Endpoints API | 80+ |

---

*Checklist v1.0 — Yemeya Luc — Soutenance ISA 2026*
