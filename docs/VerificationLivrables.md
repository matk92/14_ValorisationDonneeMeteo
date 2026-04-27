# Vérification des livrables DevOps

Ce document sert de checklist pour vérifier que les éléments demandés dans le sujet fonctionnent bien : CI/CD, rapports, Docker, Prometheus, Grafana et Docker Hardened Images.

## 1. CI/CD GitHub Actions

### Fichier workflow

À vérifier :

- le fichier `[../.github/workflows/ci.yml](../.github/workflows/ci.yml)` existe ;
- le workflow se lance sur `push` et `pull_request` ;
- il contient deux jobs : backend et frontend.

Dans GitHub :

1. Aller dans l’onglet **Actions**.
2. Ouvrir le workflow **CI**.
3. Vérifier qu’un run existe pour la branche testée.

### Étapes demandées

Dans le run GitHub Actions, vérifier que les étapes suivantes sont présentes.

Backend :

- installation des dépendances : `uv sync --extra dev` ;
- tests : `pytest` avec rapport JUnit et couverture ;
- linter : `ruff check` et `ruff format --check` ;
- sécurité : `bandit`, `pip-audit`, Trivy ;
- build Docker : `docker build` ;
- push GHCR uniquement si `push` sur `main`.

Frontend :

- installation des dépendances : `npm ci --legacy-peer-deps` ;
- tests : Vitest avec rapport JUnit ;
- linter : ESLint ;
- sécurité : `npm audit`, Trivy ;
- build Docker : `docker build` ;
- push GHCR uniquement si `push` sur `main`.

### Vérifier que la CI détecte une erreur

Procédure de test volontaire :

1. Créer une branche de test.
2. Modifier temporairement un test, par exemple dans un test Vitest :

```ts
expect(1 + 1).toBe(3);
```

1. Pousser la branche.
2. Vérifier dans **Actions** que la CI échoue à l’étape des tests.
3. Remettre le test correct :

```ts
expect(1 + 1).toBe(2);
```

1. Pousser la correction.
2. Vérifier que la CI repasse au vert.

### Badge CI dans le README

À vérifier :

- le badge CI est présent en haut de `[../README.md](../README.md)` ;
- le badge pointe vers le workflow `ci.yml` ;
- le badge affiche le statut du bon dépôt, surtout si le rendu se fait depuis un fork.

### Rapports attendus

Dans GitHub Actions, ouvrir le run puis la section **Artifacts**.

Artefacts attendus :

- `backend-ci-reports` ;
- `frontend-ci-reports` ;
- `openvex-document`.

Contenu attendu côté backend :

- `junit.xml` : rapport de tests ;
- `coverage.xml` : couverture ;
- `bandit.json` : scan code Python ;
- `pip-audit.json` : scan dépendances Python ;
- `trivy-backend-image.json` : scan Trivy de l’image backend.

Contenu attendu côté frontend :

- `junit.xml` : rapport de tests ;
- `npm-audit.json` : scan dépendances npm ;
- `trivy-frontend-image.json` : scan Trivy de l’image frontend.

Contenu attendu côté VEX :

- `[../security/openvex.json](../security/openvex.json)`.

### Images Docker

Les images sont construites à chaque run CI.

Sur un `push` vers `main`, elles doivent être publiées sur GitHub Container Registry :

- `ghcr.io/<owner>/14_valorisationdonneemeteo/backend:latest`
- `ghcr.io/<owner>/14_valorisationdonneemeteo/backend:<sha>`
- `ghcr.io/<owner>/14_valorisationdonneemeteo/frontend:latest`
- `ghcr.io/<owner>/14_valorisationdonneemeteo/frontend:<sha>`

À vérifier :

1. Aller sur GitHub.
2. Ouvrir la page du dépôt ou du profil propriétaire.
3. Aller dans **Packages**.
4. Vérifier la présence des images backend et frontend.

## 2. Prometheus

### Lancer Docker Compose

Depuis la racine du projet :

```bash
docker compose -f docker-compose.dev.yml up --build -d timescaledb backend prometheus grafana
```

Vérifier que les conteneurs tournent :

```bash
docker compose -f docker-compose.dev.yml ps
```

Résultat attendu :

- `timescaledb` est démarré ;
- `backend` est démarré ;
- `prometheus` est démarré ;
- `grafana` est démarré.

### Vérifier Prometheus

Ouvrir :

```text
http://localhost:9090
```

Puis aller dans :

```text
http://localhost:9090/targets
```

