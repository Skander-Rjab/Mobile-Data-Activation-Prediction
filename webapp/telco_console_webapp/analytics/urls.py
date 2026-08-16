from django.urls import path
from . import views

urlpatterns = [
    path("bundle/", views.analytics_bundle, name="analytics-bundle"),
]
