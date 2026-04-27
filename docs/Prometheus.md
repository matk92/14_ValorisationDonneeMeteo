# Prometheus et Grafana en local

Cette partie correspond au livrable monitoring du cours : une architecture pull avec Prometheus, un endpoint `/metrics` exposé par Django, puis un dashboard Grafana branché sur Prometheus.

## Stack utilisée

La stack s’appuie sur `[../docker-compose.dev.yml](../docker-compose.dev.yml)` avec :

- `timescaledb` : base PostgreSQL/TimescaleDB utilisée par le backend ;
- `backend` : API Django ;
- `prometheus` : collecte des métriques ;
- `grafana` : visualisation des métriques.

Le backend expose ses métriques sur `/metrics` via `django-prometheus`.

## Lancer la stack monitoring

Depuis la racine du projet :

```bash
docker compose -f docker-compose.dev.yml up --build -d timescaledb backend prometheus grafana
```

Pour arrêter :

```bash
docker compose -f docker-compose.dev.yml down
```

## Prometheus

Prometheus est disponible sur [http://localhost:9090](http://localhost:9090).

Pages utiles :

- `http://localhost:9090/graph` : exécution de requêtes PromQL ;
- `http://localhost:9090/targets` : état des targets scrapées.

La configuration se trouve dans `[../prometheus/prometheus.yml](../prometheus/prometheus.yml)`. Elle scrape :

- `localhost:9090` pour Prometheus lui-même ;
- `backend:8000` pour Django, avec le chemin `/metrics`.

Si les deux targets `prometheus` et `django` sont en état `UP`, la collecte fonctionne.

## Requêtes PromQL utiles

```text
up
up{job="django"}
django_http_requests_total_by_method_total
django_http_responses_total_by_status_total
rate(django_http_requests_total_by_method_total[1m])
scrape_duration_seconds{job="django"}
```

## Grafana

Grafana est disponible sur [http://localhost:3001](http://localhost:3001).

Identifiants locaux :

- utilisateur : `admin`
- mot de passe : `admin`

La datasource Prometheus est provisionnée automatiquement par `[../grafana/provisioning/datasources/prometheus.yml](../grafana/provisioning/datasources/prometheus.yml)`. Elle pointe vers `http://prometheus:9090`, c’est-à-dire le nom du service Prometheus dans le réseau Docker Compose.

Le dashboard est provisionné automatiquement depuis `[../grafana/dashboards/meteo-observability.json](../grafana/dashboards/meteo-observability.json)`. Il contient notamment :

- l’état du backend Django ;
- l’état de Prometheus ;
- le taux de requêtes Django par méthode ;
- les réponses Django par statut HTTP ;
- la durée de scrape du backend.

Si les graphiques Django sont vides au début, il suffit d’appeler quelques endpoints de l’API pour générer du trafic, puis d’attendre un ou deux cycles de scrape.

## Logs vs métriques

Prometheus et Grafana ne remplacent pas les logs applicatifs. Ils servent à observer des métriques dans le temps.

Pour les logs texte du backend :

```bash
docker compose -f docker-compose.dev.yml logs -f backend
```

Pour les métriques Django :

```text
http://localhost:8000/metrics
```

ou directement depuis Prometheus avec les requêtes `django_*`.

## Lien avec le cours

Cette architecture suit le modèle pull metrics : Prometheus interroge régulièrement les endpoints `/metrics`, stocke les séries temporelles, puis Grafana les affiche dans un dashboard. Cela donne un feedback rapide sur la disponibilité et le comportement de l’application, sans modifier la logique métier du backend.