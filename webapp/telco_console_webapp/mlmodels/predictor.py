"""
predictor.py
------------
Loads the two trained pipelines once (module-level singletons) and exposes
a single `predict(features_dict)` function used by both the REST API and
any server-rendered views.

Both models consume the exact same feature dict shape produced by
`data_prep.build_pipeline_features` / stored on `Customer.features`, so
there is no feature drift between what trained the models and what feeds
them at inference time.
"""

from functools import lru_cache

import joblib
import numpy as np
import pandas as pd
from django.conf import settings

from . import data_prep


@lru_cache(maxsize=1)
def _load_model1():
    return joblib.load(settings.MODEL1_PATH)


@lru_cache(maxsize=1)
def _load_model2_classifier():
    return joblib.load(settings.MODEL2_CLASSIFIER_PATH)


@lru_cache(maxsize=1)
def _load_model2_regressor():
    return joblib.load(settings.MODEL2_REGRESSOR_PATH)


def _feature_row(features: dict) -> pd.DataFrame:
    """Build a single-row DataFrame in the shape the pipelines expect."""
    return pd.DataFrame([features])


def predict(features: dict) -> dict:
    """
    Runs both models on one feature dict and returns a structured result
    ready to serialize straight to JSON for the frontend.
    """
    row = _feature_row(features)

    model1 = _load_model1()
    m1_pred = float(np.clip(model1.predict(row)[0], 0, None))

    clf = _load_model2_classifier()
    reg = _load_model2_regressor()
    proba = float(clf.predict_proba(row)[0, 1])
    amount_if_active = float(np.clip(reg.predict(row)[0], 0, None))
    m2_expected = proba * amount_if_active

    return {
        "model1_tweedie": {
            "label": "Tweedie LightGBM",
            "predicted_amount": round(m1_pred, 2),
        },
        "model2_hurdle": {
            "label": "Hurdle (Random Forest)",
            "activation_probability": round(proba, 4),
            "predicted_amount_if_active": round(amount_if_active, 2),
            "expected_amount": round(m2_expected, 2),
        },
        "consensus": {
            "average_expected_amount": round((m1_pred + m2_expected) / 2, 2),
            "likely_to_activate": proba >= 0.5,
        },
    }


def feature_importance(top_n: int = 12) -> dict:
    """Extracts feature importances from all three trained model stages."""

    def _top(pipe, n):
        names = pipe.named_steps["prep"].get_feature_names_out()
        importances = pipe.named_steps["model"].feature_importances_
        s = pd.Series(importances, index=names).sort_values(ascending=False).head(n)
        return [{"feature": _clean_name(k), "importance": float(v)} for k, v in s.items()]

    return {
        "model1_tweedie": _top(_load_model1(), top_n),
        "model2_classifier": _top(_load_model2_classifier(), top_n),
        "model2_regressor": _top(_load_model2_regressor(), top_n),
    }


def _clean_name(raw_name: str) -> str:
    """'num__ARPU' -> 'ARPU', 'cat__REGION_Tunis' -> 'REGION: Tunis'"""
    name = raw_name.split("__", 1)[-1]
    if raw_name.startswith("cat__") and "_" in name:
        for cat_col in data_prep.CATEGORICAL_COLS:
            if name.startswith(cat_col + "_"):
                return f"{cat_col}: {name[len(cat_col) + 1:]}"
    return name
