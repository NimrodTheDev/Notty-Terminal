from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal
from systems.utils.logger import log_coin_history, CoinKey
from ..main import Coin, UserCoinHoldings
from .score import DRCScore

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
    max_volume_recorded = models.DecimalField(max_digits=24, decimal_places=9, default=0)
    
    # Price tracking
    price_breakouts_per_month = models.IntegerField(default=0)
    last_recorded_price = models.DecimalField(max_digits=24, decimal_places=9, default=0) # was integer before
    last_price = models.DecimalField(max_digits=24, decimal_places=9, default=0)
    
    # Holder metrics
    holder_retention_months = models.IntegerField(default=0)
    last_recorded_holders = models.IntegerField(default=0)
    last_held_percent = models.DecimalField(max_digits=24, decimal_places=9, default=0)

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
