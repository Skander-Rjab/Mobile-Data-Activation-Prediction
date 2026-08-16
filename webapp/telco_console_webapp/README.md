# Telco Console — Data Activation Forecasting Web App

A full Django application showcasing the MNT_FORFAIT_DATA_next_month project end to end:
the raw customer data, the business analysis, a Power BI report slot, both trained ML
models, and live interactive predictions — with a TypeScript/React frontend on top.

Live-tested: every page and every API endpoint below was verified against the real,
running app (Django test client + curl) before delivery, not just written and assumed
to work.

## What's actually running under the hood

- **Data**: all 30,000 customers from `CIBLE_STAGE_JUN_2026_LV.csv`, cleaned and
  feature-engineered by the same `data_prep.py` pipeline from the modeling notebooks,
  loaded into a real SQLite table (`Customer`).
- **Models**: the two pipelines trained in the notebooks (`model1_tweedie_lgbm.joblib`,
  `model2_hurdle_classifier.joblib` + `model2_hurdle_regressor.joblib`), loaded once and
  reused for every prediction — nothing is retrained or mocked at request time.
- **Predictions are live**: the Predict page and every "re-run prediction" button call
  the real `.predict()` / `.predict_proba()` methods on the real saved pipelines.
- **Business analysis is precomputed** into an `AnalyticsSnapshot` table (via
  `manage.py build_analytics`) so pages load instantly instead of aggregating 30,000
  rows on every request.

## Architecture

```
webapp/
├── telco_console/         # Django project settings/urls
├── core/                  # Page views + templates (the 6 routed pages)
├── customers/              # Customer model, data loader, customer API
├── analytics/              # AnalyticsSnapshot model, aggregation command, analytics API
├── reports/                 # Power BI embed config + native-fallback API
├── mlmodels/                 # data_prep.py, predictor.py, model_metrics.py, prediction API
├── templates/core/          # Django templates (nav shell + per-page island mount points)
├── static/
│   ├── css/                 # Design system (main.css) + page styles (pages.css)
│   └── js/bundle.js          # Compiled TypeScript/React bundle (esbuild output)
├── frontend_src/             # TypeScript/React source (compiles to static/js/bundle.js)
│   └── src/
│       ├── lib/               # API client + shared types
│       ├── components/         # SignalMark, StatCard, Recharts wrappers
│       └── pages/               # One component per routed page
├── data/                     # Raw CSV (same file used by the notebooks)
├── ml_artifacts/               # The three trained .joblib pipelines
└── db.sqlite3                  # Pre-loaded: 30,000 customers + analytics snapshots
```

**Design pattern**: Django renders each page's HTML shell (nav, header, `<div id="island-…">`
mount points) server-side; a single React bundle mounts one "island" component per page
based on which div is present. This keeps routing, SEO-friendly page loads, and templating
in Django's hands, while the interactive pieces (live filtering, live predictions, charts)
are genuinely rich TypeScript/React — not a full client-side SPA rewrite of Django's job.

## Pages

| Route | What it shows |
|---|---|
| `/` | Hero with live KPIs + an ambient activation-rate chart, then feature cards into the rest of the app |
| `/data/` | Filterable, searchable, sortable, paginated table over all 30,000 customers, with a full-profile drawer |
| `/analysis/` | Business-analysis dashboard: activation rate by device/region/ARPU tier/tenure/offer/traffic-status |
| `/reports/` | Two-page Power BI showcase — embeds a real report if configured, otherwise a native fallback dashboard from the same data |
| `/models/` | Side-by-side Model 1 vs. Model 2 comparison: metrics, classifier stats, feature importance |
| `/predict/` | Interactive "build a customer" form with live dual-model predictions; supports loading a real customer by ID or a random one |

## Running it

```bash
cd webapp
pip install -r requirements.txt

# Database already ships pre-loaded (db.sqlite3 included). To rebuild from scratch instead:
python manage.py migrate
python manage.py load_dataset      # cleans data/CIBLE_STAGE_JUN_2026_LV.csv -> Customer table
python manage.py build_analytics   # precomputes AnalyticsSnapshot rows + feature importance

python manage.py runserver
# -> http://localhost:8000/
```

To modify the frontend:

```bash
cd frontend_src
npm install
npm run build   # one-off build -> ../static/js/bundle.js
npm run watch    # rebuilds on file save, for active development
```

## Power BI report

`/reports/` embeds the real report directly:

```python
POWERBI_EMBED_URL = "https://app.powerbi.com/reportEmbed?reportId=...&autoAuth=true&ctid=..."
```

This is a **secure embed** (`autoAuth=true` + tenant ID `ctid`), not a public "Publish to
web" link — viewers need to be signed into a Power BI account with access to this report;
otherwise the iframe shows a Microsoft sign-in prompt rather than the report. Since the
report has 2 pages, Power BI renders its own page-tab navigation *inside* the iframe — no
custom tab-switcher was needed on the Django side for that.

Below the embed, the page always shows a native dashboard built from the same live
aggregates — no Power BI sign-in required, useful for visitors who don't have report access
or when the embed is temporarily unavailable.

If you'd rather make it publicly viewable with no sign-in, regenerate the link via Power
BI's **"Publish to web"** option instead (produces an `https://app.powerbi.com/view?r=...`
URL) and swap it into the same setting — the `<iframe>` doesn't care which kind of link it
is.

## Design system

Grounded in the subject matter — a telecom "network console" rather than a generic admin
dashboard: deep navy backdrop, two deliberate accents (signal-cyan for usage/data, amber
for revenue), Space Grotesk for display type, Inter for body, JetBrains Mono for data
readouts. The recurring signature motif is the **signal-bars glyph** (literal phone signal
bars) used as the brand mark, the "live" pulse indicator, and section eyebrows — since the
whole product is about mobile data signal and usage. Tokens live at the top of
`static/css/main.css`.

## API reference

All endpoints return JSON.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/customers/` | GET | Paginated, filterable, searchable, sortable customer list |
| `/api/customers/facets/` | GET | Distinct filter option lists (regions, handsets, statuts, offers) |
| `/api/customers/random/` | GET | One random customer (full detail) |
| `/api/customers/<code_contrat>/` | GET | Full customer detail, including raw feature vector |
| `/api/customers/<code_contrat>/predict/` | POST | Re-run both live models against a real stored customer |
| `/api/analytics/bundle/` | GET | All precomputed business-analysis aggregates in one call |
| `/api/reports/config/` | GET | Power BI embed URLs (if set) + native-fallback data |
| `/api/models/comparison/` | GET | Both models' metrics, strengths/weaknesses, feature importance |
| `/api/models/form-schema/` | GET | Curated + full feature schema and population defaults, for the Predict form |
| `/api/models/predict/` | POST | Manual prediction: partial feature overrides merged onto population defaults |

## Known limitations / next steps

- **Dev server only** — `manage.py runserver` is not production-grade. For real deployment,
  put this behind Gunicorn/uWSGI + nginx (or similar), set `DEBUG = False`, and restrict
  `ALLOWED_HOSTS` (currently `['*']` for convenience in this showcase build).
- **No authentication** — every page and API endpoint is open. Add Django auth /
  `IsAuthenticated` DRF permissions before exposing this beyond a demo.
- **SQLite** — fine for 30,000 rows and a showcase; move to Postgres for concurrent
  production traffic.
- **Power BI secure embed requires org sign-in** — anyone without a Power BI account that
  has access to the report will see a Microsoft sign-in prompt inside the iframe instead
  of the report itself. Switch to a "Publish to web" link (see above) if the report should
  be publicly viewable with no sign-in.
