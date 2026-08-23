from rest_framework import serializers
from django.core.validators import MinValueValidator
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Livestock, TreatmentPrescription, UserProfile

class RegisterSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=UserProfile.Role.choices, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'role']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        role = validated_data.pop('role')
        # Create user (this triggers the post_save signal which creates the UserProfile)
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        # Update the auto-created profile with the selected role
        user.userprofile.role = role
        user.userprofile.save()
        return user

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Livestock, TreatmentPrescription, UserProfile

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add custom claims to the response payload
        try:
            data['role'] = self.user.userprofile.role
        except UserProfile.DoesNotExist:
            data['role'] = UserProfile.Role.FARMER # Default fallback

        return data

from .models import Livestock, TreatmentPrescription


class LivestockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Livestock
        fields = '__all__'


class TreatmentPrescriptionSerializer(serializers.ModelSerializer):
    # ── Business Rule: dosage must be a positive, non-zero value ──────────────
    # Without this explicit override, DRF's ModelSerializer maps dosage_mg_kg
    # to a plain FloatField with no bounds, meaning -5.0 is silently accepted.
    #
    # MinValueValidator(0.01) rejects any value ≤ 0 and returns:
    #   HTTP 400 { "dosage_mg_kg": ["Ensure this value is greater than or equal to 0.01."] }
    #
    # This was identified as a security finding by the automated test suite
    # (test_negative_dosage_returns_400) and fixed here. — Week 9 QA Review.
    dosage_mg_kg = serializers.FloatField(
        validators=[MinValueValidator(0.01)]
    )

    class Meta:
        model = TreatmentPrescription
        fields = '__all__'
        # Fields the serializer exposes as read-only.
        # The user cannot POST/PATCH their own values for these — they are
        # either set by the AI pipeline or managed by the VetReviewSerializer.
        read_only_fields = [
            'predicted_clearance_days',
            'safe_market_date',
            'created_at',
        ]


class VetReviewSerializer(serializers.ModelSerializer):
    """
    Purpose-built serializer for the PATCH /api/treatments/<id>/vet-review/ endpoint.

    Design Decision — Why a separate serializer?
    ─────────────────────────────────────────────
    Using the full TreatmentPrescriptionSerializer for a PATCH would expose ALL
    fields to modification. By restricting to only these three fields, we:
      1. Enforce the principle of least privilege at the API layer.
      2. Make it impossible to overwrite the AI's `predicted_clearance_days`
         or the original `safe_market_date` via this endpoint.
      3. Keep validation logic clean and purpose-specific.

    Validation rule: `final_safe_market_date` is only meaningful when the
    vet_decision_status is 'Modified'. The validate() hook enforces this
    business constraint at the serializer level (before it ever hits the DB).
    """

    class Meta:
        model = TreatmentPrescription
        fields = [
            'vet_clinical_notes',
            'vet_decision_status',
            'final_safe_market_date',
        ]

    def validate(self, attrs):
        """
        Cross-field validation: if the vet sets status to 'Modified', they MUST
        also supply a final_safe_market_date. Otherwise the farmer has no
        actionable date to follow.
        """
        decision = attrs.get('vet_decision_status')
        final_date = attrs.get('final_safe_market_date')

        # On PATCH, attrs only contains the submitted fields.
        # We also check the existing instance value in case only one field was sent.
        if self.instance:
            decision = decision or self.instance.vet_decision_status

        if decision == TreatmentPrescription.VetDecision.MODIFIED and not final_date:
            # Also check if the instance already has a final date set (partial update)
            instance_has_date = self.instance and self.instance.final_safe_market_date
            if not instance_has_date:
                raise serializers.ValidationError({
                    'final_safe_market_date': (
                        'A final safe market date is required when the decision is "Modified". '
                        'Please supply the overriding date.'
                    )
                })

        return attrs
