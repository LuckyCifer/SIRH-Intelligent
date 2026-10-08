"""
Commande Django : initialise les 6 types de congé légaux
conformément au Code du Travail camerounais (Loi n°92/007).

Usage :
    python manage.py initialiser_types_conge
    python manage.py initialiser_types_conge --force   # écrase même les types existants
"""
from django.core.management.base import BaseCommand
from conges.models import TypeConge


TYPES_LEGAUX = [
    {
        "code":    "ANNUEL",
        "nom":     "Congé annuel ordinaire",
        "code_legal": "ANNUEL",
        "jours_par_an": 18,
        "est_paye": True,
        "necessite_justificatif": False,
        "couleur": "#2E74B5",
        "deductible_conge_annuel": True,
        "description": (
            "Art. 89-93 Code du Travail — 1,5 j ouvrable / mois de service. "
            "Majorations : enfants à charge (Art. 90), ancienneté (Art. 91). "
            "Droit acquis après 12 mois (Art. 92). "
            "Allocation = 1/16 du salaire annuel (Art. 93)."
        ),
    },
    {
        "code":    "MATERNITE",
        "nom":     "Congé de maternité",
        "code_legal": "MATERNITE",
        "jours_par_an": 98,
        "est_paye": True,
        "necessite_justificatif": True,
        "couleur": "#E83E8C",
        "deductible_conge_annuel": False,
        "description": (
            "Art. 84 Code du Travail — 14 semaines (98 jours). "
            "6 semaines avant la date présumée de l'accouchement, "
            "8 semaines après."
        ),
    },
    {
        "code":    "MALADIE",
        "nom":     "Congé maladie",
        "code_legal": "MALADIE",
        "jours_par_an": 30,
        "est_paye": True,
        "necessite_justificatif": True,
        "couleur": "#FFC107",
        "deductible_conge_annuel": False,
        "description": (
            "Absence pour incapacité de travail pour raison médicale, "
            "justifiée par un certificat médical délivré par un médecin agréé."
        ),
    },
    {
        "code":    "PERMISSION",
        "nom":     "Permission exceptionnelle d'absence",
        "code_legal": "PERMISSION",
        "jours_par_an": 10,
        "est_paye": True,
        "necessite_justificatif": True,
        "couleur": "#28A745",
        "deductible_conge_annuel": False,
        "description": (
            "Événements familiaux : mariage (3 j), naissance ou adoption (3 j), "
            "décès d'un proche (3 j), etc. Maximum 10 jours par an."
        ),
    },
    {
        "code":    "SYNDICAL",
        "nom":     "Congé syndical",
        "code_legal": "SYNDICAL",
        "jours_par_an": 15,
        "est_paye": False,
        "necessite_justificatif": True,
        "couleur": "#6C757D",
        "deductible_conge_annuel": False,
        "description": (
            "Congé accordé aux représentants syndicaux pour activités syndicales. "
            "Non déduit du congé annuel ordinaire."
        ),
    },
    {
        "code":    "SANS_SOLDE",
        "nom":     "Congé sans solde",
        "code_legal": "SANS_SOLDE",
        "jours_par_an": 30,
        "est_paye": False,
        "necessite_justificatif": False,
        "couleur": "#343A40",
        "deductible_conge_annuel": False,
        "description": (
            "Congé non rémunéré accordé d'un commun accord entre l'employeur "
            "et l'employé. N'affecte pas le solde de congé annuel."
        ),
    },
]


class Command(BaseCommand):
    help = "Initialise les 6 types de congé légaux (Code du Travail camerounais)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Écrase les types existants même si déjà à jour",
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.HTTP_INFO(
                "\n=== Initialisation des types de congé légaux ===\n"
            )
        )
        created = 0
        updated = 0

        for type_data in TYPES_LEGAUX:
            data = dict(type_data)
            code = data.pop("code")

            obj, was_created = TypeConge.objects.update_or_create(
                code=code,
                defaults=data,
            )

            if was_created:
                created += 1
                self.stdout.write(
                    self.style.SUCCESS(f"  + Créé       : {obj.nom} ({obj.jours_par_an}j/an)")
                )
            else:
                updated += 1
                self.stdout.write(f"  ~ Mis à jour : {obj.nom} ({obj.jours_par_an}j/an)")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nTerminé — {created} créé(s), {updated} mis à jour.\n"
            )
        )
