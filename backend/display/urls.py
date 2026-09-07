from django.urls import path, include
from rest_framework.routers import DefaultRouter
from display.views import (
    PublicDisplayTerminalListView,
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
    path("public/display-terminals/", PublicDisplayTerminalListView.as_view(), name="public_display_terminal_list"),
    path("public/display-terminals/login/", DisplayTerminalLoginView.as_view(), name="display_terminal_login"),
    path("public/display-terminals/logout/", DisplayTerminalLogoutView.as_view(), name="display_terminal_logout"),
    path("display-terminals/<int:pk>/regenerate-passcode/", RegenerateDisplayPasscodeView.as_view(), name="regenerate_display_passcode"),
    path("", include(router.urls)),
]
