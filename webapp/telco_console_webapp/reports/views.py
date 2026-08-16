from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from analytics.models import AnalyticsSnapshot


def _snapshot(key, default=None):
    try:
        return AnalyticsSnapshot.objects.get(key=key).payload
    except AnalyticsSnapshot.DoesNotExist:
        return default


@api_view(["GET"])
def report_config(request):
    """
    The real Power BI embed URL (whole report, Power BI renders its own
    page tabs for the 2 pages inside the iframe), plus the same aggregates
    rendered natively as an always-available companion view -- useful for
    visitors who aren't signed into a Power BI account with report access.
    """
    return Response({
        "embed_url": settings.POWERBI_EMBED_URL,
        "title": "Customer Usage & Data Activation Report",
        "native": {
            "kpis": _snapshot("kpis", {}),
            "by_handset": _snapshot("by_handset", []),
            "arpu_distribution": _snapshot("arpu_distribution", []),
            "volume_mix": _snapshot("volume_mix", {}),
            "by_region": _snapshot("by_region", []),
            "by_offer": _snapshot("by_offer", []),
            "by_statut_rgs90": _snapshot("by_statut_rgs90", []),
            "tenure_distribution": _snapshot("tenure_distribution", []),
        },
    })
