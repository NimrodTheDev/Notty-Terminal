from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from .models import (
    SolanaUser, Coin, Trade, UserCoinHoldings,
    DeveloperScore, TraderScore, CoinDRCScore
)
from .utils.broadcast import broadcast_coin_created, broadcast_trade_created

# Create scores when users/coins are created
@receiver(post_save, sender=SolanaUser)
def create_user_scores(sender, instance, created, **kwargs):
    """Create DRC scores when a new user is created"""
    if created:
        # Create trader score for all users
        TraderScore.objects.get_or_create(trader=instance)
        
        # If user has coins, create developer score
        if instance.coins.exists():
            DeveloperScore.objects.get_or_create(developer=instance)

@receiver(post_save, sender=Trade)
def update_holdings_and_scores_on_trade(sender, instance, created, **kwargs):
    """
    Update user holdings and all related scores when a trade is created
    """
    if not created:
        # If this is an update to an existing trade, we don't want to process it again
        return
    
    with transaction.atomic():
        user = instance.user
        coin = instance.coin
        
        # Get or create the user's holdings for this coin
        holdings, _ = UserCoinHoldings.objects.get_or_create(
            user=user,
            coin=coin,
            defaults={'amount_held': 0}
        )
        
        if instance.trade_type == 'BUY':
            # Increase the amount held
            holdings.amount_held = F('amount_held') + instance.coin_amount
            holdings.save(update_fields=['amount_held'])
            
        elif instance.trade_type == 'SELL':
            # Decrease the amount held
            holdings.amount_held = F('amount_held') - instance.coin_amount
            holdings.save(update_fields=['amount_held'])
            
        elif instance.trade_type == 'COIN_CREATE':
            # Creator gets the initial supply minus any that might be in circulation
            holdings.amount_held = F('amount_held') + instance.coin_amount
            holdings.save(update_fields=['amount_held'])
        
        # Refresh from database to get the updated value
        holdings.refresh_from_db()
        
        delete_holdings = False
        # If holdings amount is zero or negative, mark for deletion
        if holdings.amount_held <= 0:
            delete_holdings = True
        
        # Update trader score - do this before potentially deleting holdings
        trader_score, _ = TraderScore.objects.get_or_create(trader=user) # I don't think this should be like that.
        
        # Update coin score - track 24h volume
        coin_score, _ = CoinDRCScore.objects.get_or_create(coin=coin)
        
        # Add this trade's volume to 24h volume if it's a buy or sell
        if instance.trade_type in ['BUY', 'SELL']:
            # Get trades from last 24 hours
            one_day_ago = timezone.now() - timezone.timedelta(hours=24)
            recent_trades = Trade.objects.filter(
                coin=coin,
                created_at__gte=one_day_ago
            )
            
            # Calculate volume
            # volume = sum(t.sol_amount for t in recent_trades)
            # coin_score.trade_volume_24h = volume
            # coin_score.save(update_fields=['trade_volume_24h', 'updated_at'])
        
        # If this is a coin creation, update developer score
        if instance.trade_type == 'COIN_CREATE':
            dev_score, _ = DeveloperScore.objects.get_or_create(developer=coin.creator)
            dev_score.recalculate_score()
        
        # Now delete the holdings if necessary
        if delete_holdings:
            holdings.delete()
        
        # Update holders count and recalculate scores
        coin_score.update_holders_count()
        trader_score.calculate_daily_score()
        broadcast_trade_created(instance)

@receiver(post_save, sender=Coin)
def create_coin_drc_score(sender, instance, created, **kwargs): # making the score realtime
    """
    Create a DRC score record when a new coin is created
    """
    if created:
        # Create coin DRC score
        score, _ = CoinDRCScore.objects.get_or_create(coin=instance)
        # score.last_recorded_price = instance.liquidity # there should be a starting price
        # score.recalculate_score() # remove this because the score is in daily
        
        # Get or create developer score for the coin creator
        dev_score, _ = DeveloperScore.objects.get_or_create(developer=instance.creator)
        dev_score.recalculate_score()
        broadcast_coin_created(instance)

@receiver(post_delete, sender=UserCoinHoldings)
def update_on_holdings_delete(sender, instance, **kwargs):
    """Update scores when holdings are deleted (e.g. when amount becomes zero)"""
    # This handles cases where holdings might be deleted outside of trade context
    
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

# Update price stability on price changes
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
