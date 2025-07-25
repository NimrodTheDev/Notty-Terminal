# Generated by Django 5.1.6 on 2025-07-05 12:15

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('systems', '0026_traderhistory'),
    ]

    operations = [
        migrations.AlterField(
            model_name='coinhistory',
            name='coin',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='coin_history', to='systems.coin'),
        ),
        migrations.AlterField(
            model_name='traderhistory',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='trader_history', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='traderscore',
            name='flash_pnd_last_check',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
