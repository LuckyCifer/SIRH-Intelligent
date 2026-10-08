"""
Permissions personnalisées — SIRH
"""
from rest_framework.permissions import BasePermission


class IsEmploye(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_employe


class IsManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_manager


class IsRH(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_rh or request.user.is_admin_sys or request.user.is_staff
        )


class IsManagerOrRH(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_manager or request.user.is_rh
            or request.user.is_admin_sys or request.user.is_staff
        )


# Aliases legacy pour le code existant
IsStagiaire       = IsEmploye
IsEncadreur       = IsManager
IsAdminRH         = IsRH
IsEncadreurOrAdmin = IsManagerOrRH
IsRHOrAdmin       = IsRH  # alias explicite pour UserManagementViewSet
