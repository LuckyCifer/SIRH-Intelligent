from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    MeView,
    MePhotoView,
    ChangePasswordView,
    UserListView,
    UserDetailView,
    AnnuaireView,
    MonEquipeView,
    FilieresListView,
    UserManagementViewSet,
)

router = DefaultRouter()
router.register(r"gestion-comptes", UserManagementViewSet, basename="gestion-comptes")

urlpatterns = [
    path("register/",        RegisterView.as_view(),      name="register"),
    path("me/",              MeView.as_view(),             name="me"),
    path("me/photo/",        MePhotoView.as_view(),        name="me-photo"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("users/",           UserListView.as_view(),       name="user-list"),
    path("users/<int:pk>/",  UserDetailView.as_view(),     name="user-detail"),
    path("annuaire/",        AnnuaireView.as_view(),       name="annuaire"),
    path("mon-equipe/",      MonEquipeView.as_view(),      name="mon-equipe"),
    path("filieres/",        FilieresListView.as_view(),   name="filieres-list"),
    path("", include(router.urls)),
]
