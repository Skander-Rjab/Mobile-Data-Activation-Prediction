from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["code_contrat", "region", "handset", "offre", "arpu", "target_next_month", "will_activate"]
    list_filter = ["region", "handset", "statut", "will_activate"]
    search_fields = ["code_contrat"]
