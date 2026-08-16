# MNT_FORFAIT_DATA_next_month prediction

Predicts how much mobile data package (TND) a customer will activate next month, using this month's usage/revenue/behavior data (30,000 customers, one snapshot per customer).

## Project layout

```
project/
├── data/
│   └── CIBLE_STAGE_JUN_2026_LV.csv     # raw export (30,000 rows x 66 columns, ';'-separated)
├── src/
│   └── data_prep.py                     # shared cleaning + feature engineering (used by both
│                                         # notebooks AND meant to be reused at inference time
│                                         # in the Django app, so training and production always
│                                         # transform features identically)
├── notebooks/
│   ├── 01_model_tweedie_lightgbm.ipynb  # Model 1: single-stage Tweedie-loss LightGBM regressor
│   └── 02_model_hurdle_rf.ipynb         # Model 2: two-stage hurdle (RF classifier + RF regressor)
└── models/                              # trained pipelines, saved by the notebooks
    ├── model1_tweedie_lgbm.joblib
    ├── model2_hurdle_classifier.joblib
    └── model2_hurdle_regressor.joblib
```

## Why two different models

The target is heavily zero-inflated: **72.8% of customers activate 0 TND of data next month**, and the remaining ~27% follow a long right-skewed tail (up to ~1,545 TND). That shape ruled out a plain off-the-shelf regressor and drove two purpose-fit approaches instead of two arbitrary algorithm choices:

| | Model 1 — Tweedie LightGBM | Model 2 — Hurdle (RF classifier + RF regressor) |
|---|---|---|
| Structure | Single model, Tweedie loss (built for zero-inflated, semi-continuous targets) | Two stages: `P(activates)` then `amount \| activates`, combined as `P × amount` |
| Test RMSE | 24.39 (**6.83** excluding top 1% outliers) | 20.91 (8.34 excluding top 1% outliers) |
| Test MAE | **3.75** | 4.80 |
| Test R² | 0.15 | **0.23** |
| Extra business output | — | Standalone **activation probability** per customer, usable for targeting/ranking on its own |
| Deployment artifact(s) | 1 file | 2 files |

**Bottom line:** Model 1 is tighter on everyday, typical predictions and simpler to deploy; Model 2 explains more overall variance and is the better fit if the product needs to act on "who is likely to activate" rather than just a blended expected amount. Both are trained, evaluated, and saved — nothing here blocks shipping either one (or exposing both).

## How to reproduce

```bash
pip install pandas numpy scikit-learn lightgbm matplotlib seaborn joblib jupyter
cd notebooks
jupyter nbconvert --to notebook --execute --inplace 01_model_tweedie_lightgbm.ipynb
jupyter nbconvert --to notebook --execute --inplace 02_model_hurdle_rf.ipynb
```

## Data quality findings baked into `src/data_prep.py`

Confirmed on the full 30,000-row export before writing any cleaning code (see Notebook 1, section 2, for the checks):

- `RATIO` is constant (=3) for every row → dropped, zero information.
- `ANC_J` correlates 0.9999 with `ANC_M` → dropped, same info as `ANC_M`.
- `VOLUME_SESSION` exactly equals `VOLUME_4G + VOLUME_3G + VOLUME_2G` → dropped.
- `volume_session_c` is an exact duplicate of `VOLUME_SESSION` → dropped.
- `FLAG_HANDSET_DATA` is 100% redundant with `HANDSET` (2G→0, 3G/4G→1) → dropped.
- Blank cells in `P_NB_FF_*` / `P_Mnt_FF_*` (≈50% of rows) mean "no forfait that period," not missing data → cleaned to `0`.
- `OFFRE` has 44 distinct values with a long rare tail → categories under 150 occurrences grouped into `"Other"`.

Derived features: `is_data_user_now`, `data_share_of_forfait`, `data_share_of_volume`, `has_smartphone`, `recharge_intensity` — see Notebook 1, section 4, for definitions and rationale.

## Next steps (not yet built)

1. **Django integration** — wrap `models/*.joblib` behind a prediction endpoint/view, reusing `src/data_prep.py` for feature transformation so training and production features never drift apart.
2. **PowerBI report embed** — the existing 2-page report can be embedded in the Django templates (e.g. via Power BI Embedded / publish-to-web, depending on your licensing) alongside the model outputs.
