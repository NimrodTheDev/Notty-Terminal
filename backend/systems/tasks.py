# systems/tasks.py
from celery import shared_task
from django.db import transaction, close_old_connections, connection
from decimal import Decimal
from datetime import datetime, timezone as dt_timezone
from systems.models import Coin, Trade, SolanaUser
import logging
import time

logger = logging.getLogger(__name__)


def ensure_connection():
    """Ensure database connection is usable"""
    close_old_connections()
    if not connection.is_usable():
        connection.connect()


def bigint_to_float(value: int, power: int = 9) -> Decimal:
    """Convert bigint to float with proper decimal places"""
    result = Decimal(value).scaleb(-power).quantize(Decimal(f'0.{"0"*(power-1)}1'))
    return result


def get_transaction_type(ttype: str) -> str:
    """Get transaction type from code"""
    if ttype == "1":
        return "SELL"
    if ttype == "2":
        return "COIN_CREATE"
    if ttype == "0":
        return "BUY"
    raise ValueError(f"Type not registered: {ttype}")


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def process_creates_batch(self, events: list):
    """
    Process a batch of coin creation events
    
    Args:
        events: List of dicts with 'signature' and 'event' keys
    """
    if not events:
        return
    
    start_time = time.time()
    logger.info(f"Processing batch of {len(events)} create events")
    
    try:
        ensure_connection()
        
        # Prepare bulk data
        coins_to_create = []
        creators_cache = {}  # Cache creators to avoid multiple queries
        existing_mints = set(
            Coin.objects.filter(
                address__in=[e['event']['mint'] for e in events]
            ).values_list('address', flat=True)
        )
        
        for event_data in events:
            signature = event_data['signature']
            logs = event_data['event']
            
            mint = logs.get("mint")
            creator_wallet = logs.get("creator")
            
            # Skip if already exists
            if mint in existing_mints:
                logger.debug(f"Coin {mint} already exists, skipping")
                continue
            
            # Get or cache creator
            if creator_wallet not in creators_cache:
                try:
                    ensure_connection()
                    creator = SolanaUser.objects.get(wallet_address=creator_wallet)
                    creators_cache[creator_wallet] = creator
                except SolanaUser.DoesNotExist:
                    logger.warning(f"Creator not found: {creator_wallet}")
                    creators_cache[creator_wallet] = None
            
            creator = creators_cache[creator_wallet]
            if not creator:
                continue
            
            # Prepare coin object
            attributes = logs.get('attributes') or {}
            coin = Coin(
                address=mint,
                name=logs.get("name", ""),
                ticker=logs.get("symbol", ""),
                creator=creator,
                total_supply=Decimal(str(logs["total_supply"])),
                image_url=logs.get("image", ""),
                current_price=Decimal(str(logs["initial_price_per_token"])),
                description=logs.get("description"),
                discord=attributes.get("discord"),
                website=attributes.get("website"),
                twitter=attributes.get("twitter"),
                decimals=9,
                current_marketcap=bigint_to_float(logs["start_mcap"], 9),
                start_marketcap=bigint_to_float(logs["start_mcap"], 9),
                end_marketcap=bigint_to_float(logs["target_sol"], 9),
                raydium_pool=logs.get("raydium_pool"),
            )
            coins_to_create.append(coin)
        
        # Bulk create
        if coins_to_create:
            with transaction.atomic():
                Coin.objects.bulk_create(
                    coins_to_create,
                    ignore_conflicts=True,
                    batch_size=100
                )
            
            logger.info(
                f"Successfully created {len(coins_to_create)} coins "
                f"in {time.time() - start_time:.2f}s"
            )
        else:
            logger.info("No new coins to create")
        
        return {
            'processed': len(events),
            'created': len(coins_to_create),
            'duration': time.time() - start_time
        }
        
    except Exception as e:
        logger.error(f"Error processing create batch: {e}", exc_info=True)
        # Retry the task
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def process_trades_batch(self, events: list):
    """
    Process a batch of trade events
    
    Args:
        events: List of dicts with 'signature' and 'event' keys
    """
    if not events:
        return
    
    start_time = time.time()
    logger.info(f"Processing batch of {len(events)} trade events")
    
    try:
        ensure_connection()
        
        # Prepare bulk data
        trades_to_create = []
        coins_to_update = {}  # mint -> (price, timestamp)
        
        # Get existing signatures to avoid duplicates
        existing_sigs = set(
            Trade.objects.filter(
                transaction_hash__in=[e['signature'] for e in events]
            ).values_list('transaction_hash', flat=True)
        )
        
        # Cache users and coins
        users_cache = {}
        coins_cache = {}
        
        # Collect all wallets and mints
        wallets = set()
        mints = set()
        for event_data in events:
            logs = event_data['event']
            wallet = logs.get("buyer") or logs.get("seller")
            mint = logs.get("mint")
            if wallet:
                wallets.add(wallet)
            if mint:
                mints.add(mint)
        
        # Bulk fetch users and coins
        users = SolanaUser.objects.filter(wallet_address__in=wallets)
        for user in users:
            users_cache[user.wallet_address] = user
        
        coins = Coin.objects.filter(address__in=mints)
        for coin in coins:
            coins_cache[coin.address] = coin
        
        # Process events
        for event_data in events:
            signature = event_data['signature']
            logs = event_data['event']
            
            # Skip if already exists
            if signature in existing_sigs:
                logger.debug(f"Trade {signature} already exists, skipping")
                continue
            
            wallet = logs.get("buyer") or logs.get("seller")
            transfer_type = '0' if logs.get("buyer") else '1'
            
            # Get user and coin from cache
            user = users_cache.get(wallet)
            coin = coins_cache.get(logs.get("mint"))
            
            if not user:
                logger.warning(f"User not found: {wallet}")
                continue
            
            if not coin:
                logger.warning(f"Coin not found: {logs.get('mint')}")
                continue
            
            # Prepare trade data
            amount = logs.get("amount_purchased") or logs.get("amount_sold")
            sol_cost = logs.get("base_cost") or logs.get("base_proceeds")
            coin_amount = bigint_to_float(amount, coin.decimals)
            sol_amount = bigint_to_float(sol_cost, 9)
            timestamp = datetime.fromtimestamp(logs['timestamp'], tz=dt_timezone.utc)
            
            # Track coin updates (keep the latest timestamp)
            current_price = bigint_to_float(logs['current_price'], 9)
            if coin.address not in coins_to_update:
                coins_to_update[coin.address] = (current_price, timestamp)
            else:
                _, existing_ts = coins_to_update[coin.address]
                if timestamp > existing_ts:
                    coins_to_update[coin.address] = (current_price, timestamp)
            
            # Create trade object
            trade = Trade(
                transaction_hash=signature,
                user=user,
                coin=coin,
                trade_type=get_transaction_type(transfer_type),
                coin_amount=coin_amount,
                sol_amount=sol_amount,
                created_at=timestamp,
                trading_fee=bigint_to_float(logs['trading_fee'], 9),
            )
            trades_to_create.append(trade)
        
        # Bulk create trades and update coins in transaction
        with transaction.atomic():
            # Create trades
            if trades_to_create:
                Trade.objects.bulk_create(
                    trades_to_create,
                    ignore_conflicts=True,
                    batch_size=500
                )
            
            # Update coin prices
            if coins_to_update:
                for mint, (price, timestamp) in coins_to_update.items():
                    Coin.objects.filter(
                        address=mint,
                        updated__lt=timestamp
                    ).update(
                        current_price=price,
                        updated=timestamp
                    )
        
        logger.info(
            f"Successfully created {len(trades_to_create)} trades "
            f"and updated {len(coins_to_update)} coins "
            f"in {time.time() - start_time:.2f}s"
        )
        
        return {
            'processed': len(events),
            'created': len(trades_to_create),
            'coins_updated': len(coins_to_update),
            'duration': time.time() - start_time
        }
        
    except Exception as e:
        logger.error(f"Error processing trade batch: {e}", exc_info=True)
        # Retry the task
        raise self.retry(exc=e)


@shared_task
def cleanup_old_cache_entries():
    """
    Periodic task to clean up old cache entries
    Run this with Celery Beat: every hour or so
    """
    from django.core.cache import cache, caches
    
    # This is just a placeholder - Redis handles TTL automatically
    # But you can add custom cleanup logic here if needed
    logger.info("Cache cleanup task completed (Redis handles TTL automatically)")
    return True