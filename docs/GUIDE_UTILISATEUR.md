# Guide Utilisateur — SIRH Intelligent
## Système d'Information des Ressources Humaines

**Version :** 3.0  
**Entreprise :** ACERFI SARL  
**URL de la plateforme :** http://localhost:5173 (développement)  

---

## Connexion à la plateforme

### Accès

1. Ouvrir un navigateur et aller sur **http://localhost:5173**
2. La page d'accueil présente les fonctionnalités de la plateforme
3. Cliquer sur **"Se connecter"** (bouton en haut à droite)

### Formulaire de connexion

- **Identifiant :** votre nom d'utilisateur (format `prenom.nom` pour les employés)
- **Mot de passe :** fourni par le service RH lors de la création de votre compte

### Thème clair / sombre

L'icône lune/soleil en haut à droite de la page de connexion bascule entre le thème clair et le thème sombre. La préférence est mémorisée pour les prochaines visites.

### Après connexion

La plateforme redirige automatiquement vers votre tableau de bord selon votre rôle :
- **RH / Admin** → Tableau de bord RH
- **Manager** → Tableau de bord Manager
- **Employé** → Tableau de bord Employé

---

## Partie 1 — Espace Responsable RH / Administrateur

*Accès : rôles RH et ADMIN*

---

### 1.1 Tableau de bord RH

Le tableau de bord est la page d'accueil après connexion. Il présente :

- **Indicateurs clés** : nombre d'employés actifs, congés en attente, bulletins générés, contrats expirant sous 30 jours
- **Graphiques Recharts** : évolution des présences, répartition des postes, taux d'objectifs atteints
- **Alertes récentes** : contrats à renouveler, objectifs en retard, congés à valider

### 1.2 Gestion des employés

**Navigation :** Menu lateral → Employés

#### Consulter la liste des employés

La liste affiche tous les employés avec leur département, poste et statut de contrat. Les filtres permettent de rechercher par nom, département ou rôle.

#### Créer un compte employé

1. Cliquer sur **"Nouvel employé"**
2. Remplir les champs obligatoires : nom, prénom, identifiant, mot de passe temporaire, rôle, département, poste
3. Cliquer sur **"Enregistrer"**
4. Communiquer l'identifiant et le mot de passe temporaire à l'employé

#### Modifier un profil

1. Cliquer sur l'icône crayon à côté de l'employé
2. Modifier les informations souhaitées
3. Enregistrer

### 1.3 Gestion des départements et postes

**Navigation :** Menu latéral → Départements

- Créer, modifier ou supprimer des départements
- Définir un responsable pour chaque département
- Gérer les postes avec leur grille salariale de référence

### 1.4 Gestion des contrats

**Navigation :** Menu latéral → Contrats

#### Types de contrats disponibles

| Type | Description |
|------|-------------|
| CDI | Contrat à Durée Indéterminée |
| CDD | Contrat à Durée Déterminée |
| STAGE | Convention de stage |
| FREELANCE | Contrat de prestation |

#### Créer un contrat

1. Cliquer sur **"Nouveau contrat"**
2. Sélectionner l'employé et le type de contrat
3. Renseigner le salaire brut, la date de début et (pour les CDD) la date de fin
4. Enregistrer

> **Alerte automatique :** Le système génère des notifications à J-30, J-15, J-7 et J-3 avant l'expiration d'un CDD.

### 1.5 Gestion des congés

**Navigation :** Menu latéral → Congés

#### Valider ou refuser une demande de congé

1. Dans l'onglet **"Demandes en attente"**, visualiser les demandes soumises
2. Cliquer sur une demande pour voir les détails (motif, dates, solde disponible)
3. Cliquer sur **"Approuver"** (vert) ou **"Refuser"** (rouge)
4. L'employé est notifié automatiquement

#### Consulter le planning des absences

L'onglet **"Planning"** affiche un calendrier mensuel des absences par département.

### 1.6 Gestion des présences

**Navigation :** Menu latéral → Présences

Visualiser les pointages de tous les employés. Filtrer par date, département ou employé. Exporter en CSV (bouton "Exporter").

### 1.7 Gestion de la paie

**Navigation :** Menu latéral → Paie

#### Générer un bulletin de paie

1. Cliquer sur **"Nouveau bulletin"**
2. Sélectionner l'employé et le mois/année
3. Vérifier le salaire brut (pré-rempli depuis le contrat)
4. Le système calcule automatiquement : CNPS employé (2,8%), CNPS employeur (7,7%), IRPP (tranches progressives)
5. Cliquer sur **"Générer"**

#### Marquer un bulletin comme payé

1. Dans la liste des bulletins, cliquer sur l'icône "Marquer comme payé" (coche verte)
2. L'employé reçoit une notification de disponibilité de son bulletin

