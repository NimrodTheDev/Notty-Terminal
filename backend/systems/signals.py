from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.db import transaction
from django.db.models import F, Value
from django.db.models.functions import Greatest
from django.utils import timezone
from .models import (
    SolanaUser, Coin, Trade, UserCoinHoldings,
    DeveloperScore, TraderScore, CoinDRCScore
)
from .utils.broadcast import broadcast_coin_created, broadcast_trade_created

@receiver(post_save, sender=SolanaUser)
def create_user_scores(sender, instance, created, **kwargs):
    """Create DRC scores when a new user is created"""
    if created:
        # Create trader score for all users
        TraderScore.objects.create(trader=instance)
        DeveloperScore.objects.create(developer=instance)

def update_total_held_on_save(delta, coin):
    """
    Adjust total_held based on the change in this Holding's amount.
    Atomic and race-condition safe.
    """
    update_data = {}
    if delta != 0:
        update_data['total_held'] = F('total_held') + delta

    # Use DB's GREATEST function for atomic ATH update
    update_data['ath'] = Greatest(F('ath'), Value(coin.current_price))

    Coin.objects.filter(pk=coin.pk).update(**update_data)

@receiver(post_save, sender=Trade) # i feel a lot happens in the creation af trades 
def update_holdings_and_scores_on_trade(sender, instance: Trade, created, **kwargs):
    """
    Update user holdings and all related scores when a trade is created.
    """
    if not created:
        return  # Avoid reprocessing
    # can't we use instance.prefetch its an extra call but?
    with transaction.atomic():
        user = instance.user
        coin = instance.coin

        # Update market cap (atomic)
        sol_price = instance.sol_amount * (-1 if instance.trade_type == 'SELL' else 1)
        Coin.objects.filter(pk=coin.pk).update(
            current_marketcap=F('current_marketcap') + sol_price, 
            change=F('change')+instance.sol_amount # improve change
        )
        coin.refresh_from_db(fields=['current_marketcap', 'change']) # test 

        # Get or create user's holdings for this coin
        holdings, _ = UserCoinHoldings.objects.get_or_create(
            user=user,
            coin=coin,
            defaults={'amount_held': 0}
        )

        # Determine delta for holdings
        delta = instance.coin_amount if instance.trade_type in ('BUY', 'COIN_CREATE') else -instance.coin_amount

        if delta != 0:
            UserCoinHoldings.objects.filter(pk=holdings.pk).update(amount_held=F('amount_held') + delta)

        # Increment total_held atomically
        update_total_held_on_save(delta, coin)

        # Refresh holdings from DB
        holdings.refresh_from_db() # why is are we refreshing and also how does that affect the holdings

        delete_holdings = False
        # If holdings amount is zero or negative, mark for deletion
        if holdings.amount_held <= 0:
            delete_holdings = True
        
        # i think we should reove from atomic
        # Update trader score - do this before potentially deleting holdings
        trader_score = TraderScore.objects.get(trader=user) # I don't think this should be like that.
        
        # Update coin score - track 24h volume
        coin_score = CoinDRCScore.objects.get(coin=coin)
        
        # Now delete the holdings if necessary
        if delete_holdings:
            holdings.delete()
        
        # a way to check the coin holders faster or handel outside
        # Update holders count and recalculate scores
        coin_score.update_holders_count()
        # this calculation is heavy and should be done some where else
        trader_score.calculate_daily_score() # should this be in the atomic 
        broadcast_trade_created(instance)

@receiver(post_save, sender=Coin) # on create coin create developer score
def create_coin_drc_score(sender, instance, created, **kwargs): # making the score realtime
    """
    Create a DRC score record when a new coin is created
    """
    if created:
        # Create coin DRC score
        score = CoinDRCScore.objects.create(coin=instance)
        # score.last_recorded_price = instance.liquidity # there should be a starting price
        # score.recalculate_score() # remove this because the score is in daily
        
        DeveloperScore.objects.filter(developer=instance.creator, is_active=False).update(is_active=True)
        broadcast_coin_created(instance)

@receiver(post_delete, sender=UserCoinHoldings)
def update_on_holdings_delete(sender, instance, **kwargs):
    """Update scores when holdings are deleted (e.g. when amount becomes zero)"""
    # This handles cases where holdings might be deleted outside of trade context
    coin = instance.coin
    coin.total_held -= instance.amount_held
    coin.save(update_fields=['total_held'])
    # Update coin score holders count
    try:
        coin_score:CoinDRCScore = instance.coin.drc_score
        coin_score.update_holders_count()
        # coin_score.recalculate_score() # change to support ore scaled growth
    except CoinDRCScore.DoesNotExist:
        pass
   
    # Update trader score
    try:
        trader_score:TraderScore = instance.user.trader_score
        trader_score.calculate_daily_score() # change to support ore scaled growth
    except TraderScore.DoesNotExist:
        pass

def update_price_stability(coin, new_price):
    """Update price stability score when price changes"""
    coin_score, _ = CoinDRCScore.objects.get_or_create(coin=coin)
    
    # Get historical trades from last 24 hours
    one_day_ago = timezone.now() - timezone.timedelta(hours=24)
    recent_trades = Trade.objects.filter(
        coin=coin,
        created_at__gte=one_day_ago
    ).order_by('created_at')
    
    if recent_trades.count() >= 3:
        # Calculate price stability based on volatility
        prices = [t.sol_amount / t.coin_amount for t in recent_trades if t.coin_amount > 0]
        if new_price > 0:
            prices.append(new_price)
        
        if prices:
            # Calculate standard deviation as % of mean
            mean_price = sum(prices) / len(prices)
            if mean_price > 0:
                variance = sum((p - mean_price) ** 2 for p in prices) / len(prices)
                std_dev = variance ** 0.5
                volatility = (std_dev / mean_price) * 100
                
                # Convert volatility to stability score (inverse relationship)
                # Lower volatility = higher stability score
                stability = max(0, min(100, 100 - volatility))
                coin_score.price_stability_score = int(stability)
                coin_score.save(update_fields=['price_stability_score', 'updated_at'])
                
                # Recalculate coin score
                coin_score.recalculate_score()
