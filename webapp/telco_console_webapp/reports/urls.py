from django.urls import path
from . import views

urlpatterns = [
    path("config/", views.report_config, name="report-config"),
]
