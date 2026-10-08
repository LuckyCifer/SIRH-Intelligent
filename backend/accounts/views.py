"""
Vues — accounts
"""
import io
import os
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import update_session_auth_hash
from django.db.models import Q


def _redimensionner_photo(fichier_upload):
    from PIL import Image
    from django.core.files.uploadedfile import InMemoryUploadedFile
    img = Image.open(fichier_upload)
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    img.thumbnail((600, 800), Image.LANCZOS)
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=85)
    output.seek(0)
    return InMemoryUploadedFile(
        output, 'ImageField', 'photo_profil.jpg',
        'image/jpeg', output.getbuffer().nbytes, None,
    )


def _supprimer_photo_fichier(user):
    if user.photo_profil:
        try:
            if os.path.isfile(user.photo_profil.path):
                os.remove(user.photo_profil.path)
        except Exception:
            pass

from .models import User
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    UpdateProfileSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    PasswordChangeByRHSerializer,
)
from .permissions import IsAdminRH, IsRHOrAdmin, IsManagerOrRH
from .filiere_data import FILIERE_DATA


class RegisterView(generics.CreateAPIView):
    """POST /api/accounts/register/ — Inscription (public pour les tests, restreindre en prod)"""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"message": "Compte créé avec succès.", "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    """GET/PUT /api/accounts/me/ — Profil de l'utilisateur connecté"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user, context={'request': request}).data)

    def put(self, request):
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Profil mis à jour.", "user": UserSerializer(request.user, context={'request': request}).data})


class MePhotoView(APIView):
    """POST/DELETE /api/accounts/me/photo/ — Upload ou suppression de la photo de profil."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        fichier = request.FILES.get("photo_profil")
        if not fichier:
            return Response({"detail": "Aucun fichier envoyé."}, status=400)
        if fichier.size > 2 * 1024 * 1024:
            return Response({"detail": "La photo ne doit pas dépasser 2 Mo."}, status=400)
        _supprimer_photo_fichier(request.user)
        request.user.photo_profil = _redimensionner_photo(fichier)
        request.user.save(update_fields=["photo_profil"])
        return Response({
            "message": "Photo mise à jour.",
            "user": UserSerializer(request.user, context={'request': request}).data,
        })

    def delete(self, request):
        _supprimer_photo_fichier(request.user)
        request.user.photo_profil = None
        request.user.save(update_fields=["photo_profil"])
        return Response({"message": "Photo supprimée."})


class ChangePasswordView(APIView):
    """POST /api/accounts/change-password/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"old_password": "Mot de passe actuel incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"message": "Mot de passe modifié avec succès."})


class UserListView(generics.ListAPIView):
    """GET /api/accounts/users/ — Liste des utilisateurs (Admin seulement)"""
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [IsAdminRH]

    def get_queryset(self):
        qs = super().get_queryset()
        role    = self.request.query_params.get("role")
        filiere = self.request.query_params.get("filiere")
        if role:
            qs = qs.filter(role=role)
        if filiere:
            qs = qs.filter(filiere=filiere)
        return qs


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/accounts/users/<id>/ — Détail utilisateur (Admin)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminRH]


class MonEquipeView(APIView):
    """
    GET /api/accounts/mon-equipe/ — Employés actifs que l'utilisateur peut gérer
    (listes déroulantes « Employé » des formulaires manager).
    MANAGER : membres des départements qu'il dirige. RH/ADMIN : tous les employés.
    Champs réduits : aucune donnée personnelle sensible.
    """
    permission_classes = [IsManagerOrRH]

    def get(self, request):
        user = request.user
        qs = User.objects.filter(is_active=True).exclude(pk=user.pk).select_related("departement")
        if user.role == "MANAGER":
            qs = qs.filter(departement__in=user.departements_diriges.all())
        else:
            qs = qs.filter(role="EMPLOYE")
            entreprise = getattr(user, "entreprise", None)
            if entreprise:
                qs = qs.filter(entreprise=entreprise)
        return Response([
            {
                "id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "full_name": u.get_full_name() or u.username,
                "role": u.role,
                "departement": u.departement_id,
                "departement_nom": u.departement.nom if u.departement else None,
            }
            for u in qs.order_by("last_name", "first_name")
        ])


