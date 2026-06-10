from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import TypeCongeViewSet, DemandeCongeViewSet, SoldeCongeViewSet, stats_conges

router = DefaultRouter()
router.register("types",    TypeCongeViewSet,   basename="type-conge")
router.register("demandes", DemandeCongeViewSet, basename="demande-conge")
router.register("soldes",   SoldeCongeViewSet,   basename="solde-conge")

urlpatterns = router.urls + [
    path("stats/", stats_conges, name="stats-conges"),
]
