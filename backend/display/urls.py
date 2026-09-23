from django.urls import path, include
from rest_framework.routers import DefaultRouter
from display.views import (
    PublicDisplayTerminalListView,
    PublicDisplayDataView,
    PublicVerifyDisplaySessionView,
    DisplayTerminalLoginView,
    DisplayTerminalLogoutView,
    RegenerateDisplayPasscodeView,
    DisplayTerminalViewSet,
    DisplayTerminalSlotViewSet,
)

router = DefaultRouter()
router.register("display-terminals", DisplayTerminalViewSet, basename="display-terminals")
router.register("display-slots", DisplayTerminalSlotViewSet, basename="display-slots")

urlpatterns = [
    # Public (no auth) endpoints used by the display board
    path("public/display-terminals/", PublicDisplayTerminalListView.as_view(), name="public_display_terminal_list"),
    path("public/display-terminals/login/", DisplayTerminalLoginView.as_view(), name="display_terminal_login"),
    path("public/display-terminals/logout/", DisplayTerminalLogoutView.as_view(), name="display_terminal_logout"),
    path("public/display-terminals/verify-session/", PublicVerifyDisplaySessionView.as_view(), name="display_verify_session"),
    path("public/display/<int:branch_id>/", PublicDisplayDataView.as_view(), name="public_display_data"),

    # Authenticated management endpoints
    path("display-terminals/<int:pk>/regenerate-passcode/", RegenerateDisplayPasscodeView.as_view(), name="regenerate_display_passcode"),
    path("", include(router.urls)),
]
