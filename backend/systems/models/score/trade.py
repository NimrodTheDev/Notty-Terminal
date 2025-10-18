from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal
from systems.utils.logger import log_trader_history, TraderKey
from ..main import *
from .score import DRCScore

class TraderScore(DRCScore):
    """
    Trader reputation score tracking for Solana users who trade coins
    """
    trader = models.OneToOneField(SolanaUser, on_delete=models.CASCADE, 
                                 related_name='trader_score',
                                 to_field="wallet_address")

    total_portfolio_growth_per_month = models.DecimalField(default= 0.0, max_digits=24, decimal_places=10)
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

# Calculate volume
# volume = sum(t.sol_amount for t in recent_trades)
# coin_score.trade_volume_24h = volume
# coin_score.save(update_fields=['trade_volume_24h', 'updated_at'])