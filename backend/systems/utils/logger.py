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

# create logger for the coin history
class CoinKey(Enum):
    FLASH_DUMPS = "flash_dumps"
    PORTFOLIO_GROWTH = "portfolio_growth"
    LONG_TERM_HOLDING = "long_term_holding"
    SNIPE_DUMPS = "snipe_dumps"

def coin_keys_description(key:CoinKey):
    match key:
        case TraderKey.FLASH_DUMPS:
            return "-10 for 2+ suspicious quick trades"
        case TraderKey.PORTFOLIO_GROWTH:
            return "+50 for 3x, +25 for 2x (monthly)"
        case TraderKey.LONG_TERM_HOLDING:
            return "+75 per month held"
        case TraderKey.SNIPE_DUMPS:
            return "-10 per early snipe and quick dump"

def log_coin_history(coin, key:CoinKey, score, description = None):
    from systems.models import CoinHistory
    CoinHistory.objects.create(
        coin=coin,
        key=key.value,
        score=score,
        description= description or coin_keys_description(key)
    )
