from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal
from systems.utils.logger import log_trader_history, TraderKey

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
            return self.developer_score.recalculate_score()
        return 0  # Default base score if no score record exists
    
    @property
    def tradescore(self):
        """Dynamically retrieve and recalculate the trade score."""
        if hasattr(self, 'trader_score'):
            return self.trader_score.recalculate_score()
        return 150  # Default base score if no score record exists

class PriceApi(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    sol_price = models.DecimalField(max_digits=20, decimal_places=8, default=150)

    def save(self, *args, **kwargs):
        self.id = 1  # Ensure singleton
        super().save(*args, **kwargs)

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
    price_per_token = models.BigIntegerField(default= 25) # will be eventually removed
    current_marketcap = models.DecimalField(max_digits=32, decimal_places=9)
    start_marketcap = models.DecimalField(max_digits=32, decimal_places=9)
    end_marketcap = models.DecimalField(max_digits=32, decimal_places=9)
    change = models.DecimalField(max_digits=16, decimal_places=4, default=0)

    current_price = models.DecimalField(max_digits=24, decimal_places=10, default=0)  # Added price field # start calculating
    ath = models.DecimalField(max_digits=20, decimal_places=8, default=0) # will work like coin to store the highest

    def __str__(self):
        return f"{self.name} ({self.ticker})"
    
    def save(self, *args, **kwargs):
        if self.ticker:
            self.ticker = self.ticker.upper()  # Ensure it's always uppercase
        super().save(*args, **kwargs)

    @property
    def total_held(self):
        """Returns the total amount of this coin held by all users."""
        from django.db.models import Sum
        total = self.holders.aggregate(total=Sum('amount_held'))['total']
        return total or 0  # Return 0 if no holdings exist

    @property
    def market_cap(self):
        """Calculates market cap: (Total Supply - Total Held) * Current Price"""
        return self.total_held * self.current_price#(self.total_supply - self.total_held) * self.current_price
    
    @property
    def liquidity(self):
        return (self.total_held * self.current_price)

    class Meta:
        ordering = ['-created_at']

class UserCoinHoldings(models.Model):
    """Tracks how much of a specific coin a user holds"""
    user = models.ForeignKey(SolanaUser, on_delete=models.CASCADE, related_name="holdings", to_field="wallet_address")
    coin = models.ForeignKey(Coin, on_delete=models.CASCADE, related_name="holders", to_field="address")
    amount_held = models.DecimalField(max_digits=20, decimal_places=8, default=0) # add a way to check if the holdings is above the availiable coins

    class Meta:
        unique_together = ('user', 'coin')  # Ensures a user can't have duplicate records for the same coin
    
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
    coin_amount = models.DecimalField(max_digits=20, decimal_places=10)
    sol_amount = models.DecimalField(max_digits=20, decimal_places=10)
    created_at = models.DateTimeField(auto_now_add=True)#default=timezone.now)

    def __str__(self):
        return f"{self.get_trade_type_display()} Trade by {self.user.get_display_name()} on {self.coin.ticker}, created_at {self.created_at}"

    class Meta:  # error here ordering should be latest trades first
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['coin']),
            models.Index(fields=['created_at']),
        ]

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

