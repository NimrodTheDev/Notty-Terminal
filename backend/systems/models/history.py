from django.db import models
from .main import SolanaUser, Coin

class History(models.Model):
    key = models.CharField(max_length=88)
    score = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField()

    def __str__(self):
        return f"History created at {self.created_at} {self.key} {self.score}"
    
    class Meta:
        abstract = True
    
class TraderHistory(History):
    user = models.ForeignKey(
        SolanaUser, on_delete=models.CASCADE, 
        related_name='trader_history', to_field="wallet_address"
    )

    class Meta:
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['key']),
        ]

class CoinHistory(History):
    coin = models.ForeignKey(
        Coin, on_delete=models.CASCADE, 
        related_name='coin_history', to_field="address"
    )

    class Meta:
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['key']),
        ]
