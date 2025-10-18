from systems.models import (
    DeveloperScore, TraderScore, 
    CoinDRCScore, Trade, PriceApi
)
from systems.permissions import IsCronjobRequest

from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Count, Q, Exists, OuterRef
from rest_framework.views import APIView

from django.contrib.auth import get_user_model
from django.utils.timezone import now
from django.core.cache import cache

from rest_framework.response import Response
from rest_framework.views import APIView
# from rest_framework.permissions import AllowAny

from datetime import timedelta
import requests
from decimal import Decimal

User = get_user_model()

class UpdateSolPriceView(APIView): # cron job
    permission_classes = [IsCronjobRequest]

    def post(self, request):
        instance, _ = PriceApi.objects.get_or_create(id=1)

        if instance.updated_at > now() - timedelta(minutes=4):
            return Response({"detail": "Price already fresh."})

        try:
            response = requests.get(
                "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
                timeout=2
            )
            print(response)
            response.raise_for_status()
            instance.sol_price = Decimal(response.json()["solana"]["usd"])
            instance.save()
            return Response({"detail": "Updated", "sol_price": str(instance.sol_price)})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class RecalculateDailyScoresView(APIView):
    permission_classes = [IsCronjobRequest]

    def post(self, request):
        now = timezone.now()
        one_month_ago = now - timedelta(days=30)
        
        # === CoinDRCScore Recalculation ===
        # Only recalculate coins that meet ALL criteria:
        # 1. DRS score > 0
        # 2. Created within the last month OR has recent trades
        # 3. Has at least one unique trader in the past month
        
        # Subquery to check for recent trades
        recent_trades = Trade.objects.filter(
            coin=OuterRef('coin'),
            created_at__gte=one_month_ago
        )
        
        # Filter coins with activity
        active_coins = CoinDRCScore.objects.select_related('coin').filter(
            score__gt=0  # Exclude coins with zero DRS
        ).annotate(
            has_recent_trades=Exists(recent_trades)
        ).filter(
            Q(coin__created_at__gte=one_month_ago) |  # Created recently
            Q(has_recent_trades=True)  # OR has recent trading activity
        )
        
        # Further filter by unique traders in the past month
        coins_to_recalc = []
        for drc in active_coins:
            unique_traders = Trade.objects.filter(
                coin=drc.coin,
                created_at__gte=one_month_ago
            ).values('user').distinct().count()
            
            if unique_traders > 0:
                coins_to_recalc.append(drc)
        
        # Recalculate scores
        for drc in coins_to_recalc:
            drc.recalculate_score()
        
        # === DeveloperScore Recalculation ===
        # Only recalculate developers who:
        # 1. Are active (is_active=True)
        # 2. Have developer score > 0
        
        for dev_score in DeveloperScore.objects.filter(
            is_active=True,
            score__gt=0
        ).select_related('developer'):
            dev_score.recalculate_score()
        
        # === TraderScore Recalculation ===
        # Only recalculate traders who:
        # 1. Have trader score > 0
        # 2. Have made at least one trade in the past month
        
        active_traders = TraderScore.objects.filter(
            score__gt=0
        ).annotate(
            recent_trade_count=Count(
                'trader__trades',
                filter=Q(trader__trades__created_at__gte=one_month_ago)
            )
        ).filter(
            recent_trade_count__gt=0
        ).select_related('trader')
        
        for trader_score in active_traders:
            trader_score.recalculate_score()
        
        return HttpResponse("OK")

# Alternative more aggressive optimization
class RecalculateDailyScoresViewAggressive(APIView):
    """
    More aggressive optimization - only recalculates if there's been 
    activity since the last update
    """
    permission_classes = [IsCronjobRequest]

    def post(self, request):
        now = timezone.now()
        one_month_ago = now - timedelta(days=30)
        
        # === CoinDRCScore - Only if coin had trades since last daily update ===
        for drc in CoinDRCScore.objects.select_related('coin').filter(score__gt=0):
            last_update = drc.last_daily_update or drc.created_at
            
            # Check if there were any trades since last update
            has_new_activity = Trade.objects.filter(
                coin=drc.coin,
                created_at__gt=last_update
            ).exists()
            
            if has_new_activity:
                drc.recalculate_score()
                drc.last_daily_update = now
                drc.save(update_fields=['last_daily_update'])
        
        # === DeveloperScore - Only active developers with recent coin activity ===
        for dev_score in DeveloperScore.objects.filter(
            is_active=True,
            score__gt=0
        ).select_related('developer'):
            last_update = dev_score.last_daily_update if hasattr(dev_score, 'last_daily_update') else dev_score.created_at
            
            # Check if any of their coins had activity
            has_coin_activity = Trade.objects.filter(
                coin__creator=dev_score.developer,
                created_at__gt=last_update
            ).exists()
            
            if has_coin_activity:
                dev_score.recalculate_score()
        
        # === TraderScore - Only traders with recent trades ===
        for trader_score in TraderScore.objects.select_related('trader').filter(score__gt=0):
            last_update = trader_score.last_daily_update if hasattr(trader_score, 'last_daily_update') else trader_score.created_at
            
            # Check if trader made any trades since last update
            has_new_trades = Trade.objects.filter(
                user=trader_score.trader,
                created_at__gt=last_update
            ).exists()
            
            if has_new_trades:
                trader_score.recalculate_score()
        
        return HttpResponse("OK")
