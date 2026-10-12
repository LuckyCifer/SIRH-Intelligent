"""
Isolation entre entreprises (multi-tenancy) — source unique.

Chaque modèle métier est rattaché à une entreprise par un chemin (CHEMINS) :
directement (`entreprise`) ou via l'employé, le stagiaire, l'offre… Le chemin
passe de préférence par l'employé, car le champ `entreprise` d'une ligne peut être
vide lorsqu'une vue a oublié de le renseigner.

Règles :
  - superutilisateur (administrateur de la plateforme) : toutes les entreprises ;
  - tout autre compte : uniquement les données de sa propre entreprise ;
  - une création ou modification ne peut pas viser un objet d'une autre entreprise ;
  - les données de référence partagées (types de congé, périodes, catégories)
    n'ont pas de chemin et restent communes.
"""
from django.apps import apps
from django.db.models import Q
from rest_framework.exceptions import ValidationError

# label de modèle → chemin vers l'entreprise (ou fonction (entreprise_id) → Q)
CHEMINS = {
    "accounts.User":                    "entreprise",
    "entreprises.Entreprise":           "pk",
    "departements.Departement":         "entreprise",
    "departements.Poste":               "entreprise",
    "contrats.Contrat":                 "employe__entreprise",
    "conges.DemandeConge":              "employe__entreprise",
    "conges.SoldeConge":                "employe__entreprise",
    "presences.Pointage":               "employe__entreprise",
    "documents.DocumentRH":             lambda e: (Q(employe__entreprise=e)
                                                   | Q(employe__isnull=True, uploade_par__entreprise=e)),
    "objectifs.Objectif":               "employe__entreprise",
    "objectifs.EvaluationPerformance":  "employe__entreprise",
    "paie.BulletinPaie":                "employe__entreprise",
    "paie.VirementMobile":              "employe__entreprise",
    "sanctions.Sanction":               "employe__entreprise",
    "formations.Formation":             "entreprise",
    "formations.InscriptionFormation":  "employe__entreprise",
    "formations.CompetenceAcquise":     "employe__entreprise",
    "carriere.EvenementCarriere":       "employe__entreprise",
    "recrutements.OffreEmploi":         "entreprise",
    "recrutements.Candidature":         "offre__entreprise",
    "recrutements.Entretien":           "candidature__offre__entreprise",
    "rapports.RapportHebdomadaire":     "stagiaire__entreprise",
    "analyse_ia.AnalyseIA":             "rapport__stagiaire__entreprise",
    "rapport_ia.RapportIAMensuel":      "entreprise",
    "notifications.Notification":       "destinataire__entreprise",
    "stagiaires.StagePeriode":          "stagiaire__entreprise",
    "stagiaires.ProjetSoutenance":      "stagiaire__entreprise",
}


def _condition(model, entreprise_id):
    chemin = CHEMINS.get(model._meta.label)
    if chemin is None:
        return None
    if callable(chemin):
        return chemin(entreprise_id)
    return Q(**{chemin: entreprise_id})


def sans_restriction(user):
    return bool(getattr(user, "is_superuser", False))


def filtrer_par_entreprise(qs, user):
    """Restreint un queryset à l'entreprise de l'utilisateur."""
    if sans_restriction(user):
        return qs
    condition = _condition(qs.model, getattr(user, "entreprise_id", None))
    return qs if condition is None else qs.filter(condition)


def meme_entreprise(user, objet):
    """L'objet (instance de modèle) appartient-il à l'entreprise de l'utilisateur ?"""
    if objet is None or sans_restriction(user) or not hasattr(objet, "_meta"):
        return True
    condition = _condition(type(objet), getattr(user, "entreprise_id", None))
    if condition is None:
        return True
    return type(objet)._default_manager.filter(condition, pk=objet.pk).exists()


def verifier_cibles(user, donnees):
    """Refuse toute relation (employé, offre, département…) vers une autre entreprise."""
    for champ, valeur in (donnees or {}).items():
        valeurs = valeur if isinstance(valeur, (list, tuple)) else [valeur]
        for v in valeurs:
            if hasattr(v, "_meta") and not meme_entreprise(user, v):
                raise ValidationError({champ: "Cet élément appartient à une autre entreprise."})


def rattacher(user, instance):
    """Renseigne le champ `entreprise` d'un objet créé, s'il existe et qu'il est vide."""
    if instance is None or not getattr(user, "entreprise_id", None):
        return
    noms = {f.name for f in instance._meta.get_fields()}
    if "entreprise" in noms and getattr(instance, "entreprise_id", None) is None \
            and instance._meta.label != "accounts.User":
        type(instance)._default_manager.filter(pk=instance.pk).update(entreprise_id=user.entreprise_id)
        instance.entreprise_id = user.entreprise_id


class IsolationEntrepriseMixin:
    """
    À placer en PREMIER dans les bases d'une vue DRF :
        class ContratViewSet(IsolationEntrepriseMixin, viewsets.ModelViewSet)
    - filter_queryset (et get_queryset) filtrés : listes et détails limités à
      l'entreprise (404 sinon) ;
    - create/update : relations vers une autre entreprise refusées, y compris un
      identifiant `employe`/`stagiaire` lu brut par la vue ; objet créé rattaché.
    Le contrôle est fait dans create/update (et non perform_*) car de nombreuses vues
    redéfinissent perform_create, qui passerait alors avant le mixin.
    """
    CHAMPS_PERSONNE = ("employe", "stagiaire")

    def get_queryset(self):
        return filtrer_par_entreprise(super().get_queryset(), self.request.user)

    def filter_queryset(self, queryset):
        # Point d'application principal : DRF l'appelle pour les listes ET pour get_object()
        # (détail, modification, suppression, actions détaillées). Les vues redéfinissent
        # souvent get_queryset sans appeler super(), mais jamais filter_queryset.
        return filtrer_par_entreprise(super().filter_queryset(queryset), self.request.user)

    def _verifier_requete(self, serializer):
        user = self.request.user
        verifier_cibles(user, serializer.validated_data)
        from accounts.models import User
        for champ in self.CHAMPS_PERSONNE:
            valeur = self.request.data.get(champ) if hasattr(self.request.data, "get") else None
            if valeur in (None, ""):
                continue
            personne = User.objects.filter(pk=valeur).first() if str(valeur).isdigit() else None
            if personne is not None and not meme_entreprise(user, personne):
                raise ValidationError({champ: "Cet élément appartient à une autre entreprise."})

    def create(self, request, *args, **kwargs):
        from rest_framework import status
        from rest_framework.response import Response
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self._verifier_requete(serializer)
        self.perform_create(serializer)
        rattacher(request.user, serializer.instance)
        return Response(serializer.data, status=status.HTTP_201_CREATED,
                        headers=self.get_success_headers(serializer.data))

    def update(self, request, *args, **kwargs):
        from rest_framework.response import Response
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self._verifier_requete(serializer)
        self.perform_update(serializer)
        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}
        return Response(serializer.data)
