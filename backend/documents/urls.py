from rest_framework.routers import DefaultRouter
from .views import CategorieDocumentViewSet, DocumentRHViewSet

router = DefaultRouter()
router.register("categories", CategorieDocumentViewSet, basename="categorie-document")
router.register("",           DocumentRHViewSet,         basename="document-rh")

urlpatterns = router.urls
