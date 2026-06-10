from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PointageViewSet, ConfigPresenceViewSet, rapport_presence_equipe

router = DefaultRouter()
router.register("config",  ConfigPresenceViewSet, basename="config-presence")
router.register("",        PointageViewSet,        basename="pointage")

urlpatterns = router.urls + [
    path("rapport-equipe/", rapport_presence_equipe, name="rapport-presence-equipe"),
]
