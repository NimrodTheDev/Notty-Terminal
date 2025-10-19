
from collections import defaultdict
# from django.db import transaction
# from django.db.models import F, Value
from typing import Dict, Tuple
from systems.models import UserCoinHoldings, CoinDRCScore, Coin
from django.db.models import Case, When, F, Value, IntegerField, DecimalField

def apply_holdings_deltas(
    holdings_map: Dict[Tuple[int,int], float],
    # holdings_map: (user_id, coin_id) -> delta (can be positive or negative)
):
    """
    Apply many (user,coin) deltas in bulk:
      - create missing holdings where new_amount > 0
      - update existing holdings via F() where new_amount != old_amount
      - delete holdings where new_amount <= 0

    Returns:
      coin_total_deltas: { coin_id: total_delta }  # to update Coin.total_held via F()
      holders_changes: { coin_id: (added_count, removed_count) } # net holder changes
    """

    coin_total_deltas = defaultdict(float)
    added_by_coin = defaultdict(int)
    removed_by_coin = defaultdict(int)

    if not holdings_map:
        return {}, {}

    # keys: list of (user_id, coin_id)
    keys = list(holdings_map.keys())
    users = [k[0] for k in keys]
    coins = [k[1] for k in keys]

    # Fetch existing holdings
    qs = UserCoinHoldings.objects.filter(user_id__in=set(users), coin_id__in=set(coins))
    existing = {(h.user_id, h.coin_id): h for h in qs}

    to_update = []
    to_create = []
    to_delete_keys = []

    for (user_id, coin_id), delta in holdings_map.items():
        existing_h = existing.get((user_id, coin_id))
        if existing_h:
            # compute new amount using numeric ops (Decimal or float depending on model)
            new_amount = existing_h.amount_held + delta
            # track coin totals
            coin_total_deltas[coin_id] += delta

            if new_amount <= 0:
                # mark for deletion
                to_delete_keys.append((user_id, coin_id))
                # holder removed if previously > 0
                if existing_h.amount_held > 0:
                    removed_by_coin[coin_id] += 1
            else:
                # update object in memory and add to bulk_update list
                existing_h.amount_held = new_amount
                to_update.append(existing_h)
                # if previously zero? shouldn't be for existing_h
        else:
            # no existing holding
            new_amount = delta
            if new_amount > 0:
                # create new holding
                to_create.append(UserCoinHoldings(user_id=user_id, coin_id=coin_id, amount_held=new_amount))
                coin_total_deltas[coin_id] += new_amount
                added_by_coin[coin_id] += 1
            else:
                # nothing to do (attempt to reduce holdings that don't exist)
                continue

    # Apply DB changes inside atomic by caller
    return {
        "to_update": to_update,
        "to_create": to_create,
        "to_delete_keys": to_delete_keys,
        "coin_total_deltas": dict(coin_total_deltas),
        "holders_changes": {cid: (added_by_coin.get(cid,0), removed_by_coin.get(cid,0))
                            for cid in set(list(added_by_coin.keys()) + list(removed_by_coin.keys()))}
    }

def bulk_update_holders_counts(holders_changes: dict):
    """
    Efficiently update CoinDRCScore.holders_count using a single SQL query.
    holders_changes = {coin_id: (added_count, removed_count)}
    """
    if not holders_changes:
        return

    whens = []
    for coin_id, (added, removed) in holders_changes.items():
        delta = added - removed
        if delta != 0:
            whens.append(
                When(coin_id=coin_id, then=F('holders_count') + Value(delta))
            )

    if not whens:
        return

    CoinDRCScore.objects.update(
        holders_count=Case(*whens, output_field=IntegerField())
    )

def bulk_update_coin_totals(coin_deltas: dict):
    """
    Efficiently apply total_held deltas to Coin table using one query.
    coin_deltas = {coin_id: delta}
    """
    if not coin_deltas:
        return

    whens = [
        When(pk=coin_id, then=F('total_held') + Value(delta))
        for coin_id, delta in coin_deltas.items()
        if delta != 0
    ]

    if not whens:
        return

    Coin.objects.filter(pk__in=coin_deltas.keys()).update(
        total_held=Case(*whens, output_field=DecimalField(max_digits=32, decimal_places=9))
    )