from django.db import models as db_models
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CategorieDocument, DocumentRH
from .serializers import CategorieDocumentSerializer, DocumentRHSerializer


class CategorieDocumentViewSet(viewsets.ModelViewSet):
    queryset           = CategorieDocument.objects.all()
    serializer_class   = CategorieDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            from accounts.permissions import IsRH
            return [IsRH()]
        return [permissions.IsAuthenticated()]


class DocumentRHViewSet(viewsets.ModelViewSet):
    serializer_class   = DocumentRHSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = DocumentRH.objects.select_related(
            "employe", "categorie", "uploade_par"
        )

        # Filtres
        employe_id  = self.request.query_params.get("employe")
        categorie_id = self.request.query_params.get("categorie")
        visibilite  = self.request.query_params.get("visibilite")

        if employe_id:
            qs = qs.filter(employe_id=employe_id)
        if categorie_id:
            qs = qs.filter(categorie_id=categorie_id)
        if visibilite:
            qs = qs.filter(visibilite=visibilite)

        if user.role == "EMPLOYE":
            return qs.filter(
                db_models.Q(employe=user) |
                db_models.Q(visibilite="TOUS")
            )
        if user.role == "MANAGER":
            return qs.filter(
                db_models.Q(
                    employe__departement__in=user.departements_diriges.all()
                ) |
                db_models.Q(visibilite__in=["TOUS", "EQUIPE"])
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(uploade_par=self.request.user)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            from accounts.permissions import IsManagerOrRH
            return [IsManagerOrRH()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=["get"])
    def mes_documents(self, request):
        docs = DocumentRH.objects.filter(
            employe=request.user
        ).select_related("categorie")
        return Response(DocumentRHSerializer(docs, many=True).data)
