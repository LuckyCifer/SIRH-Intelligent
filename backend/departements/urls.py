from rest_framework.routers import DefaultRouter
from .views import DepartementViewSet, PosteViewSet

router = DefaultRouter()
router.register("", DepartementViewSet, basename="departement")
router.register("postes", PosteViewSet, basename="poste")

urlpatterns = router.urls
