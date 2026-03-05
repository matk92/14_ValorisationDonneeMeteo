# Audit Système — Plan d'Action

> Audit réalisé le 5 mars 2026 sur le projet ValorisationDonneeMeteo

---

## Résumé

Le projet a de bonnes bases (linting, ORM sécurisé, factories, CI pre-commit) mais présente des lacunes critiques en **monitoring** (inexistant), **sécurité production** (pas de HTTPS, containers root, pas de rate limiting), **tests** (0 tests frontend, pas de CI), et **documentation** (partielle).

---

## 1. Code Quality

### ✅ Ce qui existe

- **Ruff** configuré (lint + format) avec règles E, W, F, I, B, C4, UP, DJ — `backend/pyproject.toml`
- **ESLint + Prettier** frontend — `frontend/eslint.config.mjs`
- **Pre-commit hooks** racine + backend (ruff, ruff-format, nbstripout, check-merge-conflict…)
- **isort** intégré via Ruff (rule I)
- **.editorconfig** (UTF-8, LF, 4 espaces)
- **Lock files** (uv.lock, package-lock.json)
- **CI pre-commit** : `.github/workflows/pre-commit.yaml`

### ❌ Ce qui manque

| Manque                                 | Impact                           | Priorité  |
| -------------------------------------- | -------------------------------- | --------- |
| Type checking Python (mypy/pyright)    | Bugs runtime non détectés        | 🟡 Moyen  |
| Métriques de complexité (McCabe/radon) | Dette technique invisible        | 🟢 Faible |
| Dependabot / audit deps                | Vulnérabilités invisibles        | 🟡 Moyen  |
| Bandit (scanner sécurité Python)       | Failles de sécurité dans le code | 🟡 Moyen  |

### 🔧 Manuel vs Automatisé

| Tâche             | État                                     |
| ----------------- | ---------------------------------------- |
| Linting Python    | ✅ Automatisé (pre-commit + CI)          |
| Formatting Python | ✅ Automatisé (pre-commit + CI)          |
| Linting Frontend  | ✅ Automatisé (pre-commit via npm check) |
| Type checking     | ❌ Manuel (non configuré)                |
| Audit dépendances | ❌ Manuel (pas de Dependabot/safety)     |

### ⚠️ Points de défaillance

- Absence de type checking → bugs runtime non détectés
- Pas de vérification de vulnérabilités dans les dépendances
- Complexité du code non mesurée → dette technique invisible

---

## 2. Testing

### ✅ Ce qui existe

- **7 fichiers de test backend** (5 unit, 2 intégration) — `backend/weather/tests/`
- **pytest + pytest-django + pytest-cov** installés
- **Factories** : StationFactory, HoraireTempsReelFactory, QuotidienneFactory — `backend/weather/factories/`
- **conftest.py** avec fixtures spécialisées (itn_stations, seed_itn_day)
- **Vitest** configuré côté frontend (script `test:unit`)
- **@nuxt/test-utils, @vue/test-utils, @testing-library/vue** installés
- **Playwright** dans les devDependencies

### ❌ Ce qui manque

| Manque                                | Impact                                   | Priorité    |
| ------------------------------------- | ---------------------------------------- | ----------- |
| 0 fichier de test frontend            | Régressions silencieuses                 | 🟠 Élevé    |
| 0 test E2E (Playwright non configuré) | Workflows utilisateur non validés        | 🟡 Moyen    |
| Coverage non configuré                | Pas de visibilité sur la couverture      | 🟠 Élevé    |
| Tests NON exécutés en CI              | Merge de code cassé possible             | 🔴 Critique |
| Tests contrat API (vs openapi.yaml)   | API peut diverger de la spec             | 🟡 Moyen    |
| Tests de charge (k6/Locust)           | Pas de baseline de performance           | 🟢 Faible   |
| Tests modèles Django                  | Station, Horaire, Quotidienne non testés | 🟡 Moyen    |

### 🔧 Manuel vs Automatisé