class AnnuaireView(generics.ListAPIView):
    """GET /api/accounts/annuaire/ — Annuaire entreprise (tous les rôles authentifiés)"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        entreprise = getattr(self.request.user, 'entreprise', None)
        qs = User.objects.filter(is_active=True).exclude(role='ADMIN')
        if entreprise:
            qs = qs.filter(entreprise=entreprise)
        search = self.request.query_params.get('search', '')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(role__icontains=search)
            )
        return qs.order_by('last_name', 'first_name')


class FilieresListView(APIView):
    """GET /api/accounts/filieres/ — Liste des filières ACERFI (public)"""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(FILIERE_DATA)


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    /api/gestion-comptes/ — CRUD comptes utilisateurs par le RH.
    Isolé par entreprise, soft-delete uniquement.
    """
    permission_classes = [IsAuthenticated, IsRHOrAdmin]
    pagination_class = None  # Retourner tous les comptes sans pagination

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        entreprise = getattr(self.request.user, "entreprise", None)
        qs = User.objects.filter(entreprise=entreprise).order_by("last_name", "first_name")

        role      = self.request.query_params.get("role")
        is_active = self.request.query_params.get("is_active")
        dept      = self.request.query_params.get("departement")
        search    = self.request.query_params.get("search", "").strip()

        if role:
            qs = qs.filter(role=role)
        if is_active is not None and is_active != "":
            qs = qs.filter(is_active=(is_active.lower() == "true"))
        if dept:
            qs = qs.filter(departement__id=dept)
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(username__icontains=search) |
                Q(email__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save(entreprise=request.user.entreprise)
        self._notifier_rh(
            request,
            titre="Nouveau compte créé",
            message=f"Le compte {user.get_full_name() or user.username} ({user.role}) a été créé par {request.user.get_full_name() or request.user.username}.",
            lien="/rh/gestion-comptes",
        )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        # Empêcher un RH de modifier son propre rôle
        if instance.pk == request.user.pk and "role" in request.data:
            return Response(
                {"detail": "Vous ne pouvez pas modifier votre propre rôle."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Upload photo uniquement
        fichier = request.FILES.get("photo_profil")
        if fichier:
            if fichier.size > 2 * 1024 * 1024:
                return Response({"detail": "La photo ne doit pas dépasser 2 Mo."}, status=400)
            _supprimer_photo_fichier(instance)
            instance.photo_profil = _redimensionner_photo(fichier)
            instance.save(update_fields=["photo_profil"])
            return Response(UserSerializer(instance, context={'request': request}).data)

        serializer = UserUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        self._notifier_rh(
            request,
            titre="Compte modifié",
            message=f"Le compte {user.get_full_name() or user.username} a été modifié par {request.user.get_full_name() or request.user.username}.",
            lien="/rh/gestion-comptes",
        )
        return Response(UserSerializer(user, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.pk == request.user.pk:
            return Response(
                {"detail": "Vous ne pouvez pas désactiver votre propre compte."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Vérifier bulletins de paie ou pointages
        has_paie = instance.bulletins_paie.exists() if hasattr(instance, "bulletins_paie") else False
        has_pointages = instance.pointages.exists() if hasattr(instance, "pointages") else False
        if has_paie or has_pointages:
            return Response(
                {"detail": "Ce compte ne peut pas être supprimé car il possède des bulletins de paie ou des pointages. Utilisez la désactivation à la place."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Soft delete
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        self._notifier_rh(
            request,
            titre="Compte désactivé",
            message=f"Le compte {instance.get_full_name() or instance.username} a été désactivé par {request.user.get_full_name() or request.user.username}.",
            lien="/rh/gestion-comptes",
        )
        return Response({"detail": "Compte désactivé."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        instance = self.get_object()
        serializer = PasswordChangeByRHSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance.set_password(serializer.validated_data["new_password"])
        instance.save(update_fields=["password"])
        self._notifier_rh(
            request,
            titre="Mot de passe réinitialisé",
            message=f"Le mot de passe de {instance.get_full_name() or instance.username} a été réinitialisé par {request.user.get_full_name() or request.user.username}.",
            lien="/rh/gestion-comptes",
        )
        return Response({"detail": "Mot de passe réinitialisé avec succès."})

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        instance = self.get_object()

        if instance.pk == request.user.pk:
            return Response(
                {"detail": "Vous ne pouvez pas désactiver votre propre compte."},
                status=status.HTTP_403_FORBIDDEN,
            )

        instance.is_active = not instance.is_active
        instance.save(update_fields=["is_active"])
        etat = "activé" if instance.is_active else "désactivé"
        self._notifier_rh(
            request,
            titre=f"Compte {etat}",
            message=f"Le compte {instance.get_full_name() or instance.username} a été {etat} par {request.user.get_full_name() or request.user.username}.",
            lien="/rh/gestion-comptes",
        )
        return Response({
            "is_active": instance.is_active,
            "message": f"Compte {etat} avec succès.",
        })

    @action(detail=True, methods=["delete"], url_path="supprimer-photo")
    def supprimer_photo(self, request, pk=None):
        """DELETE /api/accounts/gestion-comptes/{id}/supprimer-photo/"""
        instance = self.get_object()
        _supprimer_photo_fichier(instance)
        instance.photo_profil = None
        instance.save(update_fields=["photo_profil"])
        return Response({"message": "Photo supprimée."})

    @action(detail=False, methods=["get"], url_path="alertes-avancement")
    def alertes_avancement(self, request):
        """GET /api/gestion-comptes/alertes-avancement/ — Employés dont l'avancement est dû ou dans 30j."""
        from datetime import timedelta
        from django.utils import timezone
        today   = timezone.now().date()
        limite  = today + timedelta(days=30)
        entreprise = getattr(request.user, "entreprise", None)
        qs = User.objects.filter(
            entreprise=entreprise,
            is_active=True,
            prochain_avancement__isnull=False,
            prochain_avancement__lte=limite,
        ).order_by("prochain_avancement")
        return Response(UserSerializer(qs, many=True).data)

    def _notifier_rh(self, request, titre, message, lien=""):
        try:
            from notifications.models import Notification
            # Notifier tous les RH/ADMIN de la même entreprise (hors l'acteur)
            admins = User.objects.filter(
                entreprise=request.user.entreprise,
                role__in=[User.Role.RH, User.Role.ADMIN],
                is_active=True,
            ).exclude(pk=request.user.pk)
            for admin in admins:
                Notification.objects.create(
                    destinataire=admin,
                    type_notif="INFO",
                    categorie="SYSTEME",
                    titre=titre,
                    message=message,
                    lien=lien,
                )
        except Exception:
            pass
