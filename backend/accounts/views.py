"""
Vues — accounts
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import update_session_auth_hash

from .models import User
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    UpdateProfileSerializer,
)
from .permissions import IsAdminRH
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
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Profil mis à jour.", "user": UserSerializer(request.user).data})


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


class FilieresListView(APIView):
    """GET /api/accounts/filieres/ — Liste des filières ACERFI (public)"""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(FILIERE_DATA)
