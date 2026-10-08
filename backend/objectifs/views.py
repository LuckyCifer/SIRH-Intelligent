from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q

from accounts.permissions import IsRH, IsManagerOrRH
from .models import PeriodeEvaluation, Objectif, EvaluationPerformance
from .serializers import (
    PeriodeEvaluationSerializer,
    ObjectifSerializer,
    EvaluationPerformanceSerializer,
)
from .services import analyser_evaluation_async

User = get_user_model()


class PeriodeEvaluationViewSet(viewsets.ModelViewSet):
    queryset = PeriodeEvaluation.objects.all()
    serializer_class = PeriodeEvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=["get"], url_path="en-cours")
    def en_cours(self, request):
        periodes = self.get_queryset().filter(statut="EN_COURS")
        return Response(PeriodeEvaluationSerializer(periodes, many=True).data)


class ObjectifViewSet(viewsets.ModelViewSet):
    serializer_class = ObjectifSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        entreprise = getattr(user, "entreprise", None)
        qs = Objectif.objects.select_related("employe", "assigne_par", "periode")
        if entreprise:
            qs = qs.filter(employe__entreprise=entreprise)

        if user.role in ["RH", "ADMIN"]:
            return qs
        if user.role == "MANAGER":
            subordonnes = User.objects.filter(
                departement__in=user.departements_diriges.all()
            ).exclude(pk=user.pk).values_list("id", flat=True)
            return qs.filter(Q(employe=user) | Q(employe__in=subordonnes))
        return qs.filter(employe=user)

    def perform_create(self, serializer):
        user = self.request.user
        employe_id = self.request.data.get("employe")
        if employe_id and user.role in ["MANAGER", "RH", "ADMIN"]:
            employe = User.objects.get(pk=employe_id)
            serializer.save(employe=employe, assigne_par=user)
        else:
            serializer.save(employe=user, assigne_par=user)

    @action(detail=False, methods=["get"], url_path="mes-objectifs")
    def mes_objectifs(self, request):
        qs = Objectif.objects.filter(employe=request.user).select_related("periode")
        periode_id = request.query_params.get("periode")
        if periode_id:
            qs = qs.filter(periode_id=periode_id)
        return Response(ObjectifSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="equipe")
    def objectifs_equipe(self, request):
        if request.user.role not in ["MANAGER", "RH", "ADMIN"]:
            return Response(status=status.HTTP_403_FORBIDDEN)
        qs = self.get_queryset()
        periode_id = request.query_params.get("periode")
        if periode_id:
            qs = qs.filter(periode_id=periode_id)
        return Response(ObjectifSerializer(qs, many=True).data)

    @action(detail=True, methods=["patch"], url_path="progression")
    def mettre_a_jour_progression(self, request, pk=None):
        objectif = self.get_object()
        progression = request.data.get("progression")
        if progression is None:
            return Response({"detail": "Champ 'progression' requis."}, status=400)
        objectif.progression = int(progression)
        commentaire = request.data.get("commentaire_employe")
        if commentaire is not None:
            objectif.commentaire_employe = commentaire
        objectif.save()
        return Response(ObjectifSerializer(objectif).data)


class EvaluationPerformanceViewSet(viewsets.ModelViewSet):
    serializer_class = EvaluationPerformanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        entreprise = getattr(user, "entreprise", None)
        qs = EvaluationPerformance.objects.select_related(
            "employe", "evaluateur", "periode"
        )
        if entreprise:
            qs = qs.filter(employe__entreprise=entreprise)

        if user.role in ["RH", "ADMIN"]:
            return qs
        if user.role == "MANAGER":
            subordonnes = User.objects.filter(
                departement__in=user.departements_diriges.all()
            ).exclude(pk=user.pk).values_list("id", flat=True)
            return qs.filter(Q(employe=user) | Q(employe__in=subordonnes))
        return qs.filter(employe=user)

    def perform_create(self, serializer):
        user = self.request.user
        employe_id = self.request.data.get("employe")
        if employe_id and user.role in ["MANAGER", "RH", "ADMIN"]:
            employe = User.objects.get(pk=employe_id)
        else:
            employe = user
        evaluation = serializer.save(employe=employe, evaluateur=user)
        try:
            from notifications.services import notifier_evaluation_soumise
            notifier_evaluation_soumise(evaluation)
        except Exception:
            pass

    def perform_update(self, serializer):
        instance = serializer.save()
        # Lancer analyse IA si toutes les notes sont présentes et statut >= EN_ATTENTE
        notes = [
            instance.note_competences, instance.note_objectifs,
            instance.note_comportement, instance.note_initiative,
            instance.note_travail_equipe, instance.note_communication,
        ]
        if all(n is not None for n in notes) and instance.statut in ["EN_ATTENTE", "SIGNE"]:
            analyser_evaluation_async(instance.pk)

    @action(detail=False, methods=["get"], url_path="mes-evaluations")
    def mes_evaluations(self, request):
        qs = EvaluationPerformance.objects.filter(
            employe=request.user
        ).select_related("periode", "evaluateur")
        return Response(EvaluationPerformanceSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="soumettre")
    def soumettre(self, request, pk=None):
        evaluation = self.get_object()
        if evaluation.employe != request.user and request.user.role not in ["MANAGER", "RH", "ADMIN"]:
            return Response(status=status.HTTP_403_FORBIDDEN)
        evaluation.statut = "EN_ATTENTE"
        evaluation.save()
        analyser_evaluation_async(evaluation.pk)
        return Response(EvaluationPerformanceSerializer(evaluation).data)

    @action(detail=True, methods=["post"], url_path="signer")
    def signer(self, request, pk=None):
        if request.user.role not in ["RH", "ADMIN"]:
            return Response(status=status.HTTP_403_FORBIDDEN)
        evaluation = self.get_object()
        evaluation.statut = "SIGNE"
        commentaire = request.data.get("commentaire_rh")
        if commentaire:
            evaluation.commentaire_rh = commentaire
        evaluation.save()
        return Response(EvaluationPerformanceSerializer(evaluation).data)

    @action(detail=True, methods=["post"], url_path="contester")
    def contester(self, request, pk=None):
        evaluation = self.get_object()
        if evaluation.employe != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        evaluation.statut = "CONTESTE"
        commentaire = request.data.get("commentaire_employe")
        if commentaire:
            evaluation.commentaire_employe = commentaire
        evaluation.save()
        return Response(EvaluationPerformanceSerializer(evaluation).data)

    @action(detail=True, methods=["post"], url_path="relancer-ia")
    def relancer_ia(self, request, pk=None):
        if request.user.role not in ["RH", "ADMIN"]:
            return Response(status=status.HTTP_403_FORBIDDEN)
        evaluation = self.get_object()
        analyser_evaluation_async(evaluation.pk)
        return Response({"detail": "Analyse IA lancée."})

    @action(detail=False, methods=["get"], url_path="tableau-bord")
    def tableau_bord(self, request):
        if request.user.role not in ["RH", "ADMIN"]:
            return Response(status=status.HTTP_403_FORBIDDEN)
        periode_id = request.query_params.get("periode")
        qs = self.get_queryset()
        if periode_id:
            qs = qs.filter(periode_id=periode_id)

        stats = qs.aggregate(
            total=Count("id"),
            note_moyenne=Avg("note_globale"),
            score_ia_moyen=Avg("score_ia"),
        )
        par_statut = list(
            qs.values("statut").annotate(nb=Count("id"))
        )
        return Response({
            **stats,
            "par_statut": par_statut,
        })
