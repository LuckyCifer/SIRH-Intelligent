"""
Art. 89 al. 4 du Code du travail : les permissions exceptionnelles pour événements
familiaux (10 jours par an) ne sont PAS déductibles du congé annuel.
Corrige le type « EVENEMENT » créé par d'anciennes données de démo avec les valeurs
par défaut (code légal ANNUEL, déductible).
"""
from django.db import migrations


def corriger(apps, schema_editor):
    TypeConge = apps.get_model("conges", "TypeConge")
    TypeConge.objects.filter(code="EVENEMENT").update(
        code_legal="PERMISSION", deductible_conge_annuel=False,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("conges", "0005_demandeconge_derogation_par_and_more"),
    ]

    operations = [
        migrations.RunPython(corriger, migrations.RunPython.noop),
    ]
