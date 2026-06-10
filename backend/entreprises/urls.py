from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EntrepriseViewSet, MonEntrepriseView, EntreprisePubliqueView

router = DefaultRouter()
router.register("entreprises", EntrepriseViewSet, basename="entreprise")

urlpatterns = [
    path("", include(router.urls)),
    path("mon-entreprise/", MonEntrepriseView.as_view(), name="mon-entreprise"),
    path("publique/<slug:slug>/", EntreprisePubliqueView.as_view(), name="entreprise-publique"),
]
