"""
GSRIA — URLs racine
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # Admin Django
    path("admin/", admin.site.urls),

    # JWT Auth
    path("api/auth/login/",   TokenObtainPairView.as_view(),  name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(),     name="token_refresh"),
    path("api/auth/verify/",  TokenVerifyView.as_view(),      name="token_verify"),

    # Apps
    path("api/accounts/",       include("accounts.urls")),
    path("api/departements/",   include("departements.urls")),
    path("api/contrats/",       include("contrats.urls")),
    path("api/conges/",         include("conges.urls")),
    path("api/presences/",      include("presences.urls")),
    path("api/documents/",      include("documents.urls")),
    path("api/stagiaires/",     include("stagiaires.urls")),
    path("api/rapports/",       include("rapports.urls")),
    path("api/analyse/",        include("analyse_ia.urls")),
    path("api/objectifs/",      include("objectifs.urls")),
    path("api/carriere/",       include("carriere.urls")),
    path("api/recrutements/",   include("recrutements.urls")),
    path("api/formations/",     include("formations.urls")),
    path("api/sanctions/",      include("sanctions.urls")),
    path("api/paie/",           include("paie.urls")),
    path("api/rapport-ia/",     include("rapport_ia.urls")),
    path("api/entreprises/",    include("entreprises.urls")),
    path("api/notifications/",  include("notifications.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
