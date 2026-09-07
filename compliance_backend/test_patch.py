import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "compliance_backend.settings")
django.setup()

from api_app.models import TreatmentPrescription
from api_app.serializers import VetReviewSerializer

t = TreatmentPrescription.objects.first()
print(f"Before: {t.vet_decision_status}")

data = {
    "vet_decision_status": "Approved",
    "vet_clinical_notes": None
}

serializer = VetReviewSerializer(t, data=data, partial=True)
if serializer.is_valid():
    serializer.save()
    print("Serializer is valid and saved.")
else:
    print("Serializer errors:", serializer.errors)

t.refresh_from_db()
print(f"After: {t.vet_decision_status}")
