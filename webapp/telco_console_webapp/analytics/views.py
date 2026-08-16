from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import AnalyticsSnapshot


@api_view(["GET"])
def analytics_bundle(request):
    """Everything the Business Analysis page needs, in one call."""
    keys = [
        "kpis", "by_region", "by_handset", "by_offer", "by_statut",
        "by_statut_rgs90", "by_canal", "volume_mix", "arpu_distribution",
        "tenure_distribution",
    ]
    payload = {
        s.key: s.payload
        for s in AnalyticsSnapshot.objects.filter(key__in=keys)
    }
    return Response(payload)
