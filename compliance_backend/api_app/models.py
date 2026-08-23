from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    class Role(models.TextChoices):
        FARMER = 'FARMER', 'Farmer'
        VET = 'VET', 'Veterinarian'
        ADMIN = 'ADMIN', 'Administrator'

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.FARMER)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a UserProfile when a User is created."""
    if created:
        # Default superusers to ADMIN, otherwise FARMER
        role = UserProfile.Role.ADMIN if instance.is_superuser else UserProfile.Role.FARMER
        UserProfile.objects.create(user=instance, role=role)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Ensure UserProfile is saved when User is saved."""
    if not hasattr(instance, 'userprofile'):
        role = UserProfile.Role.ADMIN if instance.is_superuser else UserProfile.Role.FARMER
        UserProfile.objects.create(user=instance, role=role)
    instance.userprofile.save()

class Livestock(models.Model):
    tag_id = models.CharField(max_length=50, unique=True, help_text="Unique identifier for the animal")
    species = models.CharField(max_length=50, help_text="e.g., Cattle, Sheep, Pig")
    breed = models.CharField(max_length=50, blank=True, null=True)
    weight_kg = models.FloatField()
    age_months = models.FloatField()

    def __str__(self):
        return f"{self.species} - {self.tag_id}"


class TreatmentPrescription(models.Model):
    # ── Core Prescription Fields ──────────────────────────────────────────────
    livestock = models.ForeignKey(Livestock, on_delete=models.CASCADE, related_name='treatments')
    drug_name = models.CharField(max_length=100)
    dosage_mg_kg = models.FloatField()
    route = models.CharField(max_length=50, help_text="e.g., Injectable, Oral, Topical")
    health_status = models.CharField(max_length=50, help_text="e.g., Healthy, Mild Infection, Severe Infection")

    # ── AI Predictions (read-only via serializer) ─────────────────────────────
    # These are computed by the model at POST time and stored for audit purposes.
    predicted_clearance_days = models.FloatField(blank=True, null=True)
    safe_market_date = models.DateField(blank=True, null=True)

    # ── Veterinarian Review Fields ────────────────────────────────────────────
    # Added Week 10: collaborative workflow where a vet reviews and endorses
    # (or overrides) the AI's withdrawal period prediction.

    class VetDecision(models.TextChoices):
        """
        Controlled vocabulary for the vet's clinical decision.
        Using TextChoices stores a short code in the DB ('Pending', 'Approved', etc.)
        while Django automatically validates that only listed values are accepted.
        """
        PENDING  = 'Pending',  'Pending Review'    # Default: AI ran, vet hasn't acted yet
        APPROVED = 'Approved', 'Approved'           # Vet endorses the AI's prediction as-is
        MODIFIED = 'Modified', 'Date Modified'      # Vet overrides the AI with a custom date
        REJECTED = 'Rejected', 'Treatment Rejected' # Vet rejects the treatment plan entirely

    vet_clinical_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Vet's clinical observations, reasoning, or instructions for the farmer.",
    )
    vet_decision_status = models.CharField(
        max_length=20,
        choices=VetDecision.choices,
        default=VetDecision.PENDING,
        help_text="The veterinarian's formal review decision on this AI-generated prescription.",
    )
    final_safe_market_date = models.DateField(
        blank=True,
        null=True,
        help_text=(
            "Vet's overriding market date. Only populated when vet_decision_status='Modified'. "
            "Farmers should always follow this date over the AI's safe_market_date."
        ),
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Treatment for {self.livestock.tag_id} - {self.drug_name} [{self.vet_decision_status}]"
