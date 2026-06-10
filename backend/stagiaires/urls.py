from django.urls import path
from .views import (
    StagePeriodeListCreateView,
    StagePeriodeDetailView,
    ProjetSoutenanceListCreateView,
    ProjetSoutenanceDetailView,
    EncadreurDashboardView,
    mon_dashboard_encadreur,
    detail_stagiaire,
    mes_stats_encadreur,
)

urlpatterns = [
    path("periodes/",                          StagePeriodeListCreateView.as_view(),     name="periode-list"),
    path("periodes/<int:pk>/",                 StagePeriodeDetailView.as_view(),         name="periode-detail"),
    path("projets/",                           ProjetSoutenanceListCreateView.as_view(), name="projet-list"),
    path("projets/<int:pk>/",                  ProjetSoutenanceDetailView.as_view(),     name="projet-detail"),
    path("dashboard/",                         EncadreurDashboardView.as_view(),         name="encadreur-dashboard"),
    path("mon-dashboard/",                     mon_dashboard_encadreur,                  name="mon-dashboard"),
    path("mes-stats/",                         mes_stats_encadreur,                      name="mes-stats-encadreur"),
    path("<int:stagiaire_id>/detail/",         detail_stagiaire,                         name="detail-stagiaire"),
]