# drc stuffs
class DRCScore(models.Model):
    """Base model for DRC scoring with common fields"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    score = models.IntegerField(default=150)
    last_monthly_update = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        abstract = True
    
    @property
    def rank(self):
        match self.score:
            case x if x < 150:
                return 1
            case x if x < 500:
                return 2
            case x if x < 1000:
                return 3
            case x if x < 2000:
                return 4
            case x if x >= 2000:
                return 5

# fix some parts
class CoinDRCScore(DRCScore):
    """
    DRC score for individual coins, combining developer reputation, 
    market metrics and contract security
    """
    coin = models.OneToOneField(
        Coin, 
        on_delete=models.CASCADE, 
        related_name='drc_score',
        to_field="address"
    )
    
    # Market metrics
    holders_count = models.IntegerField(default=0)
    age_in_hours = models.IntegerField(default=0)
    max_volume_recorded = models.DecimalField(max_digits=24, decimal_places=8, default=0)
    
    # Price tracking
    price_breakouts_per_month = models.IntegerField(default=0)
    last_recorded_price = models.DecimalField(max_digits=24, decimal_places=8, default=0) # was integer before
    last_price = models.DecimalField(max_digits=24, decimal_places=8, default=0)
    
    # Holder metrics
    holder_retention_months = models.IntegerField(default=0)
    last_recorded_holders = models.IntegerField(default=0)
    last_held_percent = models.DecimalField(max_digits=24, decimal_places=8, default=0)

    # Flags for abandonment detection
    team_abandonment = models.BooleanField(default=False)
    token_abandonment = models.BooleanField(default=False)
    pump_and_dump_activity = models.BooleanField(default=False)
    successful_token = models.BooleanField(default=False)
    
    # Tracking for periodic calculations
    
    last_biweekly_update = models.DateTimeField(auto_now_add=True)
    last_daily_update = models.DateTimeField(null=True, blank=True)    

    class Meta:
        indexes = [
            models.Index(fields=['score']),
            models.Index(fields=['coin']),
            models.Index(fields=['age_in_hours']),
            models.Index(fields=['last_monthly_update']),
            models.Index(fields=['last_biweekly_update']),
            models.Index(fields=['score', 'successful_token']),
            models.Index(fields=['coin', 'last_monthly_update']),
            models.Index(fields=['team_abandonment', 'token_abandonment']),
        ]
    
    def __str__(self):
        return f"DRC Score for {self.coin.name}: {self.score}"
    
    def update_age(self, save=True):
        """Update the age of the coin in hours"""
        if self.coin.created_at:
            self.age_in_hours = int((timezone.now() - self.coin.created_at).total_seconds() / 3600)
            if save:
                self.save(update_fields=['age_in_hours', 'updated_at'])
        return self.age_in_hours

    def update_price_breakouts(self, old_price, new_price, save=True):
        """Detect and record price breakouts (changes exceeding 10%)"""
        if old_price <= 0:
            return
            
        pct_change = abs((new_price - old_price) / old_price)
        
        if pct_change > 0.1:  # 10% breakout threshold
            self.price_breakouts_per_month += 1
            if save:
                self.save(update_fields=['price_breakouts_per_month', 'updated_at'])
    
    def update_holders_count(self, save=True):
        """Update the count of holders for this coin"""
        self.holders_count = self.coin.holders.count()
        if save:
            self.save(update_fields=['holders_count', 'updated_at'])
        return self.holders_count
    
    def daily_checkup(self): # check
        """Perform daily score maintenance tasks"""
        now = timezone.now()
        
        # Skip if already updated today
        if (self.last_daily_update and 
            self.last_daily_update.date() == now.date()):
            return
        
        # Update basic metrics
        self.update_age(save=False)
        self.update_holders_count(save=False)
        
        # Check for price breakouts
        if self.last_price > 0:
            self.update_price_breakouts(
                self.last_price, 
                self.coin.current_price, 
                save=False
            )
        
        # Update last price
        self.last_price = self.coin.current_price
        # Check abandonment conditions
        self._check_dev_dumping(save=False)
        self._check_token_abandonment(save=False)
        self._check_pump_and_dump(save=False)
        
        # Update timestamp
        self.last_daily_update = now
        
        # Save all changes
        self.save(update_fields=[
            'age_in_hours', 'holders_count', 'pump_and_dump_activity',
            'price_breakouts_per_month', 'last_price', 'team_abandonment',
            'token_abandonment', 'score', 'last_daily_update', 'updated_at'
        ])
        
        # Recalculate score with daily factors
        self._apply_daily_score_adjustments()

    def monthly_recalculation(self): # check
        """Perform comprehensive monthly score recalculation"""
        now = timezone.now()
        
        # Skip if already updated this month
        if (self.last_monthly_update and 
            self.last_monthly_update.month == now.month and
            self.last_monthly_update.year == now.year):
            return
        
        # Calculate monthly factors
        fair_trading_bonus = self._calculate_fair_trading_bonus()
        price_growth_bonus = self._calculate_price_growth_bonus()
        retention_bonus = self._calculate_retention_bonus(False)
        self.check_for_success()
        
        # Apply bonuses
        total_bonus = (
            fair_trading_bonus + 
            price_growth_bonus + 
            retention_bonus
        )
        
        # Cap the bonus to prevent excessive score inflation
        capped_bonus = min(total_bonus, 300)
        self.score = max(0, self.score + int(capped_bonus))
        
        # Reset monthly counters
        self._reset_monthly_counters()
        
        # Update timestamp
        self.last_monthly_update = now
        
        self.save(update_fields=[
            'score', 'price_breakouts_per_month', 'last_recorded_price',
            'last_recorded_holders', 'holder_retention_months',
            'last_monthly_update', 'updated_at'
        ])

    def biweekly_checkup(self): # check
        """Perform bi-weekly score maintenance and holder quality assessment"""
        now = timezone.now()
        
        # Skip if already updated this bi-weekly period
        if self._is_same_period(self.last_biweekly_update, now, 14):
            return
        
        holder_rank_bonus = self._calculate_holder_rank_bonus()
        # Apply bi-weekly bonuses
        total_biweekly_bonus = (
            holder_rank_bonus
        )
        
        # Cap the bi-weekly bonus
        capped_bonus = min(total_biweekly_bonus, 50)
        self.score = max(0, self.score + int(capped_bonus))
        
        self._update_biweekly_metrics()
        
        # Update timestamp
        self.last_biweekly_update = now
        
        self.save(update_fields=[
            'score', 'last_biweekly_update', 'updated_at'
        ])
    
    def _is_same_period(self, last_update, current_time, days_left: int= 1):
        """Check if we're in the same bi-weekly period"""
        if not last_update:
            return False
        
        # Calculate days since last update
        days_diff = (current_time - last_update).days
        
        return days_diff < days_left

    def _calculate_fair_trading_bonus(self):
        cutoff_time = timezone.now() - timezone.timedelta(days=30)
        volume_data = self.coin.trades.filter(
            created_at__gte=cutoff_time
        ).aggregate(
            total_volume=Sum('sol_amount')
        )
        """Calculate bonus for fair trading patterns (low volatility)"""
        if self.price_breakouts_per_month <= 6 and volume_data['total_volume'] != None:  # Max 6 breakouts considered fair
            if volume_data['total_volume'] >= 15:
                return 50 
        return 0

    def _calculate_price_growth_bonus(self):
        """Calculate bonus for sustained price growth"""
        if self.last_recorded_price <= 0:
            return 0
            
        growth_ratio = float(self.coin.liquidity / self.last_recorded_price)
        if 1.5 <= growth_ratio:
            return 50
        return 0

    def _calculate_retention_bonus(self, save=True):
        """Calculate bonus for holder retention"""
        held_bonus = 0
        total_held = UserCoinHoldings.objects.filter(coin=self.coin).aggregate(
            total=models.Sum('amount_held')
        )['total'] or Decimal('0.0')

        # Compute held percentage
        if self.coin.total_supply > 0:
            held_percent = (total_held / self.coin.total_supply) * Decimal('100')
            if held_percent > self.last_held_percent:
                held_bonus = round((held_percent - self.last_held_percent)/Decimal(0.1))
                self.last_held_percent = held_percent
                if save:
                    self.score = max(0, self.score + held_bonus)
                    self.save(update_fields=[
                        'last_held_percent', 'score', 'updated_at'
                    ])
        return held_bonus
    
    def _check_pump_and_dump(self, save=True): # check
        """
        Detect pump and dump patterns over the month:
        - Multiple price breakouts
        - Drop in price or liquidity > 50%
        - Drop in holder count
        - Spike in trade volume
        """
        if (self.pump_and_dump_activity or 
            self.age_in_hours >= (30 * 24)):  # After 1 months
            return
        
        pump_detected = False
        dump_detected = False

        # Check if breakout pattern was too aggressive
        if self.price_breakouts_per_month > 12:
            pump_detected = True

        # Check for price/liquidity dump
        if self.last_recorded_price > 0:
            price_drop_ratio = float(self.coin.current_price / self.last_recorded_price)
            if price_drop_ratio < 0.5:  # Price dropped more than 50%
                dump_detected = True

        if self.last_recorded_holders > 0:
            holder_drop_ratio = self.holders_count / self.last_recorded_holders
            if holder_drop_ratio < 0.5:  # Holder count dropped more than 50%
                dump_detected = True

        # Check trade volume spike
        volume_30d = self.coin.trades.filter(
            created_at__gte=timezone.now() - timezone.timedelta(days=30)
        ).aggregate(total_volume=Sum('sol_amount'))['total_volume'] or 0

        if self.max_volume_recorded > 0 and volume_30d > self.max_volume_recorded * 1.5:
            pump_detected = True

        # Final flag set
        if pump_detected and dump_detected:
            self.pump_and_dump_activity = True
            if save:
                self.score = max(0, self.score - 100)
                self.save(update_fields=[
                    'pump_and_dump_activity', 'score', 'updated_at'
                ])

    def _calculate_holder_rank_bonus(self):
        """Calculate bonus based on holder quality (rank distribution)"""
        if self.holders_count == 0:
            return 0
        
        holders_with_scores = self.coin.holders.select_related(
            'user__trader_score'
        ).prefetch_related('user')
        
        rank_counts = {3: 0, 4: 0, 5: 0}
        total_ranked = 0
        
        for holding in holders_with_scores:
            if hasattr(holding.user, 'trader_score'):
                rank = holding.user.trader_score.rank
                if rank in rank_counts:
                    rank_counts[rank] += 1
                    total_ranked += 1
        
        if total_ranked == 0:
            return 0
        
        # Calculate percentages
        rank_3_pct = rank_counts[3] / total_ranked
        rank_4_pct = rank_counts[4] / total_ranked
        rank_5_pct = rank_counts[5] / total_ranked
        
        if rank_5_pct > 0.5:
            return 50
        elif rank_4_pct > 0.5:
            return 30
        elif rank_3_pct > 0.5:
            return 20
        return 0

    def check_for_success(self):
        if not self.successful_token:
            # Not less than 80% from ath
            # self.age_in_hours >= (30 * 24)) and  self.coin.market_cap >= 100000: # award +100
            if self.coin.holders.all().count() >= 500 and self.coin.market_cap >= 500000:
                if not self.token_abandonment and not self.team_abandonment:
                    self.successful_token = True  

    def _check_dev_dumping(self, save=True):
        """Check if developer has dumped their tokens early"""
        if (self.team_abandonment or 
            self.age_in_hours >= (30 * 24 * 3)):  # After 3 months
            return
        
        try:
            if self.age_in_hours < 24: # a day grace period
                return
            dev_holding = self.coin.holders.get(
                user__wallet_address=self.coin.creator.wallet_address
            )
            dev_percentage = dev_holding.held_percentage()
            
            # Flag as abandoned if dev holds less than 1%
            if dev_percentage < 1.0:
                self.team_abandonment = True
                self.score = max(0, self.score - 100)
                if save:
                    self.save(update_fields=[
                        'team_abandonment', 'score', 'updated_at'
                    ])
        except self.coin.holders.model.DoesNotExist: # hmm
            # Dev has no holdings - definitely abandoned
            self.team_abandonment = True
            self.score = max(0, self.score - 100)
            if save:
                self.save(update_fields=[
                    'team_abandonment', 'score', 'updated_at'
                ])

    def _check_token_abandonment(self, save=True): # inactivity for 2 weeks a little to on good trades # this is sell numbers not acutal amounts
        """Check if token shows signs of abandonment (low activity)"""
        if (self.token_abandonment or 
            self.age_in_hours >= (30 * 24)):  # After 1 month
            return
        
        # Get trade statistics
        total_trades = self.coin.trades.count()
        sell_trades = self.coin.trades.filter(trade_type='SELL').count()
        
        # Token is considered abandoned if:
        # 1. Very few trades (< 20) after reasonable time, OR
        # 2. Sell ratio is too high (> 70%) indicating dump 
        if total_trades < 20 and self.age_in_hours > (7 * 24):  # After 1 week
            self.token_abandonment = True
            self.score = max(0, self.score - 200)
        elif total_trades >= 20 and (sell_trades / total_trades) > 0.7:
            self.token_abandonment = True
            self.score = max(0, self.score - 200)
        
        if self.token_abandonment and save:
            self.save(update_fields=[
                'token_abandonment', 'score', 'updated_at'
            ])

    def _update_biweekly_metrics(self):
        pass
    
    def _apply_daily_score_adjustments(self):
        """Apply daily volume and activity bonuses"""
        fields = ['score', 'updated_at']
        if self.max_volume_recorded < 100:
            volume_data = self.coin.trades.all().aggregate(
                total_volume=Sum('sol_amount')
            )
            volume_recorded = min(volume_data['total_volume'] or Decimal('0'), Decimal('100'))
            volume_bonus = 0
            # Update max volume if exceeded # nonsense
            if self.max_volume_recorded > volume_recorded:
                volume_bonus = volume_recorded - self.max_volume_recorded
                self.max_volume_recorded = volume_recorded
            # Apply bonus
            self.score = max(0, self.score + int(volume_bonus))
            fields = ['score', 'max_volume_recorded', 'updated_at']
        self.save(update_fields=fields)

    def _reset_monthly_counters(self):
        """Reset counters for the new month"""
        self.price_breakouts_per_month = 0
        self.last_recorded_price = self.coin.liquidity # change to current price later
        self.last_recorded_holders = self.holders_count

    def recalculate_score(self):
        """Main entry point for score recalculation"""
        # Ensure we have fresh data
        self.update_age(save=False)
        self.update_holders_count(save=False)
        
        # Apply daily checks if needed
        now = timezone.now()
        if (not self.last_daily_update or 
            self.last_daily_update.date() != now.date()):
            self.daily_checkup()
        
        # Apply bi-weekly checks if needed
        if (not self.last_biweekly_update or 
            not self._is_same_period(self.last_biweekly_update, now, 14)):
            self.biweekly_checkup()

        # Apply monthly recalculation if needed
        if (not self.last_monthly_update or 
            self.last_monthly_update.month != now.month or
            self.last_monthly_update.year != now.year):
            self.monthly_recalculation()
        
        return self.score
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # Sync score to coin
        if self.coin:
            self.coin.score = self.score
            self.coin.save(update_fields=['score'])