| Tâche          | État                                         |
| -------------- | -------------------------------------------- |
| Tests backend  | ❌ Manuel (`uv run pytest` local uniquement) |
| Tests frontend | ❌ Inexistants                               |
| Tests E2E      | ❌ Inexistants                               |
| Coverage       | ❌ Non configuré                             |
| Tests en CI    | ❌ Non implémenté                            |

### ⚠️ Points de défaillance

- Régressions frontend silencieuses (0% couverture)
- Merge de code cassé possible (pas de gate CI)
- API peut diverger de la spec OpenAPI sans alerte
- Aucune baseline de performance

---

## 3. Deployment Process

### ✅ Ce qui existe

- **Dockerfiles** backend (python:3.12-slim) et frontend (node:24-alpine, multi-stage)
- **docker-compose.dev.yml** et **docker-compose.test.yml**
- **entrypoint.sh** : migrations + collectstatic + gunicorn
- **CI staging** : build → push GHCR → deploy via Tailscale SSH — `.github/workflows/staging.yml`
- **Nginx** reverse proxy — `nginx/nginx.conf`
- **Health checks Docker** pour TimescaleDB (pg_isready)

### ❌ Ce qui manque

| Manque                              | Impact                   | Priorité    |
| ----------------------------------- | ------------------------ | ----------- |
| docker-compose production dédié     | Pas de config prod       | 🟠 Élevé    |
| Containers tournent en root         | Escalade de privilèges   | 🔴 Critique |
| Backend Dockerfile pas multi-stage  | Image plus lourde        | 🟢 Faible   |
| HTTPS/TLS dans nginx                | Données en clair         | 🔴 Critique |
| Headers sécurité nginx (HSTS, CSP…) | Vulnérabilités web       | 🔴 Critique |
| Rate limiting nginx                 | Vulnérable au DoS        | 🟠 Élevé    |
| Tests avant déploiement             | Images cassées déployées | 🔴 Critique |
| Health check applicatif (/health)   | Redémarrage aveugle      | 🟠 Élevé    |
| Stratégie de rollback               | Pas de retour arrière    | 🟡 Moyen    |

### 🔧 Manuel vs Automatisé

| Tâche               | État                                |
| ------------------- | ----------------------------------- |
| Build images Docker | ✅ Automatisé (CI sur tag)          |
| Push sur GHCR       | ✅ Automatisé                       |
| Déploiement staging | ✅ Semi-auto (CI via Tailscale SSH) |
| Migrations DB       | ✅ Auto (entrypoint.sh)             |
| Tests avant deploy  | ❌ Non implémenté                   |
| Rollback            | ❌ Manuel (pas de stratégie)        |
| Déploiement prod    | ❌ Non défini                       |

### ⚠️ Points de défaillance

- Déploiement d'images cassées (pas de tests gate)
- Containers root → escalade de privilèges possible
- Pas de rollback automatisé
- HTTP uniquement → données en clair
- Pas de health check → redémarrage aveugle

---

## 4. Monitoring — ❌ Quasi-inexistant

### ✅ Ce qui existe

- **Health check Docker** pour TimescaleDB uniquement (pg_isready)
- **prometheus-client** dans uv.lock (dépendance indirecte, non configurée)

### ❌ Ce qui manque — TOUT est absent

| Manque                       | Impact                        | Priorité    |
| ---------------------------- | ----------------------------- | ----------- |
| Configuration LOGGING Django | Pas de logs applicatifs       | 🔴 Critique |
| Logging structuré (JSON)     | Logs inexploitables           | 🔴 Critique |
| Sentry (error tracking)      | Erreurs 500 silencieuses      | 🔴 Critique |
| Prometheus/Grafana           | Pas de métriques              | 🟠 Élevé    |
| Endpoint /health             | Pas de probe applicative      | 🔴 Critique |
| Métriques (latence, erreurs) | Dégradation invisible         | 🟠 Élevé    |
| Slow query logs              | Requêtes lentes non détectées | 🟡 Moyen    |
| Alerting                     | Pas de notification           | 🟠 Élevé    |

### 🔧 Manuel vs Automatisé

