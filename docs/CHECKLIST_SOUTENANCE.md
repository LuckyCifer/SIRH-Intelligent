# Checklist de soutenance — SIRH Intelligent
## À vérifier avant et pendant la présentation

**Auteur :** Yemeya Luc — ISA 2026

---

## La veille de la soutenance

### Documentation

- [ ] `docs/RAPPORT_TECHNIQUE.md` — relu et corrigé
- [ ] `docs/BULLETIN_PAIE_PAS_A_PAS.md` — bulletin de référence maîtrisé (savoir refaire le calcul)
- [ ] `docs/SECURITE_DROITS_ACCES.md` — matrice des droits connue
- [ ] `docs/IA_PLAN_B.md` — fonctionnement hors ligne compris
- [ ] `docs/SCRIPT_DEMO_SOUTENANCE.md` — répété au moins 2 fois
- [ ] `README.md` à jour (dépôt GitHub : branche fusionnée dans `main`)

### Code et données

- [ ] Migrations appliquées (`python manage.py migrate` sans erreur)
- [ ] Tests au vert :
  ```powershell
  cd backend
  python manage.py test accounts entreprises rapport_ia conges paie presences
  ```
  → 99 tests, `OK`
- [ ] `backend/.env` complet ; `GEMINI_API_KEY` testée (génération d'un rapport en ligne)
- [ ] Au moins un rapport IA déjà généré **en ligne** et un **hors ligne** (plan B), pour comparer
- [ ] Pointages et paie du mois présenté saisis (sinon le rapport signale à juste titre
      « pointages incomplets » ou « paie non établie »)

### Build frontend

```bash
cd frontend
npm run lint     # 0 erreur
npm run build    # build réussi
```

---

## Le matin de la soutenance (2 h avant)

### Services — au choix

**Docker** (recommandé, une seule commande) :

```powershell
docker compose up -d
```
→ application sur `http://localhost:8080`

**Ou en local** : MySQL démarré, `python manage.py runserver` (port 8000), `npm run dev`
(port 5173).

### Fonctionnalités critiques

- [ ] **Connexion** : `admin.rh`, `paul.atangana`, `alice.mballa` (mot de passe `Demo2026!`)
- [ ] **Tableau de bord RH** : indicateurs et graphiques chargés
- [ ] **Congés** : une demande « En attente » disponible ; solde détaillé affiché (droit acquis l'année précédente)
- [ ] **Paie** : un bulletin avec CNPS, IRPP, CAC, CFC, RAV, TDL ; aperçu PDF
- [ ] **Rapport IA** : un rapport généré, score affiché
- [ ] **Manager** : fiche d'un membre de l'équipe ouverte depuis « Mes employés »
- [ ] **Employé** : vue restreinte (ses données uniquement)
- [ ] **Notifications** : badge visible dans la barre du haut

### Affichage

- [ ] Plein écran (F11), zoom à 100 % (110 % si petit écran), console fermée

---

## 30 minutes avant

- [ ] Navigateur ouvert sur l'application ; onglets prêts (accueil, connexion RH)
- [ ] Script de démonstration sur un second écran ou imprimé
- [ ] Si la salle n'a pas Internet : c'est l'occasion de montrer le **plan B** — la
      génération du rapport mensuel bascule sur le calcul par règles en quelques secondes

---

## En cas de problème technique

| Problème | Solution rapide |
|----------|----------------|
| Backend ne répond pas | `docker compose restart backend` (ou relancer `runserver`) |
| 401 Unauthorized | Se déconnecter et se reconnecter |
| Pas d'Internet | Plan B : rapport calculé sans IA, signalé comme tel — le montrer comme une fonctionnalité |
| Rapport IA long | Montrer un rapport déjà généré ; l'analyse tourne en arrière-plan |
| Page blanche | Vérifier que le frontend tourne (port 8080 Docker ou 5173 local) |
| Erreur CORS (mode local) | Vérifier `CORS_ALLOWED_ORIGINS` dans `.env` |

---

## Questions probables du jury

- [ ] **Pourquoi Django + React ?** API REST découplée, ORM et migrations, écosystème mûr.
- [ ] **Quelle IA et que se passe-t-il sans Internet ?** Gemini via le SDK officiel, secours
      OpenRouter, puis plan B par règles explicables (`docs/IA_PLAN_B.md`).
- [ ] **La paie est-elle conforme ?** Barèmes CNPS, IRPP, CFC, RAV, TDL vérifiés sur sources
      officielles (DGI, MINFI) ; bulletin de référence testé ; mesures de la loi de finances
      2024 suspendues par le MINFI, paramétrables (`docs/BULLETIN_PAIE_PAS_A_PAS.md`).
- [ ] **Les congés respectent-ils le Code du travail ?** Art. 89 à 93 : 1,5 jour ouvrable par
      mois, majorations âge / mères / ancienneté, jours fériés de la loi n° 73/5.
- [ ] **Qui voit quoi ?** Matrice des droits ; un manager n'agit que sur son équipe.
- [ ] **Protection des données personnelles ?** Loi n° 2024/017 en vigueur depuis le
      23 juin 2026 : minimisation (annuaire sans CNI, NIU, CNPS).
- [ ] **Plusieurs entreprises sur la même plateforme ?** Isolation centrale testée avec deux
      entreprises complètes.
- [ ] **Pourquoi un module « stagiaires » dans un SIRH ?** Le projet est issu de GSRIA, outil de
      suivi des stagiaires d'ACERFI (centre de formation). Ce module est conservé et intégré :
      les rapports hebdomadaires et leur analyse IA servent aussi aux employés ; côté manager,
      les écrans parlent désormais de « Mon équipe ».
- [ ] **Comment avez-vous testé ?** 99 tests automatisés + vérification des 78 pages par rôle.
- [ ] **Déploiement en production ?** `docs/DEPLOIEMENT.md`.
- [ ] **Pourquoi `null=True` sur les FK entreprise ?** Compatibilité avec les données
      existantes ; l'isolation passe par l'employé, donc reste fiable même si le champ est vide.

---

## Documents à remettre au jury

- [ ] Rapport de stage / rapport technique
- [ ] Lien du dépôt Git (ou archive du code)
- [ ] Présentation (si demandée)

---

## Après la soutenance

- [ ] Sauvegarder la base : `mysqldump sirh_db > sirh_db_backup.sql`
- [ ] Archiver le code source

---

## État du projet

| Indicateur | Valeur |
|-----------|--------|
| Modules fonctionnels | 18 |
| Tests automatisés | 99 |
| Pages vérifiées par rôle | 78 |
| Erreurs de lint frontend | 0 |
| Conformité documentée | paie, congés, heures supplémentaires, données personnelles |

---

*Checklist v2.0 — Yemeya Luc — Soutenance ISA 2026*
