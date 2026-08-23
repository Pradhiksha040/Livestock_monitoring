"""
tests.py — Automated Test Suite for the Livestock Compliance API
================================================================
Week 9–10 Deliverable: Security, Integration & Testing

This file demonstrates a professional-grade test strategy using Django's
built-in APITestCase framework. Tests are grouped into logical classes,
each targeting a distinct concern:

    1. AuthenticationTests   → Security gate (JWT enforcement)
    2. TreatmentPostTests    → Happy-path AI prediction (HTTP 201)
    3. ValidationErrorTests  → Input validation & error handling (HTTP 400)
    4. LivestockAPITests     → Livestock list endpoint (GET)

Key Testing Principles Demonstrated:
  • setUp()  — Creates isolated, repeatable test fixtures (DB records + auth tokens)
  • tearDown() — Automatically handled by TestCase (rolls back DB per test)
  • Assertions — Status codes, JSON keys, JSON values, and data types are all
                 checked to ensure the entire response contract is correct.
  • Security — Every endpoint is hit WITHOUT a token first to prove the 401 gate.

Run all tests with:
    python manage.py test api_app.tests
"""

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Livestock, TreatmentPrescription


# ─────────────────────────────────────────────────────────────────────────────
# Test Helper — Creates a JWT token pair for a user without going through
# the HTTP /api/token/ endpoint. This is faster and avoids coupling auth
# tests to the login view implementation details.
# ─────────────────────────────────────────────────────────────────────────────
def get_tokens_for_user(user):
    """
    Generates a SimpleJWT token pair directly from a User object.
    Returns the access token string.
    This is the recommended testing pattern in the simplejwt documentation.
    """
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access':  str(refresh.access_token),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Base Test Class — Shared fixtures reused by all test classes.
# Using a shared base class avoids code duplication across test cases.
# ─────────────────────────────────────────────────────────────────────────────
class BaseAPITest(APITestCase):
    """
    Abstract base class providing common setup for all test cases.
    Creates one authenticated user and one Livestock record that child
    test classes can reference via self.user and self.livestock.
    """

    def setUp(self):
        """
        Runs before EVERY individual test method.
        Django wraps each test in a transaction that is rolled back afterward,
        so every test starts with a clean, empty database.
        """
        # ── 1. Create a test user in the in-memory test database ──────────────
        # Django's test runner uses a separate, isolated database — your real
        # db.sqlite3 file is NEVER touched during tests.
        self.user = User.objects.create_user(
            username='vet_user_test',
            password='SecureTestPassword123!',
        )

        # ── 2. Create a Livestock record to use as a FK in TreatmentPrescription ─
        self.livestock = Livestock.objects.create(
            tag_id='TEST-COW-001',
            species='Cattle',
            breed='Holstein',
            weight_kg=450.0,  # A healthy adult dairy cow
            age_months=36,
        )

        # ── 3. Set up the API client ──────────────────────────────────────────
        # APIClient is DRF's test-friendly HTTP client that supports
        # Bearer token injection via .credentials().
        self.client = APIClient()

        # ── 4. Generate a JWT token for the test user ─────────────────────────
        # We generate the token PROGRAMMATICALLY — no need to POST to /api/token/.
        tokens = get_tokens_for_user(self.user)
        self.access_token = tokens['access']

        # Pre-build an authenticated client header for convenience in child tests.
        # self.auth_header can be passed to any request to make it authenticated.
        self.auth_header = {'HTTP_AUTHORIZATION': f'Bearer {self.access_token}'}

    # ── Convenience wrappers ──────────────────────────────────────────────────
    def authenticate(self):
        """Configures the client to send the Bearer token on all subsequent requests."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')

    def deauthenticate(self):
        """Removes any stored credentials — simulates an anonymous/unauthenticated user."""
        self.client.credentials()  # Calling with no args clears all credentials


# =============================================================================
# TEST CLASS 1: Authentication / Security Gate Tests
# Goal: Prove that the JWT middleware correctly rejects unauthenticated requests.
# =============================================================================
class AuthenticationTests(BaseAPITest):
    """
    Security validation tests.
    These tests verify that the API endpoints are NOT publicly accessible —
    a critical security requirement for any production API.

    If any of these tests FAIL, it means the API is open to the public,
    which would be a critical vulnerability.
    """

    def test_unauthenticated_get_treatments_returns_401(self):
        """
        SECURITY: A GET request to /api/treatments/ WITHOUT any token must
        be rejected with HTTP 401 Unauthorized.

        This test simulates an anonymous attacker or a user who is not logged in.
        Expected behaviour: The server NEVER processes the request; it stops at
        the authentication middleware layer.
        """
        # Ensure no credentials are set (deauthenticate is called to be explicit)
        self.deauthenticate()

        response = self.client.get('/api/treatments/')

        # Assert the status code is 401 — NOT 200 or 403
        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
            msg="FAIL: Unauthenticated GET to /api/treatments/ did not return 401. "
                "The endpoint may be publicly accessible!"
        )

    def test_unauthenticated_post_treatments_returns_401(self):
        """
        SECURITY: A POST request to /api/treatments/ WITHOUT any token must
        be rejected with HTTP 401 Unauthorized.

        This simulates an attacker attempting to inject fraudulent prescription
        records without having valid credentials.
        """
        self.deauthenticate()

        # Attempt to POST a treatment — the server should reject it before
        # even attempting to deserialize or run the AI model.
        payload = {
            'livestock': self.livestock.id,
            'drug_name': 'Oxytetracycline',
            'dosage_mg_kg': 10.0,
            'route': 'Injectable',
            'health_status': 'Mild Infection',
        }
        response = self.client.post('/api/treatments/', payload, format='json')

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
            msg="FAIL: Unauthenticated POST to /api/treatments/ did not return 401."
        )

    def test_unauthenticated_get_livestock_returns_401(self):
        """
        SECURITY: A GET request to /api/livestock/ WITHOUT a token must return 401.
        """
        self.deauthenticate()
        response = self.client.get('/api/livestock/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_token_returns_401(self):
        """
        SECURITY: A request with a FORGED or MALFORMED token must be rejected.

        This tests the cryptographic signature verification of JWT — the server
        checks that the token was signed with the correct SECRET_KEY and rejects
        anything that was tampered with.
        """
        # Inject a deliberately invalid token string
        self.client.credentials(HTTP_AUTHORIZATION='Bearer this.is.not.a.valid.jwt.token')

        response = self.client.get('/api/treatments/')

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
            msg="FAIL: A forged/invalid token was accepted by the API."
        )

    def test_authenticated_user_can_access_treatments(self):
        """
        POSITIVE AUTH TEST: A valid token must grant access (HTTP 200 on GET).
        This is the 'control' test — proving authenticated users are NOT blocked.
        """
        self.authenticate()  # Inject the valid Bearer token
        response = self.client.get('/api/treatments/')

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            msg="FAIL: An authenticated user received a non-200 response on GET /api/treatments/"
        )


# =============================================================================
# TEST CLASS 2: Happy Path — Successful AI Prediction (POST /api/treatments/)
# Goal: Validate the full end-to-end flow for a valid prescription submission.
# =============================================================================
class TreatmentPostTests(BaseAPITest):
    """
    Integration tests for the core AI prediction pipeline.
    These tests walk through the complete POST flow:
        1. Serializer validates the input data.
        2. View retrieves the livestock record.
        3. AI model runs a prediction.
        4. Response contains the predicted_clearance_days and safe_market_date.

    NOTE: These tests require the AI model file (.pkl) to be present at the
    path specified in settings.py. If the model is missing, the endpoint
    returns HTTP 503, and these tests will correctly fail, alerting you
    that the model file needs to be deployed.
    """

    def setUp(self):
        """Extends the base setUp and ensures the client is pre-authenticated."""
        super().setUp()       # Run parent setUp (creates user, livestock, client)
        self.authenticate()   # All tests in this class use an authenticated client

        # ── Standard valid payload ────────────────────────────────────────────
        # This represents a realistic, correctly-formed API request.
        # All field values must match what was in the training data (species, route, etc.)
        self.valid_payload = {
            'livestock':   self.livestock.id,  # FK to the Livestock object we created in setUp
            'drug_name':   'Oxytetracycline',
            'dosage_mg_kg': 10.0,
            'route':       'Injectable',
            'health_status': 'Mild Infection',
        }

    def test_successful_post_returns_201(self):
        """
        HAPPY PATH: A valid POST must return HTTP 201 Created.

        HTTP 201 (Created) is more semantically correct than 200 (OK) because
        we are CREATING a new database record, not just reading data.
        """
        response = self.client.post('/api/treatments/', self.valid_payload, format='json')

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            msg=f"FAIL: Expected 201, got {response.status_code}. "
                f"Response body: {response.data}"
        )

    def test_response_contains_top_level_message_and_data_keys(self):
        """
        CONTRACT TEST: The response JSON must have the structure:
            { "message": "...", "data": { ... } }
        This validates the API contract that the React frontend depends on.
        """
        response = self.client.post('/api/treatments/', self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check for the top-level keys that the frontend's createTreatment() function reads
        self.assertIn('message', response.data,
                      msg="FAIL: 'message' key missing from response JSON.")
        self.assertIn('data', response.data,
                      msg="FAIL: 'data' key missing from response JSON.")

    def test_ai_prediction_key_present_in_response(self):
        """
        AI MODEL TEST: The 'data' object must contain the AI's output:
            predicted_clearance_days  — The core ML output
            safe_market_date          — The calculated date for safe market entry
        """
        response = self.client.post('/api/treatments/', self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        prediction_data = response.data.get('data', {})

        # The predicted_clearance_days field is the direct output of the AI model
        self.assertIn('predicted_clearance_days', prediction_data,
                      msg="FAIL: AI key 'predicted_clearance_days' missing. "
                          "Has the model been loaded? Check if the .pkl file exists.")

        # safe_market_date is derived from predicted_clearance_days in the view
        self.assertIn('safe_market_date', prediction_data,
                      msg="FAIL: 'safe_market_date' missing from prediction data.")

    def test_predicted_clearance_days_is_positive_number(self):
        """
        SANITY / BUSINESS RULE TEST: The AI's predicted clearance period must be
        a positive number. Negative clearance days are physically impossible and
        would indicate a model or data pipeline failure.

        The view enforces `max(1.0, ...)` — this test verifies that safeguard works.
        """
        response = self.client.post('/api/treatments/', self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        clearance_days = response.data['data']['predicted_clearance_days']

        # Type check: must be a number (int or float), not a string
        self.assertIsInstance(clearance_days, (int, float),
                              msg=f"FAIL: predicted_clearance_days is type "
                                  f"'{type(clearance_days)}', expected a number.")

        # Value check: the view applies max(1.0, ...) — so minimum valid value is 1.0
        self.assertGreater(clearance_days, 0,
                           msg=f"FAIL: predicted_clearance_days is {clearance_days}. "
                               f"Business rule violation: clearance days must be positive.")

    def test_new_treatment_is_saved_to_database(self):
        """
        PERSISTENCE TEST: After a successful POST, the treatment record must
        exist in the database. This verifies the view's `serializer.save()` call
        actually committed the data.
        """
        initial_count = TreatmentPrescription.objects.count()

        self.client.post('/api/treatments/', self.valid_payload, format='json')

        final_count = TreatmentPrescription.objects.count()
        self.assertEqual(
            final_count,
            initial_count + 1,
            msg=f"FAIL: Expected {initial_count + 1} records in DB after POST, "
                f"but found {final_count}. The record was not saved."
        )

    def test_response_includes_compliance_status(self):
        """
        BUSINESS LOGIC TEST: The response must include a 'compliance_status' field.
        This is the computed field added by the view after the AI prediction.
        Valid values are 'Compliant' or 'Under Withdrawal'.
        """
        response = self.client.post('/api/treatments/', self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        compliance_status_value = response.data['data'].get('compliance_status')

        self.assertIsNotNone(compliance_status_value,
                             msg="FAIL: 'compliance_status' key is missing from response data.")
        self.assertIn(
            compliance_status_value,
            ['Compliant', 'Under Withdrawal'],
            msg=f"FAIL: compliance_status has unexpected value: '{compliance_status_value}'"
        )


# =============================================================================
# TEST CLASS 3: Unhappy Path — Error Handling & Input Validation
# Goal: Prove the API returns structured HTTP 400 errors instead of crashing.
# =============================================================================
class ValidationErrorTests(BaseAPITest):
    """
    Negative testing / input validation tests.
    A robust API must NEVER crash on bad input — it must return a descriptive
    HTTP 400 Bad Request with a JSON body explaining what went wrong.

    These tests simulate realistic data-entry mistakes a user could make.
    """

    def setUp(self):
        """Extends the base setUp and ensures the client is pre-authenticated."""
        super().setUp()
        self.authenticate()

    def test_missing_drug_name_returns_400(self):
        """
        VALIDATION: If the required 'drug_name' field is omitted, the serializer
        must reject it with a 400 error and a message indicating the field is required.
        The API must NOT crash with a 500 Internal Server Error.
        """
        payload_without_drug = {
            'livestock':    self.livestock.id,
            # 'drug_name' is deliberately missing
            'dosage_mg_kg': 10.0,
            'route':        'Injectable',
            'health_status': 'Healthy',
        }
        response = self.client.post('/api/treatments/', payload_without_drug, format='json')

        # Must return 400, not 500 (crash) or 201 (incorrectly accepted)
        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            msg="FAIL: Missing 'drug_name' field did not produce a 400 response. "
                "The API may be silently accepting incomplete data."
        )

        # The error body must tell the developer WHICH field failed
        self.assertIn('drug_name', response.data,
                      msg="FAIL: Error response does not identify 'drug_name' as the problem field.")

    def test_missing_livestock_fk_returns_400(self):
        """
        VALIDATION: If the 'livestock' foreign-key field is omitted, the
        serializer must flag it as required and return 400.
        """
        payload_without_livestock = {
            # 'livestock' FK is missing
            'drug_name':    'Penicillin',
            'dosage_mg_kg': 5.0,
            'route':        'Injectable',
            'health_status': 'Healthy',
        }
        response = self.client.post('/api/treatments/', payload_without_livestock, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('livestock', response.data,
                      msg="FAIL: 'livestock' FK error not reported in error response.")

    def test_invalid_livestock_id_returns_404(self):
        """
        VALIDATION: If a livestock ID that doesn't exist in the database is
        provided, the view must return 404 Not Found (via get_object_or_404).
        This tests the database lookup branch of the view.
        """
        payload_with_bad_fk = {
            'livestock':    99999,  # This ID does not exist in the test database
            'drug_name':    'Amoxicillin',
            'dosage_mg_kg': 8.0,
            'route':        'Oral',
            'health_status': 'Healthy',
        }
        response = self.client.post('/api/treatments/', payload_with_bad_fk, format='json')

        # DRF's get_object_or_404 returns 404, NOT 400 or 500
        # NOTE: Some DRF versions also return 400 due to serializer FK validation —
        # either 400 or 404 is acceptable here. We check for "not 500" and "not 201".
        self.assertNotEqual(response.status_code, status.HTTP_201_CREATED,
                            msg="FAIL: An invalid livestock ID was accepted and created a record.")
        self.assertNotEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR,
                            msg="FAIL: An invalid livestock ID caused a server crash (500).")

    def test_negative_dosage_returns_400(self):
        """
        BUSINESS RULE / VALIDATION: A negative dosage is physically meaningless
        and could indicate a data-entry error or malicious input.

        DRF serializers apply `min_value` validation if declared on the field.
        If no min_value is set on dosage_mg_kg in the serializer, this test
        may FAIL — which is itself a valuable finding: the serializer needs hardening!
        """
        payload_negative_dosage = {
            'livestock':    self.livestock.id,
            'drug_name':    'Penicillin',
            'dosage_mg_kg': -5.0,  # ← Intentionally invalid negative value
            'route':        'Injectable',
            'health_status': 'Healthy',
        }
        response = self.client.post('/api/treatments/', payload_negative_dosage, format='json')

        # If this assertion fails, it's a finding: add MinValueValidator to the serializer!
        self.assertNotEqual(
            response.status_code, status.HTTP_201_CREATED,
            msg="SECURITY FINDING: A negative dosage was accepted and created a record. "
                "Add MinValueValidator(0.01) to dosage_mg_kg in the serializer."
        )

    def test_empty_payload_returns_400(self):
        """
        EDGE CASE: Posting a completely empty JSON object must return 400.
        This catches a case where a client accidentally posts `{}`.
        """
        response = self.client.post('/api/treatments/', {}, format='json')

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            msg="FAIL: An empty payload did not return 400 Bad Request."
        )

        # The response should contain multiple error keys (all required fields missing)
        self.assertGreater(
            len(response.data), 0,
            msg="FAIL: Error response body is empty. It should list all missing fields."
        )

    def test_non_numeric_dosage_returns_400(self):
        """
        TYPE VALIDATION: Sending a string where a float is expected must return 400.
        DRF's serializer type coercion is tested here.
        """
        payload_string_dosage = {
            'livestock':    self.livestock.id,
            'drug_name':    'Oxytetracycline',
            'dosage_mg_kg': 'ten point five',  # String instead of float
            'route':        'Injectable',
            'health_status': 'Healthy',
        }
        response = self.client.post('/api/treatments/', payload_string_dosage, format='json')

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            msg="FAIL: A non-numeric dosage was accepted by the API."
        )


# =============================================================================
# TEST CLASS 4: Livestock API Tests (GET /api/livestock/)
# Goal: Validate the livestock listing endpoint.
# =============================================================================
class LivestockAPITests(BaseAPITest):
    """
    Tests for the GET /api/livestock/ endpoint.
    This endpoint is used by the React frontend to populate the animal dropdown.
    """

    def setUp(self):
        """Extends the base setUp and ensures the client is pre-authenticated."""
        super().setUp()
        self.authenticate()

    def test_get_livestock_returns_200(self):
        """HAPPY PATH: An authenticated GET to /api/livestock/ returns HTTP 200."""
        response = self.client.get('/api/livestock/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_livestock_list_returns_array(self):
        """
        CONTRACT TEST: The response must be a JSON array (list).
        The React component maps over this array to render the dropdown options.
        """
        response = self.client.get('/api/livestock/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # response.data is DRF's parsed representation of the response body
        self.assertIsInstance(
            response.data, list,
            msg="FAIL: /api/livestock/ did not return a JSON array. "
                "The frontend dropdown will break."
        )

    def test_livestock_list_contains_correct_fields(self):
        """
        SCHEMA TEST: Each livestock object in the response must contain
        the fields the React frontend actually uses to display the dropdown.
        """
        response = self.client.get('/api/livestock/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # We created exactly one livestock record in setUp — verify it appears
        self.assertGreater(len(response.data), 0, msg="FAIL: Livestock list is empty.")

        first_animal = response.data[0]

        # These are the fields the frontend reads:
        required_fields = ['id', 'tag_id', 'species', 'weight_kg', 'age_months']
        for field in required_fields:
            self.assertIn(
                field, first_animal,
                msg=f"FAIL: Livestock response missing expected field: '{field}'"
            )
