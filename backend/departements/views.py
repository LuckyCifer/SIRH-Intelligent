from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.permissions import IsManagerOrRH
from .models import Departement, Poste
from .serializers import DepartementSerializer, DepartementListSerializer, PosteSerializer


class DepartementViewSet(viewsets.ModelViewSet):
    queryset           = Departement.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return DepartementListSerializer if self.action == "list" else DepartementSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsManagerOrRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs   = Departement.objects.all()
        actif = self.request.query_params.get("actif")
        if actif is not None:
            qs = qs.filter(actif=actif.lower() in ("1", "true", "oui"))
        return qs

    @action(detail=True, methods=["get"])
    def employes(self, request, pk=None):
        from accounts.serializers import UserSerializer
        dept = self.get_object()
        return Response(UserSerializer(dept.employes.all(), many=True).data)

    @action(detail=False, methods=["get"])
    def organigramme(self, request):
        data = []
        for dept in Departement.objects.filter(actif=True).prefetch_related("postes"):
            data.append({
                "id":          dept.id,
                "nom":         dept.nom,
                "code":        dept.code,
                "couleur":     dept.couleur,
                "icone":       dept.icone,
                "responsable": dept.responsable.get_full_name() if dept.responsable else None,
                "nb_employes": dept.employes.count(),
                "postes":      [{"id": p.id, "titre": p.titre, "niveau": p.niveau}
                                for p in dept.postes.filter(actif=True)],
            })
        return Response(data)


class PosteViewSet(viewsets.ModelViewSet):
    queryset           = Poste.objects.select_related("departement").all()
    serializer_class   = PosteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsManagerOrRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        dept_id = self.request.query_params.get("departement")
        if dept_id:
            qs = qs.filter(departement_id=dept_id)
        actif = self.request.query_params.get("actif")
        if actif is not None:
            qs = qs.filter(actif=actif.lower() in ("1", "true", "oui"))
        return qs
