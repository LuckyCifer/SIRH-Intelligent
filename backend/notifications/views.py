from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(destinataire=self.request.user)
        categorie = self.request.query_params.get("categorie")
        lue = self.request.query_params.get("lue")
        if categorie:
            qs = qs.filter(categorie=categorie)
        if lue is not None:
            qs = qs.filter(lue=lue.lower() in ("true", "1"))
        return qs

    @action(detail=False, methods=["get"], url_path="compteur")
    def compteur(self, request):
        total_non_lues = Notification.objects.filter(
            destinataire=request.user, lue=False
        ).count()
        return Response({"non_lues": total_non_lues})

    @action(detail=True, methods=["patch"], url_path="marquer-lue")
    def marquer_lue(self, request, pk=None):
        notif = self.get_object()
        if not notif.lue:
            notif.lue = True
            notif.date_lecture = timezone.now()
            notif.save(update_fields=["lue", "date_lecture"])
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=["post"], url_path="tout-lire")
    def tout_lire(self, request):
        updated = Notification.objects.filter(
            destinataire=request.user, lue=False
        ).update(lue=True, date_lecture=timezone.now())
        return Response({"marquees": updated})

    @action(detail=False, methods=["delete"], url_path="supprimer-lues")
    def supprimer_lues(self, request):
        deleted, _ = Notification.objects.filter(
            destinataire=request.user, lue=True
        ).delete()
        return Response({"supprimees": deleted})
