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
| Rapport RH mensuel | Score de santé RH pondéré (présences 30 %, objectifs 25 %, congés 20 %, formations 15 %, sanctions 10 %), alertes et recommandations par règles explicites (présence < 90 %, congés en attente, objectifs < 50 %, sanctions en cours), tableau des indicateurs | bandeau « Analyse IA indisponible : motif », source « calcul sans IA » |
| Évaluation de performance | Score /100 = moyenne des six notes du manager, niveau, points forts (notes ≥ 4) et axes de développement (notes ≤ 2) | synthèse « Analyse IA indisponible » |
| Analyse de CV | Aucun score inventé : le CV est à évaluer manuellement | « Analyse IA indisponible — évaluer manuellement » |
| Analyse des rapports hebdomadaires | Le rapport reste soumis et consultable ; l'analyse est relancée plus tard | journal applicatif |

Le rapport mensuel produit par le plan B est complet et exploitable : il peut être
présenté tel quel, puis régénéré avec l'IA dès que le service est de nouveau accessible.

## Vérification

`python manage.py test rapport_ia` simule une coupure réseau, des quotas épuisés, des
clés absentes et une réponse illisible, sans aucun appel réseau réel (8 tests).

## Pour la soutenance

Si la salle n'a pas Internet, la génération du rapport mensuel fonctionne quand même :
elle bascule sur le calcul par règles en quelques secondes. C'est une démonstration du
plan B, pas une panne.
