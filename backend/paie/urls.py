from rest_framework.routers import DefaultRouter
from .views import ConfigurationPaieViewSet, ElementPaieViewSet, BulletinPaieViewSet

router = DefaultRouter()
router.register("configurations", ConfigurationPaieViewSet, basename="config-paie")
router.register("elements",       ElementPaieViewSet,       basename="element-paie")
router.register("bulletins",      BulletinPaieViewSet,      basename="bulletin-paie")

urlpatterns = router.urls
