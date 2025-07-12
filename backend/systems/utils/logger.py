from enum import Enum

class TraderKey(Enum):
    FLASH_DUMPS = "flash_dumps"
    PORTFOLIO_GROWTH = "portfolio_growth"
    LONG_TERM_HOLDING = "long_term_holding"
    SNIPE_DUMPS = "snipe_dumps"

def trade_keys_description(key:TraderKey):
    match key:
        case TraderKey.FLASH_DUMPS:
            return "-10 for 2+ suspicious quick trades"
        case TraderKey.PORTFOLIO_GROWTH:
            return "+50 for 3x, +25 for 2x (monthly)"
        case TraderKey.LONG_TERM_HOLDING:
            return "+75 per month held"
        case TraderKey.SNIPE_DUMPS:
            return "-10 per early snipe and quick dump"

def log_trader_history(user, key:TraderKey, score, description = None):
    from systems.models import TraderHistory
    TraderHistory.objects.create(
        user=user,
        key=key.value,
        score=score,
        description= description or trade_keys_description(key)
    )

def calculate_token_price(solprice, instance): # for trades when trades occur
    from systems.models import Coin
    if instance is Coin:
        current_cap_sol = instance.current_marketcap + solprice
        start_cap_sol = instance.start_marketcap
        end_cap_sol = instance.end_marketcap
        total_supply = instance.total_supply
        price_at_start = start_cap_sol / total_supply
        price_at_end = end_cap_sol / total_supply

        # Clamp t between 0 and 1
        t = max(0, min(1, (current_cap_sol - start_cap_sol) / (end_cap_sol - start_cap_sol)))
        instance.current_price = price_at_start + (price_at_end - price_at_start) * t
        instance.current_marketcap = current_cap_sol
        instance.save() # or update
