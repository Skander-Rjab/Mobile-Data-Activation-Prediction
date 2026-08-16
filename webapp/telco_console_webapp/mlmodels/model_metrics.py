"""
Static metrics captured from the two training notebooks (real values from
the executed runs, not placeholders). Kept as plain Python so the Models
page has zero runtime computation cost.
"""

MODEL_COMPARISON = {
    "model1": {
        "key": "model1",
        "name": "Model 1 \u2014 Tweedie LightGBM",
        "subtitle": "Single-stage gradient boosting regressor, Tweedie loss",
        "algorithm_family": "Gradient boosting (LightGBM)",
        "metrics": {
            "rmse": 24.39,
            "rmse_excl_top1pct": 6.83,
            "mae": 3.75,
            "r2": 0.150,
        },
        "strengths": [
            "Single model, single deployment artifact",
            "Tightest error on typical, everyday predictions",
            "Naturally respects the zero-inflated distribution via Tweedie loss",
        ],
        "weaknesses": [
            "No standalone activation-probability output",
            "Underperforms on rare, extreme spend spikes",
        ],
    },
    "model2": {
        "key": "model2",
        "name": "Model 2 \u2014 Hurdle (Random Forest \u00d7 2)",
        "subtitle": "Classifier (will they activate?) + regressor (how much?), combined",
        "algorithm_family": "Bagging (Random Forest), two stages",
        "metrics": {
            "rmse": 20.91,
            "rmse_excl_top1pct": 8.34,
            "mae": 4.80,
            "r2": 0.228,
        },
        "classifier_metrics": {
            "auc": 0.867,
            "f1": 0.672,
            "precision": 0.592,
            "recall": 0.778,
        },
        "strengths": [
            "Best overall R\u00b2 \u2014 explains the most variance including higher-value customers",
            "Produces a standalone activation probability, directly usable for targeting",
            "Each stage specializes on an easier sub-problem",
        ],
        "weaknesses": [
            "Two deployment artifacts instead of one",
            "Slightly higher MAE on typical, everyday predictions",
        ],
    },
    "baselines": {
        "predict_mean": {"rmse": 26.45},
        "carry_forward_current_month": {"rmse": 16.10, "mae": 3.91},
    },
}