#### Détail du bulletin

Cliquer sur un bulletin pour voir le détail complet : salaire brut, cotisations CNPS, IRPP, net à payer.

### 1.8 Gestion des objectifs et évaluations

**Navigation :** Menu latéral → Objectifs

#### Créer un objectif pour un employé

1. Cliquer sur **"Nouvel objectif"**
2. Sélectionner l'employé, saisir le titre, la description et la date limite
3. Enregistrer

#### Consulter les évaluations

Les évaluations soumises par les managers sont visibles dans l'onglet **"Évaluations"**. Chaque évaluation contient une note (1-10) et un commentaire.

### 1.9 Rapport IA mensuel

**Navigation :** Menu latéral → Rapport IA

#### Générer un rapport

1. Sélectionner le mois et l'année dans les menus déroulants
2. Optionnellement filtrer par département
3. Cliquer sur **"Générer le rapport"**
4. Patienter 10 à 30 secondes — la barre de progression indique l'avancement
5. Le rapport s'affiche avec : score de santé RH, résumé exécutif, alertes, recommandations

#### Interpréter le score de santé RH

| Score | Interprétation | Action recommandée |
|-------|----------------|-------------------|
| 85-100 | Excellente santé RH | Maintenir les bonnes pratiques |
| 70-84 | Bonne santé RH | Surveiller les points d'attention |
| 55-69 | Santé RH correcte | Actions correctives sur quelques indicateurs |
| 40-54 | Santé RH fragile | Plan d'action correctif requis |
| 0-39 | Santé RH critique | Intervention urgente de la direction |

#### Historique des rapports

L'onglet **"Historique"** liste tous les rapports générés avec leur score et la date de génération.

### 1.10 Paramètres entreprise

**Navigation :** Menu latéral → Paramètres (icône engrenage)

#### Informations générales

Modifier le nom de l'entreprise, le secteur d'activité, la taille, les coordonnées.

#### Personnalisation

- Uploader un logo (JPG/PNG, max 5 Mo)
- Choisir la couleur primaire et secondaire (palette de couleurs)
- L'aperçu en temps réel montre le rendu dans la barre de navigation

#### Configuration RH

Paramétrer le nombre de jours de congés annuels par défaut et le seuil d'alerte des contrats.

### 1.11 Annuaire employés

**Navigation :** Menu latéral → Annuaire  
*Accessible à tous les rôles*

Fiche complète de chaque employé : photo, département, poste, contact, filière de formation.

### 1.12 Gestion des recrutements

**Navigation :** Menu latéral → Recrutements

#### Créer une offre d'emploi

1. Cliquer sur **"Nouvelle offre"**
2. Renseigner le titre du poste, la description, le département, le type de contrat et la date limite
3. Publier l'offre

#### Gérer les candidatures

1. Cliquer sur une offre pour voir les candidatures reçues
2. Télécharger les CV
3. Planifier un entretien (date, heure, lieu)
4. Enregistrer la décision finale (retenu / non retenu)

> **IA CV :** Pour les candidatures avec CV uploadé, le système propose une analyse IA automatique des compétences et de l'adéquation au poste.

### 1.13 Notifications

**Navigation :** Icône cloche (navbar) ou Menu → Notifications

Le badge rouge sur la cloche indique le nombre de notifications non lues. Cliquer sur la cloche affiche les 6 dernières. Cliquer sur **"Voir toutes"** ouvre le centre de notifications complet avec filtres par catégorie et statut.

---

## Partie 2 — Espace Manager

*Accès : rôle MANAGER*

---

### 2.1 Tableau de bord Manager

Le tableau de bord Manager présente :
- Effectif de l'équipe et absences du jour
- Demandes de congés en attente de validation
- Objectifs de l'équipe et progression
- Alertes RH concernant l'équipe

### 2.2 Gestion des congés équipe

**Navigation :** Menu latéral → Congés équipe

#### Valider / Refuser une demande

1. Les demandes de son équipe en statut **"En attente"** sont listées
2. Cliquer sur une demande pour voir les détails
3. Cliquer sur **"Approuver"** ou **"Refuser"** avec un motif facultatif
4. L'employé reçoit une notification automatique

### 2.3 Présences de l'équipe

**Navigation :** Menu latéral → Présences équipe

Visualiser les pointages de son équipe par date. Identifier les absences non justifiées.

### 2.4 Objectifs de l'équipe

**Navigation :** Menu latéral → Objectifs équipe

#### Créer un objectif pour un membre de l'équipe

1. Cliquer sur **"Nouvel objectif"**
2. Sélectionner l'employé (uniquement membres de son équipe)
3. Définir l'objectif, la date limite et la pondération

#### Soumettre une évaluation de performance

