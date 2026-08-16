from rest_framework.decorators import api_view
from rest_framework.response import Response

from analytics.models import AnalyticsSnapshot
from . import predictor
from .model_metrics import MODEL_COMPARISON


def _snapshot(key, default=None):
    try:
        return AnalyticsSnapshot.objects.get(key=key).payload
    except AnalyticsSnapshot.DoesNotExist:
        return default


@api_view(["GET"])
def model_comparison(request):
    payload = dict(MODEL_COMPARISON)
    payload["feature_importance"] = _snapshot("feature_importance", {})
    return Response(payload)


@api_view(["GET"])
def prediction_form_schema(request):
    """
    Full schema for every model feature (for reference/debugging), plus a
    curated shortlist of the most impactful, human-legible features that
    the 'Build a customer' interactive form actually exposes as controls.
    """
    schema = _snapshot("feature_schema", [])
    defaults = _snapshot("feature_defaults", {})

    curated_names = [
        "ARPU", "MNT_FORFAIT_DATA", "NB_FORFAIT_DATA", "ANC_M",
        "HANDSET", "REGION", "STATUT", "is_data_user_now",
        "Evaporation", "VOLUME_4G", "data_share_of_forfait", "P_FF_Data",
    ]
    by_name = {f["name"]: f for f in schema}
    curated = [by_name[n] for n in curated_names if n in by_name]

    return Response({
        "curated_fields": curated,
        "full_schema": schema,
        "defaults": defaults,
    })


@api_view(["POST"])
def predict_manual(request):
    """
    Accepts a partial feature dict (just the curated fields the form
    exposes) and merges it onto the population median/mode defaults for
    every other feature before running both trained pipelines.
    """
    defaults = _snapshot("feature_defaults", {})
    if not defaults:
        return Response({"detail": "Analytics snapshot not built yet."}, status=503)

    overrides = request.data or {}
    features = dict(defaults)
    for k, v in overrides.items():
        if k in features:
            features[k] = v

    # is_data_user_now / has_smartphone are booleans upstream but stored as
    # 0/1 ints in the training data -- normalize whatever the frontend sends.
    for bool_field in ("is_data_user_now", "has_smartphone"):
        if bool_field in features:
            features[bool_field] = int(bool(features[bool_field]))

    result = predictor.predict(features)
    result["features_used"] = features
    return Response(result)
