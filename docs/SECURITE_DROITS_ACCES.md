# Sécurité : droits d'accès et données personnelles

Organisation retenue : celle d'une PME camerounaise. Les **RH** tiennent le dossier du
personnel, le **manager** (N+1) encadre son équipe, l'**employé** consulte ses propres
données et agit par des démarches prévues (demander un congé, pointer…).

Chaque règle est vérifiée par un test automatique : `python manage.py test accounts`
(16 tests de sécurité).

## Matrice des droits

| Domaine | Employé | Manager | RH |
|---|---|---|---|
| Dossier personnel complet (CNI, NIU, n° CNPS, état civil, Mobile Money) | le sien (profil) | non | tout le personnel |
| Annuaire | identité professionnelle | identité professionnelle | identité professionnelle |
| Contrats de travail | le sien, en lecture | son équipe, en lecture | création, modification |
| Sanctions disciplinaires | les siennes (réponse) | non | création, notification, archivage |
| Documents RH | les siens | ceux de son équipe | dépôt, modification |
| Congés | demander, annuler sa demande | valider ceux de son équipe (pas les siens) | tout, dérogation de solde motivée |
| Soldes de congés | lecture | lecture (équipe) | correction |
| Pointages | pointer arrivée / départ | lecture (équipe) | saisie et correction manuelles |
| Configuration des horaires | lecture | lecture | modification |
| Objectifs | mettre à jour sa progression | fixer ceux de son équipe | tout le personnel |
| Évaluations | signer ou contester | évaluer son équipe | tout le personnel |
| Rapports d'activité | les siens | ceux de ses stagiaires | tous |
| Départements, postes | lecture | lecture | création, modification |
| Paie, virements, rapports IA | ses bulletins | non | tout |

« Son équipe » = les employés actifs des départements dont le manager est responsable.
Un manager ne peut ni se fixer ses propres objectifs ni valider son propre congé :
ces décisions reviennent à son supérieur ou aux RH.

## Données personnelles : loi n° 2024/017 du 23 décembre 2024

La loi camerounaise relative à la protection des données à caractère personnel est
pleinement applicable depuis le **23 juin 2026** (fin du délai de mise en conformité
de 18 mois), sous le contrôle de l'Autorité de protection des données à caractère
personnel (APDP).

Application du principe de **minimisation** :

- L'**annuaire**, accessible à tous les salariés, ne contient que l'identité
  professionnelle : nom, fonction, département, poste, e-mail, téléphone, photo.
- Les fiches imbriquées dans les autres écrans (congés, présences, documents,
  rapports) utilisent le même résumé : un manager qui valide un congé ne reçoit plus
  le NIU, la CNI ou l'adresse du salarié.
- Le dossier complet (identifiants légaux, situation familiale, contact d'urgence,
  compte Mobile Money) reste réservé aux RH, qui en ont besoin pour la paie, la CNPS
  et les déclarations fiscales.

Implémentation : `UserResumeSerializer` (`backend/accounts/serializers.py`),
`membres_equipe` et `peut_gerer` (`backend/accounts/permissions.py`).

Sources : [Loi n° 2024/017 — entrée en vigueur le 23 juin 2026](https://droitmediasfinance.com/index.php/actualites/droit-tech-fintech/1297-cameroun-la-loi-sur-la-protection-des-donnees-a-caractere-personnel-entre-en-vigueur-ce-23-juin-2026) ·
[Lecture de la loi du 23 décembre 2024 (CIO Mag)](https://cio-mag.com/?p=59861)
