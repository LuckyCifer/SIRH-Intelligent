from rest_framework.routers import DefaultRouter
from .views import OffreEmploiViewSet, CandidatureViewSet, EntretienViewSet

router = DefaultRouter()
router.register("offres", OffreEmploiViewSet, basename="offre")
router.register("candidatures", CandidatureViewSet, basename="candidature")
router.register("entretiens", EntretienViewSet, basename="entretien")

urlpatterns = router.urls
