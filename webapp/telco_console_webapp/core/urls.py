from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("data/", views.data_explorer, name="data-explorer"),
    path("analysis/", views.business_analysis, name="business-analysis"),
    path("reports/", views.reports_page, name="reports-page"),
    path("models/", views.models_page, name="models-page"),
    path("predict/", views.predict_page, name="predict-page"),
]