class DeveloperScore(DRCScore): # the system will eventually have to leave here
    """
    Developer reputation score tracking for Solana users who create coins
    """
    developer = models.OneToOneField(
        SolanaUser,
        on_delete=models.CASCADE,
        related_name='developer_score',
        to_field="wallet_address"
    )
    
    # new meteric
    successful_launch = models.IntegerField(default=0) # +100 # tricky
    abandoned_projects = models.IntegerField(default=0) # -150 # check in drs score if the token is adandoned
    rug_pull_or_sell_off = models.IntegerField(default=0) # -100 no rug pull + 100 how to check rug pull - coin count
    no_rugs_count = models.IntegerField(default=0) # -100 no rug pull + 100 how to check rug pull - coin count

    class Meta:
        indexes = [
            models.Index(fields=['score']),
            models.Index(fields=['developer']),
        ]
    
    def __str__(self):
        return f"Dev Score for {self.developer.wallet_address}: {self.score}"
    
    def recalculate_score(self): # determining success
        """
        Calculate developer reputation based on their coin creation history
        """
        # Base score starts at 200
        base_score = 150
        
        # Get all coins created by this developer
        self.abandoned_count = self.developer.coins.filter(drc_score__token_abandonment=True).count() * 150 
        # (this is wrong) the recalculation instead it should be, optmized 
        self.rug_pull_or_sell_off_count = self.developer.coins.filter(drc_score__team_abandonment=True).count() *100
        # self.no_rugs_count = self.developer.coins.filter(drc_score__team_abandonment=False).count() *100 # add when discussed
        self.successful_launch_count = self.developer.coins.filter(drc_score__successful_token=True).count() * 200

        # Calculate final score with clamping
        total_score = base_score + self.successful_launch_count -(self.abandoned_count+self.rug_pull_or_sell_off_count)
        self.score = max(total_score, 0)
        self.save(update_fields=[
            'score', 'successful_launch', 'abandoned_projects',
            'no_rugs_count',
            # 'updated_at'
        ])
        
        return self.score
    
    def get_score_breakdown(self) -> dict:
        """
        Returns a dictionary showing the breakdown of how the score was calculated.
        """
        base_score = 150

        # Calculate each factor again (same as in recalculate_score)
        abandoned_count = self.developer.coins.filter(drc_score__token_abandonment=True).count()
        rug_pull_count = self.developer.coins.filter(drc_score__team_abandonment=True).count()
        successful_launch_count = self.developer.coins.filter(drc_score__successful_token=True).count()
        no_rugs_count = self.developer.coins.filter(drc_score__team_abandonment=False).count()

        # Compute individual scores
        abandoned_score = abandoned_count * 150
        rug_pull_score = rug_pull_count * 100
        successful_launch_score = successful_launch_count * 100
        no_rugs_score = no_rugs_count * 100

        total_score = base_score + successful_launch_score - (abandoned_score + rug_pull_score)

        return {
            "base_score": base_score,
            "successful_launches": {
                "count": successful_launch_count,
                "score": successful_launch_score,
            },
            "abandoned_projects": {
                "count": abandoned_count,
                "penalty": abandoned_score,
            },
            "rug_pulls_or_sell_offs": {
                "count": rug_pull_count,
                "penalty": rug_pull_score,
            },
            "no_rug_tokens": {
                "count": no_rugs_count,
                "bonus": no_rugs_score,
            },
            "final_score": max(total_score, 0),
        }

