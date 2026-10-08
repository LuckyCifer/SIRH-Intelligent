from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PointageViewSet, ConfigPresenceViewSet, rapport_presence_equipe, jours_feries_annee

router = DefaultRouter()
router.register("config",  ConfigPresenceViewSet, basename="config-presence")
router.register("",        PointageViewSet,        basename="pointage")

# Les chemins nommés DOIVENT précéder router.urls (sinon le routeur les capte comme <pk>)
urlpatterns = [
    path("rapport-equipe/",            rapport_presence_equipe, name="rapport-presence-equipe"),
    path("jours-feries/<int:annee>/",  jours_feries_annee,      name="presences-jours-feries"),
] + router.urls
