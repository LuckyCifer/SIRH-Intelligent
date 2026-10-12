# Intelligence artificielle : fonctionnement et plan B

## Architecture

Tous les appels d'IA passent par un client unique, `backend/ia/client.py` :

1. **Gemini** (Google), modèle `gemini-flash-latest`, via le SDK officiel `google-genai`
   (l'ancien SDK `google-generativeai` n'est plus maintenu par Google) ;
2. si Gemini est surchargé ou en quota épuisé : **OpenRouter**, avec une cascade de
   modèles gratuits ;
3. si aucun fournisseur ne répond : **plan B**, un résultat calculé sans IA.

Chaque appel est limité à 60 secondes. Les analyses tournent en arrière-plan : la
soumission d'un rapport ou d'une évaluation n'attend jamais l'IA.

## Plan B : ce que produit chaque module sans IA

Déclenché quand il n'y a pas de connexion Internet, que les quotas sont épuisés, qu'aucune
clé d'API n'est configurée, ou que la réponse de l'IA est inexploitable. Sans réseau,
l'échec est détecté immédiatement : aucune cascade de tentatives inutiles.

| Module | Résultat sans IA | Signalé comme tel |
|---|---|---|
| Rapport RH mensuel | Score de santé RH pondéré (voir ci-dessous), alertes et recommandations par règles explicites, tendance par rapport au mois précédent, tableau des indicateurs | bandeau « Analyse IA indisponible : motif », source « calcul sans IA » |
| Évaluation de performance | Score /100 = moyenne des six notes du manager, niveau, points forts (notes ≥ 4) et axes de développement (notes ≤ 2) | synthèse « Analyse IA indisponible » |
| Analyse de CV | Score de correspondance des compétences de l'offre retrouvées dans le CV (texte extrait localement), compétences manquantes, recommandation sans rejet automatique ; CV scanné signalé | « Analyse IA indisponible », source « calcul sans IA » |
| Analyse des rapports hebdomadaires | Le rapport reste soumis et consultable ; l'analyse est relancée plus tard | journal applicatif |

### Score de santé RH sans IA

Moyenne pondérée des composantes disponibles pour le mois :

| Composante | Poids | Valeur |
|---|---:|---|
| Présence | 30 | taux de présence si les pointages couvrent au moins 50 % des pointages attendus (employés × jours ouvrés) ; sinon la couverture elle-même |
| Objectifs (période couvrant le mois) | 25 | taux d'atteinte |
| Congés (demandes du mois) | 20 | taux d'approbation |
| Formations (se déroulant dans le mois) | 15 | taux de présence aux formations |
| Paie (mois terminé) | 15 | part des employés ayant un bulletin |
| Discipline | 10 | 100 − part des employés sanctionnés dans le mois |

Un mois sans pointage ni paie obtient donc un score bas, et non un score flatteur
fondé sur la seule absence de sanctions.

### Alertes par règles

Aucun pointage, ou pointages incomplets (< 50 % des attendus, présence alors non
interprétée) · présence < 90 % (critique < 80 %) · retards (importants au-delà de 20 %
des présences) · demandes de congé en attente · objectifs atteints < 50 % · paie non
établie ou incomplète pour un mois terminé · procédures disciplinaires en cours.
Tendance : hausse ou baisse si le score varie d'au moins 5 points par rapport au
rapport du mois précédent.

Le rapport mensuel produit par le plan B est complet et exploitable : il peut être
présenté tel quel, puis régénéré avec l'IA dès que le service est de nouveau accessible.

## Vérification

`python manage.py test rapport_ia` simule une coupure réseau, des quotas épuisés, des
clés absentes et une réponse illisible, sans aucun appel réseau réel (11 tests) ;
`python manage.py test recrutements` couvre l'analyse des CV et son plan B (15 tests).

## Pour la soutenance

Si la salle n'a pas Internet, la génération du rapport mensuel fonctionne quand même :
elle bascule sur le calcul par règles en quelques secondes. C'est une démonstration du
plan B, pas une panne.
