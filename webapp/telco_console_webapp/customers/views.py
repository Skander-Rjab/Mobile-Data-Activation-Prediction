import random

from rest_framework import generics, filters
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Customer
from .serializers import CustomerListSerializer, CustomerDetailSerializer
from .filters import CustomerFilter
from mlmodels import predictor


class CustomerListAPIView(generics.ListAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CustomerFilter
    search_fields = ["code_contrat"]
    ordering_fields = ["arpu", "anc_m", "mnt_forfait_data", "target_next_month", "code_contrat"]
    ordering = ["code_contrat"]


class CustomerDetailAPIView(generics.RetrieveAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerDetailSerializer
    lookup_field = "code_contrat"


@api_view(["GET"])
def customer_facets(request):
    """Distinct filter option lists for the Data Explorer's dropdowns."""
    return Response({
        "regions": list(Customer.objects.order_by().values_list("region", flat=True).distinct()),
        "handsets": list(Customer.objects.order_by().values_list("handset", flat=True).distinct()),
        "statuts": list(Customer.objects.order_by().values_list("statut", flat=True).distinct()),
        "offers": list(Customer.objects.order_by().values_list("offre", flat=True).distinct()),
    })


@api_view(["GET"])
def random_customer(request):
    """Powers the 'surprise me' button on the Predict page."""
    count = Customer.objects.count()
    customer = Customer.objects.all()[random.randint(0, count - 1)]
    return Response(CustomerDetailSerializer(customer).data)


@api_view(["POST"])
def predict_customer(request, code_contrat):
    """Re-runs both live models against a real, stored customer."""
    try:
        customer = Customer.objects.get(code_contrat=code_contrat)
    except Customer.DoesNotExist:
        return Response({"detail": "Customer not found."}, status=404)

    result = predictor.predict(customer.features)
    result["customer"] = CustomerListSerializer(customer).data
    result["actual_next_month"] = customer.target_next_month
    return Response(result)
