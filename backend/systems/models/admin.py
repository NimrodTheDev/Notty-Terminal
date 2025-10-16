from django.db import models

class PriceApi(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    sol_price = models.DecimalField(max_digits=20, decimal_places=8, default=150)

    def save(self, *args, **kwargs):
        self.id = 1  # Ensure singleton
        super().save(*args, **kwargs)