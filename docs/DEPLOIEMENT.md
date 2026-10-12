# Mise en production

## Architecture livrée

L'application est conteneurisée (`docker-compose.yml`) :

```
Internet ──HTTPS──▶ nginx (conteneur frontend)
                     ├── fichiers React compilés (npm run build)
                     ├── /static/, /media/  servis directement
                     └── /api/, /admin/  ──▶ Django + gunicorn (conteneur backend)
                                                  └──▶ MySQL 8.4 (conteneur db, volume persistant)
```

- **gunicorn** : 3 processus × 4 threads, délai de 180 s (génération des rapports IA).
- **Migrations et fichiers statiques** appliqués automatiquement au démarrage du backend.
- **Volumes** : `mysql_data` (base), `media` (photos, documents, CV), `static`.

Démarrage : `docker compose up -d --build`.

## Liste de contrôle avant ouverture

### 1. Secrets

| Secret | Où | Action |
|---|---|---|
| `SECRET_KEY` Django | `backend/.env` | générer : `python -c "import secrets; print(secrets.token_urlsafe(50))"` — l'application **refuse de démarrer** en production avec la clé de développement |
| Mot de passe MySQL | `.env` à la racine : `MYSQL_ROOT_PASSWORD=...` | remplacer la valeur par défaut **avant** le premier démarrage (elle est fixée à la création du volume) |
| Clés d'IA | `backend/.env` | `GEMINI_API_KEY`, `OPENROUTER_API_KEY` (facultatives : plan B sans IA) |

Les fichiers `.env` sont exclus du dépôt git.

### 2. HTTPS

1. Obtenir un certificat (Let's Encrypt / certbot) pour le domaine.
2. Terminer TLS dans nginx (bloc `listen 443 ssl`) ou sur un proxy amont qui transmet
   l'en-tête `X-Forwarded-Proto: https`.
3. Dans `backend/.env` :
   ```env
   DEBUG=False
   HTTPS=True
   ALLOWED_HOSTS=sirh.mon-domaine.cm
   CSRF_TRUSTED_ORIGINS=https://sirh.mon-domaine.cm
   CORS_ALLOWED_ORIGINS=https://sirh.mon-domaine.cm
   ```
   `HTTPS=True` active la redirection HTTPS, les cookies sécurisés et HSTS (1 an).
4. Contrôler : `docker compose exec backend python manage.py check --deploy`
   → seul `SECURE_HSTS_PRELOAD` reste signalé : l'inscription d'un domaine sur la liste de
   préchargement des navigateurs est quasi irréversible et se décide une fois le domaine
   définitif.

### 3. Sauvegardes

```bash
# Base de données (chaque nuit, conserver 30 jours)
docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction sirh_db' > sirh_$(date +%F).sql
# Fichiers déposés (photos, documents, CV)
docker run --rm -v sirh_media:/media -v "$PWD":/sauvegarde alpine tar czf /sauvegarde/media_$(date +%F).tgz -C /media .
```

Tester la restauration au moins une fois (`docker/mysql-init/` sur une instance vierge).

### 4. Données personnelles

La loi n° 2024/017 du 23 décembre 2024 est applicable depuis le 23 juin 2026. Avant
d'ouvrir le service : vérifier les formalités auprès de l'Autorité de protection des données
à caractère personnel (APDP), désigner la personne responsable des données RH, et informer
les salariés de la finalité des traitements. L'application applique déjà la minimisation
(annuaire sans identifiants légaux) et l'isolation entre entreprises.

### 5. Mise à jour

```bash
git pull
docker compose up -d --build      # migrations appliquées automatiquement
docker compose exec backend python manage.py test accounts entreprises rapport_ia conges paie presences
```

## Limites connues et évolutions

| Point | Situation actuelle | Évolution |
|---|---|---|
| Tâches IA | threads en arrière-plan (perdus si le serveur redémarre pendant une génération ; le rapport se régénère) | file de tâches Celery + Redis |
| Rafraîchissement des notifications | interrogation périodique | WebSocket (Django Channels) |
| Connecteur MySQL | PyMySQL (pur Python, installation simple) | mysqlclient pour de meilleures performances |
| Supervision | journaux Docker (`docker compose logs`) | centralisation des journaux, alertes |

## Hébergement

Un serveur Linux unique (VPS de 2 vCPU et 4 Go de mémoire) suffit pour une PME : l'ensemble
tient dans trois conteneurs. L'hébergement peut être local (centre de données au Cameroun)
ou en nuage ; sans accès Internet sortant, l'application reste pleinement fonctionnelle et les
rapports IA basculent sur le plan B.