| Tâche                     | État                              |
| ------------------------- | --------------------------------- |
| Détection d'erreurs       | ❌ Manuel (lecture de logs bruts) |
| Métriques performance     | ❌ Inexistant                     |
| Alerting                  | ❌ Inexistant                     |
| Health checks applicatifs | ❌ Inexistant                     |

### ⚠️ Points de défaillance

- **Catégorie la plus critique** : impossible de détecter des pannes
- Dégradation de performance invisible
- Erreurs 500 silencieuses en production
- Pas de capacité de diagnostic post-incident

---

## 5. Security

### ✅ Ce qui existe

- **Django ORM** partout (protection SQL injection, pas de raw SQL)
- **CORS restrictif** — `backend/config/settings.py`
- **CSRF middleware** activé
- **XFrameOptions middleware** activé
- **SecurityMiddleware** en première position
- **SECRET_KEY** via variable d'environnement
- **.gitignore** correct (.env exclus, .env.example inclus)
- **API en lecture seule** (ReadOnlyModelViewSet)
- **Validation des entrées** via serializers DRF
- **GitHub Secrets** pour CI (Tailscale, GITHUB_TOKEN)
- **WhiteNoise** pour les fichiers statiques

### ❌ Ce qui manque

| Manque                                                    | Impact                      | Priorité    |
| --------------------------------------------------------- | --------------------------- | ----------- |
| `ALLOWED_HOSTS=*` dans .env.example racine                | Attaque Host header         | 🔴 Critique |
| Mot de passe par défaut `infoclimat2026` dans 5+ fichiers | Accès non autorisé          | 🔴 Critique |
| SECURE_SSL_REDIRECT                                       | Pas de redirection HTTPS    | 🔴 Critique |
| SESSION_COOKIE_SECURE / CSRF_COOKIE_SECURE                | Cookies non sécurisés       | 🔴 Critique |
| HSTS (SECURE_HSTS_SECONDS)                                | Pas de protection downgrade | 🟠 Élevé    |
| Content-Security-Policy                                   | Risque XSS                  | 🟠 Élevé    |
| Rate limiting / throttling                                | Vulnérable au DoS           | 🟠 Élevé    |
| Bandit / pip-audit                                        | Pas de scan sécurité code   | 🟡 Moyen    |
| Containers Docker en root                                 | Escalade de privilèges      | 🔴 Critique |
| Django Admin sans restriction IP                          | Cible brute force           | 🟡 Moyen    |
| CSRF_TRUSTED_ORIGINS pour production                      | CSRF en prod HTTPS          | 🟠 Élevé    |

### 🔧 Manuel vs Automatisé

| Tâche                       | État              |
| --------------------------- | ----------------- |
| Scan de vulnérabilités code | ❌ Non implémenté |
| Scan de dépendances         | ❌ Non implémenté |
| Rotation des secrets        | ❌ Manuel         |
| Audit de sécurité           | ❌ Manuel         |

### ⚠️ Points de défaillance

- `ALLOWED_HOSTS=*` est le risque #1
- Credentials par défaut = accès non autorisé si inchangés en prod
- Pas de HTTPS = interception de données possible
- Pas de rate limiting = vulnérable au DoS
- Admin exposé = cible d'attaque brute force
- Pas de CSP = risque XSS

---

## 6. Documentation

### ✅ Ce qui existe

- **backend/README.md** complet : installation, commandes, structure, API, variables d'env, TimescaleDB
- **Spec OpenAPI** — `backend/openapi/target-specs/openapi.yaml`
- **Swagger UI + ReDoc** auto-générés (`/api/docs/`, `/api/redoc/`)
- **timescaledb-env/README.md**

### ❌ Ce qui manque

