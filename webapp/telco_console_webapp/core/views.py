from django.shortcuts import render


def home(request):
    return render(request, "core/home.html")


def data_explorer(request):
    return render(request, "core/data_explorer.html")


def business_analysis(request):
    return render(request, "core/business_analysis.html")


def reports_page(request):
    return render(request, "core/reports.html")


def models_page(request):
    return render(request, "core/models.html")


def predict_page(request):
    return render(request, "core/predict.html")
