from django.urls import path
from .views import (
    RapportListCreateView,
    RapportDetailView,
    RapportStatsView,
    soumettre_rapport,
    valider_rapport,
    mes_stats,
)

urlpatterns = [
    path("",                    RapportListCreateView.as_view(), name="rapport-list"),
    path("stats/",              RapportStatsView.as_view(),      name="rapport-stats"),
    path("mes-stats/",          mes_stats,                       name="mes-stats"),
    path("<int:pk>/",           RapportDetailView.as_view(),     name="rapport-detail"),
    path("<int:pk>/soumettre/", soumettre_rapport,               name="rapport-soumettre"),
    path("<int:pk>/valider/",   valider_rapport,                 name="rapport-valider"),
]
