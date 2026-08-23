from django.urls import path
from .views import ListLivestockAPIView, TreatmentAPIView, VetReviewAPIView

urlpatterns = [
    # GET /api/livestock/  — list all registered animals (for dropdown population)
    path('livestock/', ListLivestockAPIView.as_view(), name='list_livestock'),

    # GET /api/treatments/  — list all treatments with compliance status
    # POST /api/treatments/ — create a new treatment + run AI prediction
    path('treatments/', TreatmentAPIView.as_view(), name='treatments'),

    # PATCH /api/treatments/<id>/vet-review/ — vet annotates / decides on a prescription
    # Uses int: converter so a non-integer pk (e.g. "abc") returns 404 immediately
    # without hitting the database.
    path('treatments/<int:pk>/vet-review/', VetReviewAPIView.as_view(), name='vet_review'),
]
