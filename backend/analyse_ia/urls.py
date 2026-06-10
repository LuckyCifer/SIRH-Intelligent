from django.urls import path
from .views import AnalyseListView, AnalyseDetailView, AnalyseStatsView, relancer_analyse, alertes, statut_analyse

urlpatterns = [
    path("",                                   AnalyseListView.as_view(),   name="analyse-list"),
    path("stats/",                             AnalyseStatsView.as_view(),  name="analyse-stats"),
    path("alertes/",                           alertes,                     name="alertes"),
    path("statut/<int:rapport_id>/",           statut_analyse,              name="statut-analyse"),
    path("<int:pk>/",                          AnalyseDetailView.as_view(), name="analyse-detail"),
    path("rapport/<int:rapport_pk>/relancer/", relancer_analyse,            name="analyse-relancer"),
]
