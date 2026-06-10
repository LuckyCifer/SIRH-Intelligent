class EntrepriseMiddleware:
    """
    Injecte l'entreprise courante dans la requête
    à partir du token JWT de l'utilisateur connecté.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.entreprise = None
        if hasattr(request, "user") and request.user.is_authenticated:
            if request.user.entreprise_id:
                request.entreprise = request.user.entreprise
        return self.get_response(request)