class TraderScore(DRCScore):
    """
    Trader reputation score tracking for Solana users who trade coins
    """
    trader = models.OneToOneField(SolanaUser, on_delete=models.CASCADE, 
                                 related_name='trader_score',
                                 to_field="wallet_address")

    total_portfolio_growth_per_month = models.DecimalField(default= 0.0, max_digits=20, decimal_places=10)
    valid_long_term_holding = models.IntegerField(default=0)
    flash_dumps = models.IntegerField(default=0)
    valid_held_months = models.IntegerField(default=0)
    snipe_dumps = models.IntegerField(default=0)
    snipe_last_check = models.DateTimeField(auto_now=True)
    flash_pnd_last_check = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['score']),
            models.Index(fields=['trader']),
        ]
    
    def __str__(self):
        return f"Trader Score for {self.trader.wallet_address}: {self.score}"
    
    def _check_flash_pump_and_dump(self):
        if self.flash_pnd_last_check and (
        timezone.now() - self.flash_pnd_last_check).total_seconds() < 0.5 * 3600: # clash
            return

        recent_trades = self.trader.trades.filter(
            created_at__gt=self.flash_pnd_last_check # we can give it 2hr in total instead of 3om here and keep check ing only 30 mins
        ).order_by('-created_at')[:20]

        lowest_decimal = Decimal('1e-10')
        suspicious_count = 0

        for trade in recent_trades:
            if trade.trade_type == 'SELL':
                buy_trades = self.trader.trades.filter(
                    coin=trade.coin,
                    trade_type='BUY',
                    created_at__lt=trade.created_at
                ).order_by('-created_at')

                for buy in buy_trades:
                    time_diff = (trade.created_at - buy.created_at).total_seconds() / 3600
                    if time_diff <= 2:
                        price_sell = Decimal(trade.sol_amount) / max(Decimal(trade.coin_amount), lowest_decimal)
                        price_buy = Decimal(buy.sol_amount) / max(Decimal(buy.coin_amount), lowest_decimal)
                        price_diff = price_sell / max(price_buy, lowest_decimal)

                        if price_diff > 2: # above times 2 profit
                            suspicious_count += 1
                            break
                            
        if suspicious_count >= 1:
            self.flash_dumps += (suspicious_count//1)
            self.score -= self.flash_dumps*10
            log_trader_history(self.trader, TraderKey.FLASH_DUMPS, -10*(suspicious_count//1))

        self.save(update_fields=[
            'flash_pnd_last_check', 'flash_dumps', 'score', 'updated_at'
        ])

    def _check_sniping_and_dumping(self):
        if self.snipe_last_check and (
            timezone.now() - self.snipe_last_check).total_seconds() < 8 * 3600:
            return
        
        dump_penalty = 0
        trades = self.trader.trades.filter(
            trade_type='SELL',
            created_at__gte=self.snipe_last_check
        )

        for sell_trade in trades:
            buy = self.trader.trades.filter(
                trade_type='BUY',
                coin=sell_trade.coin,
                created_at__gte=self.snipe_last_check,
                created_at__lt=sell_trade.created_at
            ).order_by('created_at').first()
            if buy:
                coin_age_at_buy = (buy.created_at - buy.coin.created_at).total_seconds() / 3600
                time_held = (sell_trade.created_at - buy.created_at).total_seconds() / 3600
                # Sniped early (<2h) and dumped quickly (<4h)
                if coin_age_at_buy < 2 and time_held < 4:
                    dump_penalty += 10
        if dump_penalty > 0:
            log_trader_history(self.trader, TraderKey.SNIPE_DUMPS, -1*(dump_penalty))
            self.snipe_dumps += dump_penalty / 10
            self.score -= min(dump_penalty, 100)
            self.snipe_last_check = timezone.now()
            self.save(update_fields=[
                'snipe_last_check',
                'score', 'snipe_dumps', 'updated_at',
            ])

    def _check_portfolio_growth(self):
        """
        Checks how much the user's portfolio has grown over the last 30 days.
        """
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        
        trades = self.trader.trades.filter(created_at__gte=thirty_days_ago)
        if not trades.exists():
            return 0
        
        # Estimate SOL value of holdings then vs now
        past_sol_spent = trades.filter(trade_type='BUY').aggregate(Sum('sol_amount'))['sol_amount__sum'] or 0
        current_value = sum([
            h.amount_held * h.coin.current_price for h in self.trader.holdings.select_related('coin').all()
        ])

        if past_sol_spent == 0:
            return 0
        growth_ratio = current_value / past_sol_spent
        self.total_portfolio_growth_per_month += growth_ratio
        # account for negative growth too for now just posive growth not flautuatios
        if growth_ratio >= 3:
            return 50
        elif growth_ratio >= 2: # fix later
            return 25
        return 0

    def _check_long_term_holding(self): 
        # we can give cons score holding them for a least a month and the score could be used to decide if the 
        # holdings is valuable, 1000 drs will be like 90% 500 40% with a 500 + 1000 it satifise the condition or 
        # something like that, also account for if the token is abandoned sha rework abondoned logic
        """
        Rewards long-term holdings:
        \nExcludes abandoned projects and coins no longer held.
        """
        bonus = 0
        coins_held = 0
        for holding in self.trader.holdings.select_related('coin', 'coin__drc_score').all():
            coin = holding.coin
            drc = getattr(coin, 'drc_score', None)

            # Skip if coin is flagged as abandoned or not held
            if not drc or drc.token_abandonment or drc.team_abandonment:
                continue
            if holding.amount_held <= 0:
                continue

            oldest_buy = self.trader.trades.filter(
                coin=coin,
                trade_type='BUY'
            ).order_by('created_at').first()

            if oldest_buy:
                months_held = self.months_since_created(oldest_buy.created_at)
                if months_held >= 1: coins_held += 1 # 1 month of holding # 2months suggested
        if coins_held > 3:
            bonus = 75 # basic for now but will be changed
            self.valid_held_months += 1
        self.valid_long_term_holding = coins_held
        return bonus
    
    def monthly_recalculation(self): # check
        """Perform comprehensive monthly score recalculation"""
        now = timezone.now()
        
        if (self.last_monthly_update and 
            self.last_monthly_update.month == now.month and
            self.last_monthly_update.year == now.year):
            return
        
        protfolio_growth_bonus = self._check_portfolio_growth()
        long_term_holding_bonus = self._check_long_term_holding()
        log_trader_history(self.trader, TraderKey.PORTFOLIO_GROWTH, protfolio_growth_bonus)
        log_trader_history(self.trader, TraderKey.LONG_TERM_HOLDING, long_term_holding_bonus)

        total_bonus = (
            protfolio_growth_bonus+
            long_term_holding_bonus
        )
        
        capped_bonus = min(total_bonus, 125)
        self.score = max(0, self.score + int(capped_bonus))
        self.last_monthly_update = now
        self.save(update_fields=[
            'valid_long_term_holding',
            'total_portfolio_growth_per_month',
            'score', 'last_monthly_update', 'updated_at',
        ])

    def get_score_breakdown(self): # check
        # history for trade
        # Holding tokens long-term	+75 per month
        # Increased portfolio 100%	+20 per month 
        # Increase portfolio 200%>	+50 per month
        # Sniping & dumping within minutes -10 per coin
        # Flash pump-and-dumps -10 per coin
        """Return detailed score breakdown for transparency"""
        months_passed = self.months_since_created()
        return {
            "portfolio_growth": self.total_portfolio_growth_per_month,
            "average_portfolio_growth": self.total_portfolio_growth_per_month/months_passed,
            "valid_long_term_holding": self.valid_long_term_holding,
            "valid_held_months": self.valid_held_months,
            "flash_dumps": self.flash_dumps,
            "snipe_dumps": self.snipe_dumps,
            "total_score": self.score,
            "breakdown_details": [
                {
                    "score_name": "Portfolio Growth",
                    "amount": self.total_portfolio_growth_per_month,
                    "score_description": "+50 for 2x, +25 for 1.5x (monthly)"
                },
                {
                    "score_name": "Average Portfolio Growth",
                    "amount": self.total_portfolio_growth_per_month/months_passed,
                    "score_description": "the average of all portfolio growth"
                },
                {
                    "score_name": "Valid Long-term Holding",
                    "amount": self.valid_long_term_holding,
                    "score_description": "+75 per month held"
                },
                {
                    "score_name": "Valid Held months",
                    "amount": self.valid_held_months,
                    "score_description": "The months with valid holdings"
                },
                {
                    "score_name": "Flash Pump & Dumps",
                    "amount": self.flash_dumps,
                    "score_description": "-10 for 1+ suspicious quick trades"
                },
                {
                    "score_name": "Snipes and Dumps",
                    "amount": self.snipe_dumps,
                    "score_description": "-10 per early snipe and quick dump"
                }
            ]
        }

    def recalculate_score(self):
        # this should happen later the current review system makes things slower not realtime
        self._check_flash_pump_and_dump()
        self._check_sniping_and_dumping()
        self.monthly_recalculation()
        return self.score
    
    def calculate_daily_score(self):
        # this should happen later the current review system makes things slower not realtime
        self._check_flash_pump_and_dump()
        self._check_sniping_and_dumping()
        return self.score

    def months_since_created(self, created_at = None):
        now = timezone.now()
        created = created_at or self.created_at
        # Calculate the number of full months
        months = (now.year - created.year) * 12 + (now.month - created.month)
        # If the current day is less than the created day, subtract 1 (not a full month yet)
        if now.day < created.day:
            months -= 1
        return max(months, 0)
