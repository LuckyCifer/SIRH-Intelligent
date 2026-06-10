from django.urls import path
from .views import (
    RegisterView,
    MeView,
    ChangePasswordView,
    UserListView,
    UserDetailView,
    FilieresListView,
)

urlpatterns = [
    path("register/",        RegisterView.as_view(),      name="register"),
    path("me/",              MeView.as_view(),             name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("users/",           UserListView.as_view(),       name="user-list"),
    path("users/<int:pk>/",  UserDetailView.as_view(),     name="user-detail"),
    path("filieres/",        FilieresListView.as_view(),   name="filieres-list"),
]
