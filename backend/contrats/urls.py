from rest_framework.routers import DefaultRouter
from .views import ContratViewSet

router = DefaultRouter()
router.register("", ContratViewSet, basename="contrat")

urlpatterns = router.urls
