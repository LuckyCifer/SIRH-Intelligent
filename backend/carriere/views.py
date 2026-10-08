from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsRH
from .models import EvenementCarriere
from .serializers import EvenementCarriereSerializer


class EvenementCarriereViewSet(viewsets.ModelViewSet):
    serializer_class = EvenementCarriereSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        employe_id = self.request.query_params.get("employe")

        qs = EvenementCarriere.objects.select_related(
            "employe", "departement_avant", "departement_apres",
            "poste_avant", "poste_apres", "enregistre_par",
        )

        if employe_id:
            qs = qs.filter(employe_id=employe_id)

        if user.role in ["RH", "ADMIN"]:
            return qs
        if user.role == "MANAGER":
            depts = user.departements_diriges.values_list("id", flat=True)
            return qs.filter(employe__departement__in=depts)
        return qs.filter(employe=user)

    def perform_create(self, serializer):
        serializer.save(enregistre_par=self.request.user)

    @action(detail=False, methods=["get"], url_path="timeline-employe")
    def timeline_employe(self, request):
        from accounts.models import User as UserModel
        employe_id = request.query_params.get("employe_id")
        if not employe_id:
            return Response({"error": "employe_id requis"}, status=status.HTTP_400_BAD_REQUEST)
        entreprise = getattr(request.user, "entreprise", None)
        if entreprise and not UserModel.objects.filter(pk=employe_id, entreprise=entreprise).exists():
            return Response(status=status.HTTP_403_FORBIDDEN)
        evenements = EvenementCarriere.objects.filter(
            employe_id=employe_id
        ).select_related(
            "employe", "departement_avant", "departement_apres",
            "poste_avant", "poste_apres", "enregistre_par",
        ).order_by("date_evenement")
        return Response(EvenementCarriereSerializer(evenements, many=True).data)
