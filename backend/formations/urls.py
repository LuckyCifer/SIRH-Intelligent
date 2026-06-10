from rest_framework.routers import DefaultRouter
from .views import (
    CategorieFormationViewSet, FormationViewSet,
    InscriptionFormationViewSet, CompetenceAcquiseViewSet,
)

router = DefaultRouter()
router.register("categories", CategorieFormationViewSet, basename="categorie-formation")
router.register("formations", FormationViewSet, basename="formation")
router.register("inscriptions", InscriptionFormationViewSet, basename="inscription-formation")
router.register("competences", CompetenceAcquiseViewSet, basename="competence-acquise")

urlpatterns = router.urls
