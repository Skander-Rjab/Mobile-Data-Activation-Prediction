import django_filters

from .models import Customer


class CustomerFilter(django_filters.FilterSet):
    min_arpu = django_filters.NumberFilter(field_name="arpu", lookup_expr="gte")
    max_arpu = django_filters.NumberFilter(field_name="arpu", lookup_expr="lte")
    search = django_filters.CharFilter(field_name="code_contrat", lookup_expr="icontains")

    class Meta:
        model = Customer
        fields = {
            "region": ["exact"],
            "handset": ["exact"],
            "statut": ["exact"],
            "offre": ["exact"],
            "will_activate": ["exact"],
            "is_data_user_now": ["exact"],
        }
