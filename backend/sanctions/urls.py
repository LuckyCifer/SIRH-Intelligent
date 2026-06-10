from rest_framework.routers import DefaultRouter
from .views import SanctionViewSet

router = DefaultRouter()
router.register("", SanctionViewSet, basename="sanction")

urlpatterns = router.urls
