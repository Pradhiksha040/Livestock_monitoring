"""
URL configuration for compliance_backend project.
"""
from django.contrib import admin
from django.urls import path, include

# ── JWT Authentication endpoints (provided by djangorestframework-simplejwt) ──
# POST /api/token/          → Login: send {username, password}, get back {access, refresh}
# POST /api/token/refresh/  → Silent re-auth: send {refresh}, get back a new {access} token
from rest_framework_simplejwt.views import (
    TokenRefreshView,      # Validates a refresh token and returns a new access token
)
from api_app.views import CustomTokenObtainPairView, RegisterAPIView

urlpatterns = [
    # Django admin panel (superuser only)
    path('admin/', admin.site.urls),

    # ── Public Endpoints ──────────────────────────────────────────────────
    # These are PUBLIC routes (no Bearer token required).
    path('api/register/', RegisterAPIView.as_view(), name='register'),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),



    # ── Protected API Routes ─────────────────────────────────────────────────
    # All routes inside api_app/urls.py now require a valid Bearer token
    # because of the global REST_FRAMEWORK settings set in settings.py.
    path('api/', include('api_app.urls')),
]
