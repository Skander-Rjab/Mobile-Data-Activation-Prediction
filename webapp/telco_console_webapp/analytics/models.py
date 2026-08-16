from django.db import models


class AnalyticsSnapshot(models.Model):
    """
    Singleton-ish table: each row is a named, precomputed JSON blob of
    business-analysis aggregates, built by `manage.py build_analytics`.
    Keeping this as data (not template Python) means the Business
    Analysis page loads instantly with no live aggregation cost, and the
    same JSON can be reused by the Reports page's native fallback charts.
    """

    key = models.CharField(max_length=64, unique=True)
    payload = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key
