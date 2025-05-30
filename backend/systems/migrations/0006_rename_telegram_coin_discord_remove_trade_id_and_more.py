# Generated by Django 5.1.6 on 2025-05-10 21:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('systems', '0005_alter_coin_name'),
    ]

    operations = [
        migrations.RenameField(
            model_name='coin',
            old_name='telegram',
            new_name='discord',
        ),
        migrations.RemoveField(
            model_name='trade',
            name='id',
        ),
        migrations.AddField(
            model_name='trade',
            name='transaction_hash',
            field=models.CharField(default=0, editable=False, max_length=88, primary_key=True, serialize=False, unique=True),
            preserve_default=False,
        ),
    ]
