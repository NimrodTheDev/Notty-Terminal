# Generated by Django 5.1.6 on 2025-06-16 10:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('systems', '0013_coin_score'),
    ]

    operations = [
        migrations.AddField(
            model_name='developerscore',
            name='no_rugs_count',
            field=models.IntegerField(default=0),
        ),
    ]
