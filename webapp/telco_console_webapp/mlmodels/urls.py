from django.urls import path
from . import views

urlpatterns = [
    path("comparison/", views.model_comparison, name="model-comparison"),
    path("form-schema/", views.prediction_form_schema, name="prediction-form-schema"),
    path("predict/", views.predict_manual, name="predict-manual"),
]