1. Cliquer sur un employé
2. Onglet **"Évaluation"**
3. Attribuer une note (1-10) pour chaque objectif
4. Rédiger un commentaire général
5. Cliquer sur **"Soumettre l'évaluation"**

### 2.5 Annuaire

Accessible depuis le menu, le Manager peut consulter les fiches de l'ensemble des employés de l'entreprise.

### 2.6 Notifications

Même fonctionnement que pour le rôle RH. Les Managers reçoivent des notifications pour les demandes de congés de leur équipe et les objectifs en retard.

---

## Partie 3 — Espace Employé

*Accès : rôle EMPLOYE*

---

### 3.1 Tableau de bord Employé

Le tableau de bord personnel affiche :
- Solde de congés disponible
- Prochain pointage attendu
- Mes objectifs en cours avec leur avancement
- Mon dernier bulletin de paie
- Mes notifications récentes

### 3.2 Mes congés

**Navigation :** Menu latéral → Mes congés

#### Soumettre une demande de congé

1. Cliquer sur **"Nouvelle demande"**
2. Choisir le type de congé (congé annuel, maladie, exceptionnel...)
3. Saisir la date de début et la date de fin
4. Rédiger un motif (facultatif)
5. Cliquer sur **"Soumettre"**

> La demande part en attente de validation auprès du Manager ou RH.

#### Suivre l'état de mes demandes

Le tableau liste toutes les demandes avec leur statut :
- **En attente** (orange) : pas encore traitée
- **Approuvée** (vert) : validée
- **Refusée** (rouge) : refusée avec éventuel motif

#### Mon solde de congés

Le solde est affiché en haut de la page : jours acquis / jours pris / jours restants.

### 3.3 Mes présences

**Navigation :** Menu latéral → Mes présences

Historique personnel des pointages (entrée, sortie, heures travaillées) par jour et par mois.

### 3.4 Mes bulletins de paie

**Navigation :** Menu latéral → Mes bulletins

Liste des bulletins de paie disponibles. Cliquer sur un bulletin pour voir le détail :
- Salaire brut du mois
- Cotisations CNPS (part employé)
- Impôt sur le revenu (IRPP)
- **Net à payer**

### 3.5 Mes objectifs

**Navigation :** Menu latéral → Mes objectifs

Consulter les objectifs assignés avec leur avancement. Pour chaque objectif :
- Titre et description
- Date limite
- Progression (%)
- Statut (En cours / Atteint / En retard)

### 3.6 Mon profil

**Navigation :** Cliquer sur son nom/photo en haut à droite → Mon profil

Modifier ses informations personnelles :
- Photo de profil (JPG/PNG)
- Numéro de téléphone
- Bio / informations complémentaires

> Le nom d'utilisateur, le rôle et le département ne peuvent pas être modifiés par l'employé (réservé au RH).

### 3.7 Annuaire

**Navigation :** Menu latéral → Annuaire

Consulter les coordonnées et informations de ses collègues. Utile pour trouver le numéro d'un responsable ou l'email d'un collègue.

### 3.8 Notifications

L'employé reçoit des notifications automatiques pour :
- Validation ou refus de sa demande de congé
- Disponibilité d'un nouveau bulletin de paie
- Objectif en retard
- Expiration prochaine de son contrat (si CDD)

---

## Fonctionnalités communes à tous les rôles

### Thème clair / sombre

Cliquer sur l'icône soleil/lune dans la barre de navigation pour basculer entre les thèmes. La préférence est mémorisée dans le navigateur.

### Centre de notifications

Accessible via l'icône cloche (navbar) ou `/notifications`. Permet de :
- Voir toutes les notifications
- Filtrer par catégorie (Congés, Paie, Contrats...)
- Filtrer par statut (Lues / Non lues)
- Marquer toutes comme lues
- Supprimer les notifications lues

### Annuaire

Accessible depuis le menu latéral de tous les rôles. Affiche la fiche de chaque employé : photo, nom, poste, département, filière de formation, contact.

### Déconnexion

Cliquer sur le bouton rouge **"Déconnexion"** dans la barre de navigation ou en bas du menu latéral.

---

## Bonnes pratiques

1. **Connexion** : déconnectez-vous toujours en fin de session sur un ordinateur partagé
2. **Mot de passe** : choisissez un mot de passe fort (majuscule, chiffre, 8 caractères minimum)
3. **Congés** : soumettez vos demandes au moins 1 semaine à l'avance pour les congés planifiés
4. **Notifications** : consultez régulièrement votre centre de notifications pour ne manquer aucune action requise
5. **Bulletins** : conservez une copie de vos bulletins de paie (possibilité d'impression depuis le navigateur)

---

*Guide Utilisateur v3.0 — SIRH Intelligent — ACERFI SARL 2026*
