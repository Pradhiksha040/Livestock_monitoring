import joblib
import numpy as np
import os
from datetime import timedelta, date
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Livestock, TreatmentPrescription
from .serializers import LivestockSerializer, TreatmentPrescriptionSerializer, VetReviewSerializer, CustomTokenObtainPairSerializer, RegisterSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# Load the AI Model globally
# Loading at the module level ensures it loads only once when the server starts,
# instead of reloading the heavy .pkl file on every single POST request.
# ==========================================
MODEL_PATH = os.path.join(settings.BASE_DIR, 'residue_clearance_model.pkl')
try:
    clearance_model = joblib.load(MODEL_PATH)
    print(f"AI Model loaded successfully from {MODEL_PATH}")
except FileNotFoundError:
    clearance_model = None
    print(f"WARNING: AI Model not found at {MODEL_PATH}")


# ==========================================
# GET /api/livestock/ — List all animals
# ==========================================
class ListLivestockAPIView(APIView):
    """
    Returns a list of all registered livestock in the system.
    Used by the React frontend to populate the 'Select Animal' dropdown.
    """
    def get(self, request, *args, **kwargs):
        livestock = Livestock.objects.all().order_by('tag_id')
        serializer = LivestockSerializer(livestock, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ==========================================
# GET /api/treatments/ — List all treatments with compliance status
# POST /api/treatments/ — Record a new treatment + run AI prediction
# ==========================================
class TreatmentAPIView(APIView):
    """
    GET:  Returns all treatment prescriptions, each enriched with a computed
          'compliance_status' field ('Compliant' or 'Under Withdrawal') based
          on today's date vs the AI-predicted safe_market_date.

    POST: Accepts a new treatment payload, runs the AI prediction pipeline,
          calculates the safe market date, saves the record, and returns
          the full enriched prescription.
    """

    def get(self, request, *args, **kwargs):
        treatments = TreatmentPrescription.objects.select_related('livestock').order_by('-created_at')
        today = date.today()

        results = []
        for treatment in treatments:
            serializer = TreatmentPrescriptionSerializer(treatment)
            data = serializer.data

            # Compute live compliance status (not stored in DB — always current)
            if treatment.safe_market_date:
                if today >= treatment.safe_market_date:
                    data['compliance_status'] = 'Compliant'
                else:
                    days_remaining = (treatment.safe_market_date - today).days
                    data['compliance_status'] = 'Under Withdrawal'
                    data['days_remaining'] = days_remaining
            else:
                data['compliance_status'] = 'Unknown'

            # Attach livestock display info for convenience
            data['livestock_tag'] = treatment.livestock.tag_id
            data['livestock_species'] = treatment.livestock.species
            results.append(data)

        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        # 1. Validate the incoming payload
        serializer = TreatmentPrescriptionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # 2. Get the associated livestock to extract its intrinsic features (weight and age)
        livestock_id = request.data.get('livestock')
        livestock = get_object_or_404(Livestock, id=livestock_id)
        validated_data = serializer.validated_data

        # 3. Format Data for the AI Model
        if clearance_model is None:
            return Response(
                {"error": "AI Model not loaded. Backend is currently operating without AI features."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Note on feature order: must EXACTLY match the training order!
        # Training Order: [species, weight, age, drug, dosage, route, health]
        features = [
            livestock.species,
            livestock.weight_kg,
            livestock.age_months,
            validated_data['drug_name'],
            validated_data['dosage_mg_kg'],
            validated_data['route'],
            validated_data['health_status']
        ]

        # Reshape to a 2D numpy array with shape (1, 7) and dtype=object
        model_input = np.array([features], dtype=object)

        # 4. Run AI Prediction
        predicted_days_array = clearance_model.predict(model_input)
        predicted_days = max(1.0, round(float(predicted_days_array[0]), 2))

        # 5. Calculate Safe Market Date
        days_to_add = int(np.ceil(predicted_days))
        safe_date = timezone.now().date() + timedelta(days=days_to_add)

        # 6. Save the prescription with the AI's calculated values
        treatment = serializer.save(
            predicted_clearance_days=predicted_days,
            safe_market_date=safe_date
        )

        # 7. Enrich response with compliance status
        today = date.today()
        response_data = TreatmentPrescriptionSerializer(treatment).data
        response_data['compliance_status'] = 'Compliant' if today >= safe_date else 'Under Withdrawal'
        response_data['livestock_tag'] = livestock.tag_id
        response_data['livestock_species'] = livestock.species

        return Response({
            "message": "Treatment logged successfully. AI Prediction completed.",
            "data": response_data
        }, status=status.HTTP_201_CREATED)


# ==========================================
# PATCH /api/treatments/<id>/vet-review/ — Veterinarian Review Endpoint
# ==========================================
class VetReviewAPIView(APIView):
    """
    Allows a veterinarian to review, annotate, and formally decide on an
    AI-generated treatment prescription.

    Method: PATCH (partial update — only the three vet fields are touched)
    Auth:   JWT Bearer token required (enforced globally by REST_FRAMEWORK settings)

    Why PATCH and not PUT?
    ───────────────────────
    PUT requires the full object to be re-sent, which is wasteful and error-prone
    when we only want to update 3 out of 10+ fields. PATCH sends only what changed.

    The VetReviewSerializer is used instead of TreatmentPrescriptionSerializer to
    enforce the principle of least privilege — the vet cannot alter the AI's
    prediction or the core prescription data through this endpoint.
    """

    def patch(self, request, pk, *args, **kwargs):
        # ── 1. Retrieve the prescription (or 404 if it doesn't exist) ─────────
        treatment = get_object_or_404(TreatmentPrescription, pk=pk)

        # ── 2. Deserialize and validate the incoming vet review data ──────────
        # partial=True is critical: it tells DRF that not all fields need to be
        # present in the request body. This allows the vet to update only their
        # clinical notes without resending the decision status, for example.
        serializer = VetReviewSerializer(
            treatment,
            data=request.data,
            partial=True,     # Enable partial updates (PATCH semantics)
        )

        if not serializer.is_valid():
            # Validation failed (e.g. 'Modified' status sent without a date)
            # Returns 400 with descriptive field-level error messages
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── 3. Persist the validated vet review data ───────────────────────────
        updated_treatment = serializer.save()

        # ── 4. Build a rich response for the frontend ─────────────────────────
        # Re-serialize with the FULL serializer so the frontend receives ALL
        # fields (including AI predictions) in a single response, avoiding a
        # follow-up GET request.
        full_data = TreatmentPrescriptionSerializer(updated_treatment).data

        # Attach the livestock display info (same enrichment as the POST endpoint)
        full_data['livestock_tag']     = updated_treatment.livestock.tag_id
        full_data['livestock_species'] = updated_treatment.livestock.species

        # Compute the authoritative market date:
        # If the vet modified the date, use their override; otherwise fall back to AI's date.
        authoritative_date = (
            updated_treatment.final_safe_market_date
            if updated_treatment.vet_decision_status == TreatmentPrescription.VetDecision.MODIFIED
            else updated_treatment.safe_market_date
        )
        full_data['authoritative_safe_market_date'] = str(authoritative_date) if authoritative_date else None

        return Response({
            "message": f"Vet review saved. Decision: {updated_treatment.get_vet_decision_status_display()}",
            "data": full_data,
        }, status=status.HTTP_200_OK)
