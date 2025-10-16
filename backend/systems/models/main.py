from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone

# integrate the score directly into the models
class SolanaUserManager(BaseUserManager):
    """Manager for users authenticated with Solana wallets"""

    def create_user(self, wallet_address, password=None, **extra_fields):
        if not wallet_address:
            raise ValueError("Users must have a wallet address")

        user = self.model(wallet_address=wallet_address, **extra_fields)

        if user.is_staff or user.is_superuser:
            if not password:
                raise ValueError("Admins must have a password")
            user.set_password(password)
        else:
            user.set_unusable_password()  # Normal users don't have passwords

        user.save(using=self._db)
        return user

    def create_superuser(self, wallet_address, password, **extra_fields):
        """Creates a superuser with a password"""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if not password:
            raise ValueError("Superuser must have a password")

        return self.create_user(wallet_address, password, **extra_fields)

class SolanaUser(AbstractUser):
    """User model for Solana wallet authentication"""
    username = None  # Remove username
    email = None  # Remove email
    first_name = None
    last_name = None
    wallet_address = models.CharField(max_length=44, unique=True, primary_key=True)
    display_name = models.CharField(max_length=150, blank=True)
    bio = models.TextField(blank=True)
    # following
    # followers
    # coins_created

    USERNAME_FIELD = "wallet_address"
    REQUIRED_FIELDS = []

    objects = SolanaUserManager()

    def get_display_name(self):
        """Returns the display name if available, otherwise returns wallet address"""
        return self.display_name if self.display_name else self.wallet_address

    def __str__(self):
        return self.wallet_address
    
    @property
    def devscore(self): # corrrect it later
        """Dynamically retrieve and recalculate the developer score."""
        if hasattr(self, 'developer_score'):
            if self.developer_score.is_active:
                return self.developer_score.score
        return 0  # Default base score if no score record exists
    
    @property
    def tradescore(self):
        """Dynamically retrieve and recalculate the trade score."""
        if hasattr(self, 'trader_score'):
            return self.trader_score.score
        return 150  # Default base score if no score record exists

class Coin(models.Model): # we have to store the ath
    """Represents a coin on the platform"""
    address = models.CharField(primary_key=True, max_length=44, unique=True, editable=True)#False)
    name = models.CharField(max_length=100)
    creator = models.ForeignKey(SolanaUser, on_delete=models.CASCADE, related_name='coins', to_field="wallet_address")
    created_at = models.DateTimeField(auto_now_add=True)
    total_supply = models.DecimalField(max_digits=32, decimal_places=9)
    image_url = models.URLField(max_length=500)
    ticker = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    discord = models.CharField(max_length=255, blank=True, null=True)
    website = models.URLField(max_length=255, blank=True, null=True)
    twitter = models.CharField(max_length=255, blank=True, null=True)
    score = models.IntegerField(default=150)
    decimals = models.SmallIntegerField(default= 9)
    current_marketcap = models.DecimalField(max_digits=32, decimal_places=9)
    start_marketcap = models.DecimalField(max_digits=32, decimal_places=9)
    end_marketcap = models.DecimalField(max_digits=32, decimal_places=9)
    change = models.DecimalField(max_digits=16, decimal_places=4, default=0)
    migrated = models.BooleanField(default= False)
    raydium_pool = models.CharField(max_length=44, null= True)
    migration_timestamp = models.DateTimeField(null=True)
    current_price = models.DecimalField(max_digits=24, decimal_places=10, default=0)
    ath = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    updated = models.DateTimeField(default=timezone.now)
    total_held = models.DecimalField(max_digits=32, decimal_places=9, default=0)
    # figure out trade volume

    def __str__(self):
        return f"{self.name} ({self.ticker})"
    
    def save(self, *args, **kwargs):
        if self.ticker:
            self.ticker = self.ticker.upper()  # Ensure it's always uppercase
        if self._state.adding or self.ath is None:
            self.ath = self.current_price
        else:
            self.ath = max(self.ath, self.current_price)
        super().save(*args, **kwargs)

    @property
    def bonding_curve(self):
        """Calculates bonding curve: (Current Marketcap - Start Marketcap) / (End Marketcap - Start Marketcap) * 100"""
        return (float(self.current_marketcap - self.start_marketcap) / 
            float(self.end_marketcap - self.start_marketcap)) * 100
    
    @property
    def liquidity(self):
        return (self.total_held * self.current_price)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            # Composite index: first filter by creator, then sort by created_at DESC
            models.Index(fields=['creator', '-created_at'], name='idx_creator_created_at')
        ]

class UserCoinHoldings(models.Model):
    """Tracks how much of a specific coin a user holds"""
    user = models.ForeignKey(SolanaUser, on_delete=models.CASCADE, related_name="holdings", to_field="wallet_address", db_index=True)
    coin = models.ForeignKey(Coin, on_delete=models.CASCADE, related_name="holders", to_field="address")
    amount_held = models.DecimalField(max_digits=20, decimal_places=8, default=0) # add a way to check if the holdings is above the availiable coins

    class Meta:
        unique_together = ('user', 'coin')  # Ensures a user can't have duplicate records for the same coin
        indexes = [
            models.Index(fields=['user', 'coin']),
            models.Index(fields=['user']),  # for filtering
        ]
    
    def held_percentage(self):
        return (self.amount_held / self.coin.total_supply) * 100

    def __str__(self):
        return f"{self.user.wallet_address} holds {self.held_percentage()}% of {self.coin.ticker}" # i added %

class Trade(models.Model): # change to transaction hash
    TRADE_TYPES = [
        ('BUY', 'Buy'),
        ('SELL', 'Sell'),
        ('COIN_CREATE', 'Coin Creation'),
    ]

    transaction_hash = models.CharField(max_length=88, primary_key=True, unique= True, editable= True)#False)
    user = models.ForeignKey(SolanaUser, on_delete=models.CASCADE, related_name='trades', to_field="wallet_address")
    coin = models.ForeignKey(Coin, on_delete=models.CASCADE, related_name='trades', to_field="address")
    trade_type = models.CharField(max_length=14, choices=TRADE_TYPES)
    coin_amount = models.DecimalField(max_digits=24, decimal_places=9)
    sol_amount = models.DecimalField(max_digits=24, decimal_places=9)
    created_at = models.DateTimeField(default=timezone.now)
    trading_fee = models.DecimalField(max_digits=24, decimal_places=9, default=0)

    def __str__(self):
        return f"{self.get_trade_type_display()} Trade by {self.user.get_display_name()} on {self.coin.ticker}, created_at {self.created_at}"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['coin']),
            models.Index(fields=['created_at']),
        ]
