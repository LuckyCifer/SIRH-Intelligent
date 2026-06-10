from rest_framework.routers import DefaultRouter
from .views import EvenementCarriereViewSet

router = DefaultRouter()
router.register("", EvenementCarriereViewSet, basename="carriere")

urlpatterns = router.urls
