from rest_framework.routers import DefaultRouter
from .views import (
    ConfigurationPaieViewSet,
    ElementPaieViewSet,
    BulletinPaieViewSet,
    ImportPaieViewSet,
    VirementMobileViewSet,
)

router = DefaultRouter()
router.register("configurations", ConfigurationPaieViewSet, basename="config-paie")
router.register("elements",       ElementPaieViewSet,       basename="element-paie")
router.register("bulletins",      BulletinPaieViewSet,      basename="bulletin-paie")
router.register("import",         ImportPaieViewSet,        basename="paie-import")
router.register("virements",      VirementMobileViewSet,    basename="virement-mobile")

urlpatterns = router.urls
