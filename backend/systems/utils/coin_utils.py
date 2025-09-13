from systems.models import Coin, UserCoinHoldings
from django.db.models import F, ExpressionWrapper, DecimalField

def get_coin_info(queryset):
    """
    Returns coin info dicts (instead of serializer).
    Reusable for dashboard and profile.
    """
    return list(
        queryset.values(
            "address", "ticker", "name",
            "created_at",
            "current_price", "total_held", "score",
            "current_marketcap", "change"
        )
    )

def get_user_holdings(user, include_market_cap=False):
    qs = (
        UserCoinHoldings.objects
        .filter(user=user)
        .select_related("coin")
        .annotate(
            value=ExpressionWrapper(
                F("amount_held") * F("coin__current_price"),
                output_field=DecimalField(max_digits=32, decimal_places=9)
            )
        )
        .values(
            "coin__address",
            "coin__ticker",
            "coin__name",
            "coin__current_price",
            "coin__current_marketcap",
            "amount_held",
            "value",
        )
    )

    results = []
    for h in qs:
        entry = {
            "coin_address": h["coin__address"],
            "coin_ticker": h["coin__ticker"],
            "coin_name": h["coin__name"],
            "amount_held": h["amount_held"],
            "current_price": h["coin__current_price"],
            "value": h["value"],
        }
        if include_market_cap:
            entry["current_marketcap"] = h["coin__current_marketcap"]
        results.append(entry)

    return results
