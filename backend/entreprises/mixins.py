class EntrepriseFilterMixin:
    """
    Mixin à ajouter à tous les ViewSets pour filtrer
    automatiquement par entreprise de l'utilisateur connecté.
    """

    def get_queryset(self):
        qs = super().get_queryset()
        entreprise = getattr(self.request, "entreprise", None)
        if not entreprise:
            return qs
        model = qs.model
        field_names = {f.name for f in model._meta.get_fields()}
        if "entreprise" in field_names:
            return qs.filter(entreprise=entreprise)
        if "employe" in field_names:
            return qs.filter(employe__entreprise=entreprise)
        return qs

    def perform_create(self, serializer):
        entreprise = getattr(self.request, "entreprise", None)
        model = serializer.Meta.model
        field_names = {f.name for f in model._meta.get_fields()}
        if entreprise and "entreprise" in field_names:
            serializer.save(entreprise=entreprise)
        else:
            serializer.save()
