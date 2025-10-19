from systems.models import Coin, CoinDRCScore, DeveloperScore, Trade, UserCoinHoldings
from django.db import transaction
# from django.db.models import F
from collections import defaultdict
from typing import List
from .trade_utils import apply_holdings_deltas, bulk_update_holders_counts, bulk_update_coin_totals
# from systems.tasks import recalc_trader_scores_task  # celery tasks
# from .utils.broadcast import broadcast_coin_created, broadcast_trade_created

# signal
def handle_coin_post_create(coins: List[Coin]):
    """
    Mimics post_save signal behavior for bulk-created coins.
    """
    if not coins:
        return

    # 1. Create DRC scores in bulk
    drc_scores = [CoinDRCScore(coin=coin) for coin in coins]
    CoinDRCScore.objects.bulk_create(drc_scores, ignore_conflicts=True, batch_size=100)

    # 2. Activate developers in bulk
    creator_ids = {coin.creator_id for coin in coins}
    DeveloperScore.objects.filter(developer_id__in=creator_ids, is_active=False).update(is_active=True)

    # 3. Optionally broadcast in bulk (optional)
    # for coin in coins:
    #     broadcast_coin_created(coin)

def handle_trades_post_create(created_trades: List[Trade]):
    """
    created_trades: list of Trade model instances (these must exist in DB already;
                    if they are only in-memory objects returned from bulk_create,
                    ensure you pass the persisted ones or their (user_id, coin_id, coin_amount, sol_amount)).
    This will:
      - compute holdings deltas per (user, coin)
      - bulk-create/update/delete holdings
      - update Coin.total_held and Coin.holders_count atomically
      - schedule score recalculation tasks (via transaction.on_commit)
    """

    if not created_trades:
        return

    # Build holdings deltas: (user_id, coin_id) -> delta_coin_amount
    holdings_deltas = defaultdict(float)
    for t in created_trades:
        user_id = t.user_id
        coin_id = t.coin_id
        delta = t.coin_amount if t.trade_type in ('BUY', 'COIN_CREATE') else -t.coin_amount
        holdings_deltas[(user_id, coin_id)] += delta

    # Compute bulk apply plan
    plan = apply_holdings_deltas(holdings_deltas)

    # Perform DB updates in a single atomic block
    with transaction.atomic():
        # Create new holdings
        if plan['to_create']:
            UserCoinHoldings.objects.bulk_create(plan['to_create'], ignore_conflicts=True, batch_size=500)

        # Bulk update existing holdings
        if plan['to_update']:
            UserCoinHoldings.objects.bulk_update(plan['to_update'], ['amount_held'], batch_size=500)

        # Delete holdings where new amount <= 0
        if plan['to_delete_keys']:
            # Convert keys to query
            delete_filters = []
            # Build Q objects for deletion or use a filter IN tuple list
            tuples = plan['to_delete_keys']  # list of (user_id, coin_id)
            q = None
            # efficient delete by composing conditions
            from django.db.models import Q
            combined_q = Q()
            for u,c in tuples:
                combined_q |= Q(user_id=u, coin_id=c)
            UserCoinHoldings.objects.filter(combined_q).delete()

        bulk_update_coin_totals(plan['coin_total_deltas'])

        bulk_update_holders_counts(plan['holders_changes'])

        # Done atomically: trades exist, holdings & coin totals updated

    # Schedule asynchronous recalculations AFTER successful commit
    # created_user_ids = {t.user_id for t in created_trades}
    # transaction.on_commit(lambda: recalc_trader_scores_task.delay(list(created_user_ids)))
