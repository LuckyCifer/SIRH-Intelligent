from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Vérifie les alertes RH automatiques (contrats expirants, objectifs en retard)"

    def handle(self, *args, **options):
        self._verifier_contrats()
        self._verifier_objectifs()

    def _verifier_contrats(self):
        from contrats.models import Contrat
        from notifications.services import notifier_contrat_expirant

        aujourd_hui = timezone.now().date()
        seuils = [30, 15, 7, 3]

        for contrat in Contrat.objects.filter(statut="ACTIF", date_fin__isnull=False):
            jours = (contrat.date_fin - aujourd_hui).days
            if jours in seuils:
                notifier_contrat_expirant(contrat, jours)
                self.stdout.write(f"  Contrat {contrat.id} — {contrat.employe} — {jours}j restants")

    def _verifier_objectifs(self):
        from objectifs.models import Objectif
        from notifications.services import notifier_objectif_en_retard
        from notifications.models import Notification

        aujourd_hui = timezone.now().date()

        objectifs_retard = Objectif.objects.filter(
            date_echeance__lt=aujourd_hui,
            progression__lt=100,
        )
        for objectif in objectifs_retard:
            deja_notifie = Notification.objects.filter(
                destinataire=objectif.employe,
                categorie="EVALUATION",
                lien="/objectifs",
                created_at__date=aujourd_hui,
            ).exists()
            if not deja_notifie:
                notifier_objectif_en_retard(objectif)
                self.stdout.write(f"  Objectif {objectif.id} — {objectif.employe} — en retard")

        self.stdout.write(self.style.SUCCESS("Vérification des alertes RH terminée."))
