from django.db.models import Avg, Sum
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsRH, IsManagerOrRH
from .models import CategorieFormation, Formation, InscriptionFormation, CompetenceAcquise
from .serializers import (
    CategorieFormationSerializer, FormationSerializer,
    InscriptionFormationSerializer, CompetenceAcquiseSerializer,
)


class CategorieFormationViewSet(viewsets.ModelViewSet):
    queryset = CategorieFormation.objects.all()
    serializer_class = CategorieFormationSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [permissions.IsAuthenticated()]


class FormationViewSet(viewsets.ModelViewSet):
    serializer_class = FormationSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "terminer", "stats"]:
            return [IsRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Formation.objects.select_related("categorie", "cree_par").prefetch_related("inscriptions")
        statut = self.request.query_params.get("statut")
        categorie = self.request.query_params.get("categorie")
        if statut:
            qs = qs.filter(statut=statut)
        if categorie:
            qs = qs.filter(categorie_id=categorie)
        return qs

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=True, methods=["post"])
    def terminer(self, request, pk=None):
        formation = self.get_object()
        formation.statut = "TERMINEE"
        formation.save()
        return Response(FormationSerializer(formation).data)

    @action(detail=False, methods=["get"])
    def catalogue(self, request):
        formations = Formation.objects.filter(
            statut__in=["PLANIFIEE", "EN_COURS"]
        ).select_related("categorie", "cree_par").prefetch_related("inscriptions")
        return Response(FormationSerializer(formations, many=True).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        formations = Formation.objects.all()
        inscriptions = InscriptionFormation.objects.all()
        return Response({
            "total_formations": formations.count(),
            "formations_planifiees": formations.filter(statut="PLANIFIEE").count(),
            "formations_en_cours": formations.filter(statut="EN_COURS").count(),
            "formations_terminees": formations.filter(statut="TERMINEE").count(),
            "total_inscriptions": inscriptions.count(),
            "inscriptions_en_attente": inscriptions.filter(statut="EN_ATTENTE").count(),
            "taux_presence": round(
                inscriptions.filter(statut="PRESENT").count() /
                max(1, inscriptions.filter(statut__in=["PRESENT", "ABSENT"]).count()) * 100,
                1,
            ),
            "cout_total": formations.aggregate(Sum("cout"))["cout__sum"] or 0,
            "note_moyenne": round(
                inscriptions.filter(note_formation__isnull=False).aggregate(
                    Avg("note_formation")
                )["note_formation__avg"] or 0,
                1,
            ),
        })


class InscriptionFormationViewSet(viewsets.ModelViewSet):
    serializer_class = InscriptionFormationSerializer

    def get_permissions(self):
        if self.action in ["valider", "marquer_presence"]:
            return [IsManagerOrRH()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = InscriptionFormation.objects.select_related("employe", "formation", "valide_par")
        formation_id = self.request.query_params.get("formation")
        if formation_id:
            qs = qs.filter(formation_id=formation_id)
        if user.role == "EMPLOYE":
            return qs.filter(employe=user)
        if user.role == "MANAGER":
            return qs.filter(employe__departement__in=user.departements_diriges.all())
        return qs

    def perform_create(self, serializer):
        if self.request.user.role == "EMPLOYE":
            serializer.save(employe=self.request.user)
        else:
            serializer.save()

    @action(detail=True, methods=["post"])
    def valider(self, request, pk=None):
        inscription = self.get_object()
        inscription.statut = "INSCRIT"
        inscription.valide_par = request.user
        inscription.save()
        return Response(InscriptionFormationSerializer(inscription).data)

    @action(detail=True, methods=["post"], url_path="marquer-presence")
    def marquer_presence(self, request, pk=None):
        inscription = self.get_object()
        present = request.data.get("present", True)
        inscription.statut = "PRESENT" if present else "ABSENT"
        inscription.save()
        return Response(InscriptionFormationSerializer(inscription).data)

    @action(detail=True, methods=["post"])
    def noter(self, request, pk=None):
        inscription = self.get_object()
        note = request.data.get("note")
        commentaire = request.data.get("commentaire", "")
        if not note or not (1 <= int(note) <= 5):
            return Response({"error": "Note entre 1 et 5 requise."}, status=400)
        inscription.note_formation = int(note)
        inscription.commentaire = commentaire
        inscription.save()
        return Response(InscriptionFormationSerializer(inscription).data)

    @action(detail=False, methods=["get"], url_path="mes-inscriptions")
    def mes_inscriptions(self, request):
        inscriptions = InscriptionFormation.objects.filter(
            employe=request.user
        ).select_related("formation", "formation__categorie", "valide_par")
        return Response(InscriptionFormationSerializer(inscriptions, many=True).data)

    @action(detail=True, methods=["post"], url_path="annuler-inscription")
    def annuler_inscription(self, request, pk=None):
        inscription = self.get_object()
        if inscription.employe != request.user and request.user.role not in ["RH", "ADMIN"]:
            return Response({"error": "Accès refusé."}, status=403)
        inscription.statut = "ANNULE"
        inscription.save()
        return Response(InscriptionFormationSerializer(inscription).data)


class CompetenceAcquiseViewSet(viewsets.ModelViewSet):
    serializer_class = CompetenceAcquiseSerializer

    def get_queryset(self):
        user = self.request.user
        employe_id = self.request.query_params.get("employe")
        qs = CompetenceAcquise.objects.select_related("employe", "formation")
        if employe_id:
            return qs.filter(employe_id=employe_id)
        if user.role == "EMPLOYE":
            return qs.filter(employe=user)
        return qs
