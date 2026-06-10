from rest_framework.routers import DefaultRouter
from .views import RapportIAMensuelViewSet

router = DefaultRouter()
router.register("rapports", RapportIAMensuelViewSet, basename="rapport-ia")

urlpatterns = router.urls
