# CI/CD GitHub Actions

J’ai mis en place le pipeline dans `[../.github/workflows/ci.yml](../.github/workflows/ci.yml)`. Il se lance à chaque `push` et à chaque `pull_request`, sur toutes les branches, ce qui permet de vérifier le projet avant de merger.

La publication Docker se fait uniquement par GitHub Actions, uniquement lors d’un `push` sur `main`, et vers le registre du propriétaire du dépôt où la CI s’exécute.

## Étapes du pipeline


Le workflow est séparé en deux jobs : un pour le backend Django et un pour le frontend Nuxt.

1. Installation des dépendances
2. Exécution des tests
3. Exécution du linter
4. Scan de sécurité
5. Build de l’image Docker
6. Push de l’image sur GHCR seulement sur `main`

Pour le backend, la CI démarre aussi un service TimescaleDB afin de se rapprocher de l’environnement réel du projet. Les tests sont lancés avec `pytest`, le lint avec `ruff`, et les scans de sécurité avec `bandit`, `pip-audit` et Trivy.

Pour le frontend, la CI utilise Node 24, installe les dépendances avec `npm ci --legacy-peer-deps`, lance les tests Vitest, le lint ESLint, `npm audit`, puis construit l’image Docker.

Un troisième job **`discord-notify`** s’exécute toujours après les deux jobs (`if: always()`), avec le résumé vert / rouge. Configure le secret **`DISCORD_WEBHOOK_URL`** avec l’URL du webhook Discord (ne jamais la committer).

## Rapports générés

Les rapports sont disponibles dans l’onglet **Actions** de GitHub, sur le run concerné, section **Artifacts**.

Artefact `backend-ci-reports` :

- `junit.xml` : rapport de tests backend
- `coverage.xml` : couverture de tests backend
- `bandit.json` : scan SAST Python
- `pip-audit.json` : scan des dépendances Python
- `trivy-backend-image.json` : scan Trivy de l’image backend

Artefact `frontend-ci-reports` :

- `junit.xml` : rapport de tests frontend
- `npm-audit.json` : scan des dépendances npm
- `trivy-frontend-image.json` : scan Trivy de l’image frontend

Artefact `openvex-document` :

- `openvex.json` : fichier VEX utilisé avec Trivy

Les scans de sécurité sont configurés en mode rapport pour ce rendu. Ils produisent donc des preuves exploitables sans bloquer systématiquement la CI sur une vulnérabilité héritée d’une dépendance.

## Images Docker

Les images Docker sont construites à chaque run pour vérifier que les Dockerfiles restent valides.

Sur un `push` vers `main`, elles sont publiées sur GitHub Container Registry :

- `ghcr.io/<owner>/14_valorisationdonneemeteo/backend:latest`
- `ghcr.io/<owner>/14_valorisationdonneemeteo/backend:<sha>`
- `ghcr.io/<owner>/14_valorisationdonneemeteo/frontend:latest`
- `ghcr.io/<owner>/14_valorisationdonneemeteo/frontend:<sha>`

Le tag `<sha>` permet de retrouver précisément quelle image correspond à quel commit.

### Registre personnalisé (optionnel)

En plus de GHCR, le workflow peut pousser les images vers Sector16.

**Important — hostname Docker :** l’interface web peut être [registry.sector16.uk](https://registry.sector16.uk/), mais **`docker login` et `docker push`** doivent utiliser **`reg.sector16.uk`** (aligné avec le projet ouichef). Utiliser `registry.` pour le client Docker provoque souvent des **401** alors que les identifiants sont corrects.

1. Activer les étapes : **`CUSTOM_REGISTRY_PUSH` = `true` en Variable** (Settings → Actions → Variables uniquement : GitHub interdit `secrets` dans les `if:` des workflows).
2. **Identifiants** (au choix, mêmes noms de secrets que ouiChef si tu copies la config)  
   - soit `CUSTOM_REGISTRY_USER` + `CUSTOM_REGISTRY_TOKEN` ;  
   - soit `DOCKER_REGISTRY_USERNAME` + `DOCKER_REGISTRY_PASSWORD` (même noms que dans ouiChef).


Les cibles dans le workflow :

- `reg.sector16.uk/valorisationdonneemeteo-backend:<sha|latest>`
- `reg.sector16.uk/valorisationdonneemeteo-frontend:<sha|latest>`

Test local : `docker login reg.sector16.uk` puis `docker pull reg.sector16.uk/valorisationdonneemeteo-frontend:latest`.

Si le flag d’activation est absent, seul GHCR reçoit les images.

## Test volontaire de la CI

Pour vérifier que la CI détecte bien une régression :

1. Modifier temporairement un test, par exemple remplacer `expect(1 + 1).toBe(2)` par `expect(1 + 1).toBe(3)` dans un test frontend.
2. Pousser la branche et vérifier que le job frontend échoue dans GitHub Actions.
3. Corriger le test.
4. Repousser et vérifier que la CI repasse au vert.

Cette manipulation sert uniquement à prouver que le pipeline bloque bien une erreur de test. La version finale du code doit évidemment garder les tests corrects.

## Docker Hardened Images

Pour la partie “Docker Hardened Image”, ajout des Dockerfiles séparés :

- `[../backend/Dockerfile.dhi](../backend/Dockerfile.dhi)`
- `[../frontend/Dockerfile.dhi](../frontend/Dockerfile.dhi)`

Séparation des Dockerfiles classiques pour ne pas casser le développement local ni la CI existante. Ces fichiers utilisent les images `dhi.io/python` et `dhi.io/node`, avec un stage de build en variante `-dev` et un stage runtime plus minimal.

Exemples de build :

```bash
docker login dhi.io
docker build -f backend/Dockerfile.dhi -t meteo-backend:dhi backend
docker build -f frontend/Dockerfile.dhi -t meteo-frontend:dhi frontend
```

L’accès aux images DHI peut nécessiter une authentification Docker. Si on veut automatiser ces builds dans GitHub Actions, il faudra ajouter les secrets correspondants dans le fork.

## Lien avec le cours

Ce pipeline met en pratique une logique DevOps/DevSecOps assez classique :

- feedback rapide à chaque changement ;
- tests et lint avant la construction des images ;
- sécurité intégrée tôt dans le cycle de développement ;
- artefacts conservés pour prouver les résultats ;
- publication contrôlée des images uniquement depuis la branche principale.
