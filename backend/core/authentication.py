from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

class SafeJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that does not fail with 401 when an expired or invalid
    token is supplied on endpoints that allow anonymous access (AllowAny).
    If an endpoint requires authentication (IsAuthenticated), DRF's permission class
    will still correctly deny access with 401.
    """
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, AuthenticationFailed):
            return None
