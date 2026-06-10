from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsRH
from .models import Entreprise
from .serializers import EntrepriseSerializer, EntreprisePublicSerializer


class EntrepriseViewSet(viewsets.ModelViewSet):
    queryset = Entreprise.objects.all()
    serializer_class = EntrepriseSerializer
    permission_classes = [IsRH]

    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, pk=None):
        entreprise = self.get_object()
        data = {
            "nb_employes": entreprise.employes.filter(is_active=True).count(),
            "nb_employes_max": entreprise.nb_employes_max,
            "abonnement_actif": entreprise.abonnement_actif,
            "jours_restants": entreprise.jours_restants_abonnement,
        }
        return Response(data)


class MonEntrepriseView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_entreprise(self, request):
        # DRF authentifie via JWT dans la vue (pas dans le middleware),
        # donc request.user.entreprise est disponible ici.
        entreprise = getattr(request.user, "entreprise", None)
        if not entreprise:
            entreprise = Entreprise.objects.first()
        return entreprise

    def get(self, request):
        entreprise = self._get_entreprise(request)
        if not entreprise:
            return Response({"detail": "Aucune entreprise configurée."}, status=status.HTTP_404_NOT_FOUND)
        serializer = EntrepriseSerializer(entreprise, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        entreprise = self._get_entreprise(request)
        if not entreprise:
            return Response({"detail": "Aucune entreprise configurée."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role not in ("RH", "ADMIN") and not request.user.is_staff:
            return Response({"detail": "Permission refusée."}, status=status.HTTP_403_FORBIDDEN)
        serializer = EntrepriseSerializer(entreprise, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class EntreprisePubliqueView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            entreprise = Entreprise.objects.get(slug=slug)
        except Entreprise.DoesNotExist:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = EntreprisePublicSerializer(entreprise, context={"request": request})
        return Response(serializer.data)
