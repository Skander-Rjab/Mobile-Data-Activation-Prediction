from django.urls import path
from . import views

urlpatterns = [
    path("", views.CustomerListAPIView.as_view(), name="customer-list"),
    path("facets/", views.customer_facets, name="customer-facets"),
    path("random/", views.random_customer, name="customer-random"),
    path("<str:code_contrat>/", views.CustomerDetailAPIView.as_view(), name="customer-detail"),
    path("<str:code_contrat>/predict/", views.predict_customer, name="customer-predict"),
]
