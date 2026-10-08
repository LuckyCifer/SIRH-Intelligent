from rest_framework.routers import DefaultRouter
from .views import DepartementViewSet, PosteViewSet

router = DefaultRouter()
# "postes" AVANT "" : sinon /departements/postes/ est capturé comme le département pk="postes" (404)
router.register("postes", PosteViewSet, basename="poste")
router.register("", DepartementViewSet, basename="departement")

urlpatterns = router.urls