| Manque                                         | Impact                      | Priorité  |
| ---------------------------------------------- | --------------------------- | --------- |
| Documentation d'architecture (diagrammes, ADR) | Vision technique absente    | 🟡 Moyen  |
| CONTRIBUTING.md                                | Onboarding difficile        | 🟡 Moyen  |
| CHANGELOG                                      | Pas de traçabilité          | 🟡 Moyen  |
| Doc déploiement production                     | Procédure absente           | 🟠 Élevé  |
| Runbook opérationnel                           | Pas de procédure d'incident | 🟠 Élevé  |
| frontend/README.md détaillé                    | Template Nuxt par défaut    | 🟢 Faible |
| Doc pipeline CI/CD                             | Non documenté               | 🟢 Faible |

### 🔧 Manuel vs Automatisé

| Tâche                   | État            |
| ----------------------- | --------------- |
| Doc API (Swagger/ReDoc) | ✅ Auto-générée |
| Schema OpenAPI          | ✅ Auto-généré  |
| README maintenance      | ❌ Manuel       |
| Changelog               | ❌ Inexistant   |
| Doc architecture        | ❌ Inexistant   |

### ⚠️ Points de défaillance

- Nouveau développeur bloqué sans guide de contribution
- Pas de procédure d'incident documentée
- Frontend sous-documenté
- Pas de traçabilité des changements (changelog)

---

## Matrice de Priorités

### 🔴 Critique — À traiter immédiatement

| #   | Action                                                     | Catégorie              | Effort |
| --- | ---------------------------------------------------------- | ---------------------- | ------ |
| 1   | Ajouter logging Django + Sentry + endpoint `/health`       | Monitoring             | Moyen  |
| 2   | Corriger `ALLOWED_HOSTS=*` dans .env.example               | Sécurité               | Faible |
| 3   | Ajouter HTTPS + headers sécurité dans nginx                | Sécurité + Déploiement | Moyen  |
| 4   | Configurer `SECURE_*` settings Django (SSL, HSTS, cookies) | Sécurité               | Faible |
| 5   | Containers non-root dans les Dockerfiles                   | Sécurité + Déploiement | Faible |
| 6   | Ajouter workflow CI pour pytest (gate avant merge)         | Testing                | Faible |

### 🟠 Élevé — Prochaine itération

| #   | Action                                         | Catégorie         | Effort |
| --- | ---------------------------------------------- | ----------------- | ------ |
| 7   | Ajouter rate limiting (DRF throttling + nginx) | Sécurité          | Faible |
| 8   | Écrire les tests frontend (infra déjà prête)   | Testing           | Élevé  |
| 9   | Configurer coverage + seuil minimum            | Testing           | Faible |
| 10  | docker-compose production + doc déploiement    | Déploiement + Doc | Moyen  |
| 11  | Tests gate avant déploiement staging           | Déploiement       | Faible |
| 12  | Prometheus + métriques applicatives            | Monitoring        | Moyen  |
| 13  | Runbook opérationnel                           | Documentation     | Moyen  |

### 🟡 Moyen — Planifier

| #   | Action                                  | Catégorie     | Effort |
| --- | --------------------------------------- | ------------- | ------ |
| 14  | Ajouter mypy + config stricte           | Code Quality  | Moyen  |
| 15  | Configurer Dependabot                   | Code Quality  | Faible |
| 16  | Tests contrat API (vs openapi.yaml)     | Testing       | Moyen  |
| 17  | Restreindre Django Admin (IP whitelist) | Sécurité      | Faible |
| 18  | CONTRIBUTING.md + CHANGELOG             | Documentation | Faible |
| 19  | Architecture Decision Records (ADR)     | Documentation | Moyen  |
| 20  | Ajouter Bandit au pre-commit            | Code Quality  | Faible |

### 🟢 Faible — Nice to have

| #   | Action                                 | Catégorie     | Effort |
| --- | -------------------------------------- | ------------- | ------ |
| 21  | Métriques de complexité (McCabe/radon) | Code Quality  | Faible |
| 22  | Tests E2E avec Playwright              | Testing       | Élevé  |
| 23  | Tests de charge (k6/Locust)            | Testing       | Moyen  |
| 24  | Backend Dockerfile multi-stage         | Déploiement   | Faible |
| 25  | Doc pipeline CI/CD                     | Documentation | Faible |
