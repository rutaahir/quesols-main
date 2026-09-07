from django.urls import path, include
from rest_framework.routers import DefaultRouter
from kot.views import (
    KioskJoinView,
    PrinterHeartbeatView,
    PrinterJobsView,
    PrinterJobCompleteView,
    PrinterViewSet,
    KioskViewSet,
    PublicKioskListView,
    KioskLoginView,
    KioskLogoutView,
    KotTerminalViewSet,
    PublicKotTerminalListView,
    KotTerminalLoginView,
    KotTerminalLogoutView,
)

router = DefaultRouter()
router.register("devices", PrinterViewSet, basename="printers")
router.register("kiosks", KioskViewSet, basename="kiosks")
router.register("terminals", KotTerminalViewSet, basename="kot-terminals")

urlpatterns = [
    path("public/kiosk/join/", KioskJoinView.as_view(), name="kiosk-join"),
    path("printers/heartbeat/", PrinterHeartbeatView.as_view(), name="printer-heartbeat"),
    path("printers/jobs/pending/", PrinterJobsView.as_view(), name="printer-jobs-pending"),
    path("printers/jobs/<int:job_id>/complete/", PrinterJobCompleteView.as_view(), name="printer-job-complete"),
    path("public/kiosks/", PublicKioskListView.as_view(), name="public-kiosks-list"),
    path("public/kiosks/login/", KioskLoginView.as_view(), name="public-kiosks-login"),
    path("public/kiosks/logout/", KioskLogoutView.as_view(), name="public-kiosks-logout"),
    path("public/kot-terminals/", PublicKotTerminalListView.as_view(), name="public-kot-terminals-list"),
    path("public/kot-terminals/login/", KotTerminalLoginView.as_view(), name="public-kot-terminals-login"),
    path("public/kot-terminals/logout/", KotTerminalLogoutView.as_view(), name="public-kot-terminals-logout"),
    path("kot/public/kot-terminals/", PublicKotTerminalListView.as_view()),
    path("kot/public/kot-terminals/login/", KotTerminalLoginView.as_view()),
    path("kot/public/kot-terminals/logout/", KotTerminalLogoutView.as_view()),
    path("kot/", include(router.urls)),
]

