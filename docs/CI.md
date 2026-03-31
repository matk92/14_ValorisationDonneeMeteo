# CI/CD — GitHub Actions

## Workflow

Le fichier [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) s’exécute sur **chaque push** et **chaque pull request** (toutes branches). Il comporte deux jobs parallèles : **backend** (Django) et **frontend** (Nuxt).

Ordre des étapes par job (aligné sur la consigne « install → tests → linter → sécurité → Docker ») :

1. Installation des dépendances (`uv sync --extra dev` / `npm install`)
2. Tests avec rapports JUnit (et couverture XML côté backend)
3. Lint (Ruff / ESLint)
4. Analyse de sécurité : Bandit + pip-audit (backend), `npm audit` (frontend)
5. Build et **push d’images Docker** vers **GitHub Container Registry (GHCR)** — **uniquement** lors d’un **push sur `main`**

Les images sont taguées `latest` et par SHA du commit (`ghcr.io/<org>/<repo>/backend` et `/frontend`).

## Rapports d’artefacts

Chaque run produit des artefacts téléchargeables (onglet **Actions** → run → **Artifacts**) :

| Artefact              | Contenu principal                                      |
| --------------------- | ------------------------------------------------------ |
| `backend-ci-reports`  | `junit.xml`, `coverage.xml`, `bandit.json`, `pip-audit.json` |
| `frontend-ci-reports` | `junit.xml`, `npm-audit.json`                          |

Les répertoires `reports/` sont ignorés par Git (voir `.gitignore`).

## Lien avec le cours (DevOps / DevSecOps)

- **Feedback rapide** (*Three Ways* — boucle de feedback) : la CI exécute tests et contrôles à chaque changement, ce qui réduit le coût de correction par rapport à une détection tardive.
- **Qualité et sécurité en amont** (*shift-left*) : lint, tests, analyse de dépendances (SCA) et analyse statique (SAST Bandit) avant la construction des images.
- **Traçabilité** : les rapports JUnit et JSON conservent une preuve des résultats pour le rendu ou l’audit.

## Badge

Le badge dans le [README](../README.md) pointe vers le workflow CI du dépôt. Si vous travaillez sur un **fork**, remplacez l’URL `github.com/<propriétaire>/<repo>` dans le badge par celui de votre fork pour afficher le bon statut.

## Vérifier que la CI détecte une régression (exercice)

1. Créer une branche depuis `main`.
2. Modifier volontairement un test pour qu’il échoue (assertion incorrecte ou logique cassée).
3. Pousser la branche et ouvrir une PR (ou observer le workflow sur le push) : le job concerné doit **échouer** à l’étape des tests.
4. Corriger le test, pousser à nouveau : le workflow doit **réussir**.

Conserver un lien ou une capture d’écran du run GitHub pour la remise du cours.
