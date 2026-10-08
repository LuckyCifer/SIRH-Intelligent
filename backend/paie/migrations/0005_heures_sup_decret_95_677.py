"""
Heures supplémentaires conformes au décret n° 95/677/PM, art. 12 :
+20 % (heures 1-8), +30 % (9-16), +40 % (17-20 et dimanche), +50 % (nuit, urgence).

Le champ « nb_heures_sup_25 » est renommé « nb_heures_sup_20 » : les heures déjà
saisies sont conservées et rattachées à la première tranche.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("paie", "0004_virementmobile"),
    ]

    operations = [
        migrations.RenameField(
            model_name="bulletinpaie",
            old_name="nb_heures_sup_25",
            new_name="nb_heures_sup_20",
        ),
        migrations.AlterField(
            model_name="bulletinpaie",
            name="nb_heures_sup_20",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=6,
                                      help_text="Heures 1 à 8 de la semaine (+20 %)"),
        ),
        migrations.AddField(
            model_name="bulletinpaie",
            name="nb_heures_sup_30",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=6,
                                      help_text="Heures 9 à 16 (+30 %)"),
        ),
        migrations.AlterField(
            model_name="bulletinpaie",
            name="nb_heures_sup_40",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=6,
                                      help_text="Heures 17 à 20 et heures sup. du dimanche (+40 %)"),
        ),
        migrations.AddField(
            model_name="bulletinpaie",
            name="nb_heures_sup_50",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=6,
                                      help_text="Heures sup. de nuit, urgence/force majeure (+50 %)"),
        ),
    ]
