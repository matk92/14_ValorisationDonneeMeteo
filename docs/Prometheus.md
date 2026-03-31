# Prometheus en local

## Stack utilisée

La stack de monitoring s’appuie sur le fichier [`docker-compose.dev.yml`](../docker-compose.dev.yml) avec :

- `timescaledb`
- `backend`
- `prometheus`

Le backend expose désormais les métriques Django sur `/metrics` via `django-prometheus`.

## Lancer Prometheus

Commande minimale validée :

```bash
docker compose -f docker-compose.dev.yml up --build -d timescaledb backend prometheus
```

Commande pour arrêter la stack :

```bash
docker compose -f docker-compose.dev.yml down
```

## UI Prometheus

- URL : [http://localhost:9090](http://localhost:9090)
- Page principale : `http://localhost:9090/graph`
- Targets : `Status` → `Targets`

Le fichier de configuration est [`prometheus/prometheus.yml`](../prometheus/prometheus.yml) et scrape :

- `localhost:9090` pour Prometheus lui-même
- `backend:8000` pour Django, avec le `metrics_path` par défaut `/metrics`

## Vérifications réalisées

La stack a été démarrée et les checks suivants sont passés :

- UI Prometheus répond sur `http://localhost:9090/graph`
- Target `django` en état `UP`
- Requête PromQL `up` retourne `1` pour `job="django"` et `job="prometheus"`

## Requêtes PromQL utiles

```text
up
django_http_requests_total_by_method_total
django_http_responses_total_by_status_total
rate(django_http_requests_total_by_method_total[1m])
```

## Lien avec le cours

Cette architecture suit le modèle **pull metrics** de Prometheus : le serveur Prometheus interroge périodiquement `/metrics` sur le backend. Cela répond au besoin d’**observabilité** et de **feedback rapide** vu en cours, avec une instrumentation simple en environnement de développement.