Résultat attendu :

- target `prometheus` en état `UP` ;
- target `django` en état `UP`.

### Configuration Prometheus

Le fichier à vérifier est `[../prometheus/prometheus.yml](../prometheus/prometheus.yml)`.

Il doit contenir :

- une target `localhost:9090` pour Prometheus ;
- une target `backend:8000` pour Django.

Le backend Django expose ses métriques via :

```text
/metrics
```

Depuis Prometheus, tester les requêtes :

```text
up
up{job="django"}
django_http_requests_total_by_method_total
django_http_responses_total_by_status_total
rate(django_http_requests_total_by_method_total[1m])
```

Résultat attendu :

- `up{job="django"}` retourne `1` ;
- les métriques `django_*` apparaissent après quelques appels à l’API.

Pour générer du trafic backend, ouvrir un endpoint API ou utiliser :

```bash
curl http://localhost:8000/metrics
```

## 3. Grafana

### Vérifier que Grafana démarre

Grafana est déclaré dans `[../docker-compose.dev.yml](../docker-compose.dev.yml)`.

Ouvrir :

```text
http://localhost:3001
```

Identifiants locaux :

- utilisateur : `admin` ;
- mot de passe : `admin`.

### Datasource Prometheus

La datasource est provisionnée dans `[../grafana/provisioning/datasources/prometheus.yml](../grafana/provisioning/datasources/prometheus.yml)`.

Dans Grafana :

1. Aller dans **Connections** ou **Data sources**.
2. Ouvrir la datasource **Prometheus**.
3. Vérifier que l’URL est :

```text
http://prometheus:9090
```

1. Cliquer sur **Save & test** si besoin.

Résultat attendu :

- Grafana indique que la datasource répond correctement.

### Dashboard Grafana

Le provisioning des dashboards est configuré dans `[../grafana/provisioning/dashboards/dashboards.yml](../grafana/provisioning/dashboards/dashboards.yml)`.

Le dashboard est défini dans `[../grafana/dashboards/meteo-observability.json](../grafana/dashboards/meteo-observability.json)`.

Dans Grafana :

1. Aller dans **Dashboards**.
2. Ouvrir le dossier **Meteo**.
3. Ouvrir le dashboard **Météo - Observabilité**.

Résultat attendu :

- un panneau indique que Django est `UP` ;
- un panneau indique que Prometheus est `UP` ;
- des visualisations affichent les requêtes Django, les statuts HTTP et la durée de scrape.

Si certains graphes sont vides, générer quelques requêtes vers le backend puis attendre un cycle de scrape Prometheus.

## 4. Docker Hardened Images

Les Dockerfiles DHI sont séparés des Dockerfiles classiques :

- `[../backend/Dockerfile.dhi](../backend/Dockerfile.dhi)` ;
- `[../frontend/Dockerfile.dhi](../frontend/Dockerfile.dhi)`.

Ils utilisent :

- `dhi.io/python` pour le backend ;
- `dhi.io/node` pour le frontend.

Vérification manuelle :

```bash
docker login dhi.io
docker build -f backend/Dockerfile.dhi -t meteo-backend:dhi backend
docker build -f frontend/Dockerfile.dhi -t meteo-frontend:dhi frontend
```

Résultat attendu :

- les deux images se construisent correctement ;
- l’accès à `dhi.io` fonctionne avec les identifiants Docker nécessaires.

Si l’accès DHI n’est pas disponible, le livrable reste vérifiable dans le code : les Dockerfiles DHI existent et montrent comment rendre les images de production compatibles avec Docker Hardened Images.

## 5. Checklist finale du rendu

- Le workflow GitHub Actions `CI` existe.
- La CI installe les dépendances.
- La CI lance les tests.
- La CI lance les linters.
- La CI lance les scans de sécurité.
- La CI build les images Docker.
- La CI push les images uniquement sur `main`.
- Le badge CI est présent dans le README.
- Les rapports de tests sont disponibles en artefacts.
- Les rapports de scans sont disponibles en artefacts.
- Les rapports Trivy sont disponibles en artefacts.
- Le fichier VEX existe.
- Prometheus démarre avec Docker Compose.
- La target `django` est `UP` dans Prometheus.
- La target `prometheus` est `UP` dans Prometheus.
- Grafana démarre avec Docker Compose.
- Grafana a une datasource Prometheus.
- Grafana affiche le dashboard météo.
- Les Dockerfiles DHI existent pour le backend et le frontend.
