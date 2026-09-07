import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "compliance_backend.settings")
django.setup()

from api_app.models import Livestock, TreatmentPrescription, UserProfile
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import joblib
import numpy as np
import random

model = joblib.load('residue_clearance_model.pkl')

Livestock.objects.all().delete()
TreatmentPrescription.objects.all().delete()

farmer_profile = UserProfile.objects.filter(role=UserProfile.Role.FARMER).first()
farmer_user = farmer_profile.user if farmer_profile else None

animal1 = Livestock.objects.create(farmer=farmer_user, tag_id="ANI_001", species="Cattle", weight_kg=550.0, age_months=24.0)
animal2 = Livestock.objects.create(farmer=farmer_user, tag_id="ANI_002", species="Pig", weight_kg=120.0, age_months=8.0)
animal3 = Livestock.objects.create(farmer=farmer_user, tag_id="ANI_003", species="Sheep", weight_kg=65.0, age_months=12.0)
animal4 = Livestock.objects.create(farmer=farmer_user, tag_id="ANI_004", species="Goat", weight_kg=45.0, age_months=14.0)
animal5 = Livestock.objects.create(farmer=farmer_user, tag_id="ANI_005", species="Cattle", weight_kg=600.0, age_months=36.0)

animals = [animal1, animal2, animal3, animal4, animal5]
drugs = ['Oxytetracycline', 'Amoxicillin', 'Penicillin', 'Tylosin']
routes = ['Injectable', 'Oral', 'Topical']
health = ['Healthy', 'Mild Infection', 'Severe Infection']

random.seed(42)

for animal in animals:
    # 2 treatments per animal
    for _ in range(2):
        drug = random.choice(drugs)
        route = random.choice(routes)
        health_status = random.choice(health)
        dosage = random.uniform(5.0, 25.0)

        features = [
            animal.species,
            animal.weight_kg,
            animal.age_months,
            drug,
            dosage,
            route,
            health_status
        ]

        model_input = np.array([features], dtype=object)
        predicted_days_array = model.predict(model_input)
        predicted_days = max(1.0, round(float(predicted_days_array[0]), 2))
        days_to_add = int(np.ceil(predicted_days))
        
        # Add some historical variation for safe dates to test compliance logic
        days_offset = random.randint(-15, 5) 
        treatment_date = timezone.now().date() + timedelta(days=days_offset)
        safe_date = treatment_date + timedelta(days=days_to_add)

        TreatmentPrescription.objects.create(
            livestock=animal,
            drug_name=drug,
            dosage_mg_kg=dosage,
            route=route,
            health_status=health_status,
            predicted_clearance_days=predicted_days,
            safe_market_date=safe_date
        )

print("Created 5 animals and 10 treatment prescriptions successfully.")
