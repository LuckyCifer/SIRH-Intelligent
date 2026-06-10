from rest_framework.routers import DefaultRouter
from .views import PeriodeEvaluationViewSet, ObjectifViewSet, EvaluationPerformanceViewSet

router = DefaultRouter()
router.register("periodes", PeriodeEvaluationViewSet, basename="periodes")
router.register("objectifs", ObjectifViewSet, basename="objectifs")
router.register("evaluations", EvaluationPerformanceViewSet, basename="evaluations")

urlpatterns = router.urls
