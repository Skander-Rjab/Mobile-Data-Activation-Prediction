from rest_framework import serializers

from .models import Customer


class CustomerListSerializer(serializers.ModelSerializer):
    """Lightweight shape for the Data Explorer table."""

    class Meta:
        model = Customer
        fields = [
            "id", "code_contrat", "statut", "region", "handset", "offre",
            "canal_de_vente", "anc_m", "arpu", "mnt_forfait_data",
            "is_data_user_now", "target_next_month", "will_activate",
        ]


class CustomerDetailSerializer(serializers.ModelSerializer):
    """Full shape, including the raw feature vector, for the detail/predict view."""

    class Meta:
        model = Customer
        fields = "__all__"
