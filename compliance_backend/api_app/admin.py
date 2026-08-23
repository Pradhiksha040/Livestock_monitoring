from django.contrib import admin
from .models import Livestock, TreatmentPrescription

@admin.register(Livestock)
class LivestockAdmin(admin.ModelAdmin):
    list_display = ('tag_id', 'species', 'weight_kg', 'age_months')

@admin.register(TreatmentPrescription)
class TreatmentPrescriptionAdmin(admin.ModelAdmin):
    list_display = ('livestock', 'drug_name', 'predicted_clearance_days', 'safe_market_date', 'created_at')
    readonly_fields = ('predicted_clearance_days', 'safe_market_date')
