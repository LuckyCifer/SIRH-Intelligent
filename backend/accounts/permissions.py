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


def membres_equipe(manager):
    """Employés actifs des départements dirigés par le manager (lui-même exclu)."""
    from accounts.models import User
    return User.objects.filter(
        departement__in=manager.departements_diriges.all(), is_active=True,
    ).exclude(pk=manager.pk)


def peut_gerer(utilisateur, employe):
    """RH/ADMIN : le personnel de son entreprise ; MANAGER : son équipe uniquement (pas lui-même)."""
    if getattr(utilisateur, "is_superuser", False):
        return True
    if utilisateur.entreprise_id != employe.entreprise_id:
        return False
    if utilisateur.role in ("RH", "ADMIN") or utilisateur.is_staff:
        return True
    if utilisateur.role == "MANAGER":
        return membres_equipe(utilisateur).filter(pk=employe.pk).exists()
    return False


class IsSuperUtilisateur(BasePermission):
    """Administrateur de la plateforme (gère les entreprises clientes)."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_superuser


# Aliases legacy pour le code existant
IsStagiaire       = IsEmploye
IsEncadreur       = IsManager
IsAdminRH         = IsRH
IsEncadreurOrAdmin = IsManagerOrRH
IsRHOrAdmin       = IsRH  # alias explicite pour UserManagementViewSet
