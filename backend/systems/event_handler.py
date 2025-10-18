# systems/event_handler.py
import asyncio
import json
from typing import Dict, List, Optional
from django.core.cache import cache, caches
from django.conf import settings
import aiohttp
from systems.listeners import SolanaEventListener
from systems.parser import TokenEventDecoder
from systems.tasks import process_creates_batch, process_trades_batch
import logging

logger = logging.getLogger(__name__)


class EventHandler:
    """Base event handler with batching support"""
    
    def __init__(self, batch_size=50, batch_delay=0.5, enable_batching=True):
        """
        Initialize event handler with batching configuration
        
        Args:
            batch_size: Number of events before forcing batch processing
            batch_delay: Seconds to wait before processing batch
            enable_batching: Whether to enable batching (False for immediate processing)
        """
        self.batch_size = batch_size
        self.batch_delay = batch_delay
        self.enable_batching = enable_batching
        
        # Separate queues for different event types
        self.create_queue = []
        self.trade_queue = []
        
        # Timestamps for batch processing
        self.last_create_process = asyncio.get_event_loop().time()
        self.last_trade_process = asyncio.get_event_loop().time()
        
        # Initialize decoders
        self._init_decoders()
        
        # Event types this handler processes
        self.event_types = ["CreateToken", "PurchaseToken", "SellToken"]
        
        # IPFS session
        self.ipfs_session = None
        
    def _init_decoders(self):
        """Initialize token event decoders"""
        self.decoders = {}
        
        self.decoders["CreateToken"] = TokenEventDecoder(
            "TokenCreated", {
                "mint": "pubkey",
                "initial_price_per_token": "u64",
                "migrated": "bool",
                "total_supply": "u64",
                "tokens_sold": "u64",
                "sol_raised": "u64",
                "start_mcap": "u64",
                "target_sol": "u64",
                "creator": "pubkey",
                "raydium_pool": "option<pubkey>",
                "migration_timestamp": "i64",
                "uri": "string",
            }
        )
        
        self.decoders["PurchaseToken"] = TokenEventDecoder(
            "PurchasedToken", {
                "base_cost": "u64",
                "trading_fee": "u64",
                "total_cost": "u64",
                "mint": "pubkey",
                "amount_purchased": "u64",
                "migrated": "bool",
                "total_supply": "u64",
                "tokens_sold": "u64",
                "sol_raised": "u64",
                "current_price": "u64",
                "buyer": "pubkey",
                "timestamp": "i64",
            }
        )
        
        self.decoders["SellToken"] = TokenEventDecoder(
            "SoldToken", {
                "mint": "pubkey",
                "base_proceeds": "u64",
                "trading_fee": "u64",
                "net_proceeds": "u64",
                "amount_sold": "u64",
                "migrated": "bool",
                "total_supply": "u64",
                "tokens_sold": "u64",
                "sol_raised": "u64",
                "current_price": "u64",
                "seller": "pubkey",
                "timestamp": "i64",
            }
        )
    
    async def get_ipfs_session(self):
        """Get or create aiohttp session for IPFS requests"""
        if self.ipfs_session is None or self.ipfs_session.closed:
            timeout = aiohttp.ClientTimeout(total=10)
            self.ipfs_session = aiohttp.ClientSession(timeout=timeout)
        return self.ipfs_session
    
    async def close_ipfs_session(self):
        """Close IPFS session"""
        if self.ipfs_session and not self.ipfs_session.closed:
            await self.ipfs_session.close()
    
    def extract_ipfs_hash(self, uri: str) -> str:
        """Extract IPFS hash from URI"""
        parts = uri.split('/ipfs/')
        if parts:
            return parts[-1]
        return ""
    
    async def get_metadata(self, log: dict) -> dict:
        """Fetch metadata from IPFS"""
        try:
            ipfuri: str = log.get("uri", "")
            ipfs_hash = self.extract_ipfs_hash(ipfuri)

            if not ipfs_hash:
                logger.warning(f"Invalid IPFS URI: {ipfuri}")
                return log

            # Check cache first
            cache_key = f"ipfs_metadata:{ipfs_hash}"
            cached_data = cache.get(cache_key)
            if cached_data:
                log.update(cached_data)
                return log

            gateways = [
                "https://ipfs.io/ipfs/",
                "https://cloudflare-ipfs.com/ipfs/",
                "https://gateway.pinata.cloud/ipfs/"
            ]

            session = await self.get_ipfs_session()
            for gateway in gateways:
                url = f"{gateway}{ipfs_hash}"
                try:
                    async with session.get(url) as response:
                        if response.status == 200:
                            content = await response.json()
                            # Cache for 1 hour
                            cache.set(cache_key, content, 3600)
                            log.update(content)
                            return log
                        else:
                            logger.debug(f"IPFS fetch failed: {response.status} - {url}")
                except Exception as e:
                    logger.debug(f"Error fetching from {url}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Unexpected error fetching metadata: {e}")
        return log
    
    def get_function_id(self, logs: list) -> tuple:
        """Extract function ID from logs"""
        for num, log in enumerate(logs):
            if "Program log: Instruction:" in log:
                return log.split(": ")[-1], num
        return None, None
    
    async def process_event(self, event_data):
        """Process incoming Solana event"""
        signature = getattr(event_data, 'signature', None)
        logs = getattr(event_data, 'logs', [])
        event_type, current_log = self.get_function_id(logs)
        
        if not event_type or not signature:
            return
        
        if event_type not in self.event_types:
            return
        
        # Decode event
        if event_type not in self.decoders:
            return
        
        for log in logs[current_log:]:
            decoded_event = self.decoders[event_type].decode(log)
            if decoded_event:
                # Route to appropriate handler
                if event_type == "CreateToken":
                    # Fetch metadata for creates
                    decoded_event = await self.get_metadata(decoded_event)
                    await self.add_to_create_queue(signature, decoded_event)
                elif event_type in ["PurchaseToken", "SellToken"]:
                    await self.add_to_trade_queue(signature, decoded_event)
                break
    
    async def add_to_create_queue(self, signature: str, event: dict):
        """Add create event to queue"""
        event_data = {
            'signature': signature,
            'event': event
        }
        
        if not self.enable_batching:
            # Process immediately
            process_creates_batch.delay([event_data])
            return
        
        # Use separate cache for creates
        cache_backend = caches['creates'] if 'creates' in caches else cache
        cache_key = f"create_event:{signature}"
        
        # Deduplicate
        if cache_backend.get(cache_key):
            logger.debug(f"Duplicate create event ignored: {signature}")
            return
        
        cache_backend.set(cache_key, True, 3600)  # Cache for 1 hour
        self.create_queue.append(event_data)
        
        logger.info(f"Added create event to queue: {signature} (queue size: {len(self.create_queue)})")
        
        # Check if we should process
        await self._check_create_batch()
    
    async def add_to_trade_queue(self, signature: str, event: dict):
        """Add trade event to queue"""
        event_data = {
            'signature': signature,
            'event': event
        }
        
        if not self.enable_batching:
            # Process immediately
            process_trades_batch.delay([event_data])
            return
        
        # Use separate cache for trades
        cache_backend = caches['trades'] if 'trades' in caches else cache
        cache_key = f"trade_event:{signature}"
        
        # Deduplicate
        if cache_backend.get(cache_key):
            logger.debug(f"Duplicate trade event ignored: {signature}")
            return
        
        cache_backend.set(cache_key, True, 3600)  # Cache for 1 hour
        self.trade_queue.append(event_data)
        
        logger.info(f"Added trade event to queue: {signature} (queue size: {len(self.trade_queue)})")
        
        # Check if we should process
        await self._check_trade_batch()
    
    async def _check_create_batch(self):
        """Check if create batch should be processed"""
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self.last_create_process
        
        should_process = (
            len(self.create_queue) >= self.batch_size or
            (len(self.create_queue) > 0 and time_since_last >= self.batch_delay)
        )
        
        if should_process:
            await self._process_create_batch()
    
    async def _check_trade_batch(self):
        """Check if trade batch should be processed"""
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self.last_trade_process
        
        should_process = (
            len(self.trade_queue) >= self.batch_size or
            (len(self.trade_queue) > 0 and time_since_last >= self.batch_delay)
        )
        
        if should_process:
            await self._process_trade_batch()
    
    async def _process_create_batch(self):
        """Process batch of create events"""
        if not self.create_queue:
            return
        
        batch = self.create_queue[:]
        self.create_queue.clear()
        self.last_create_process = asyncio.get_event_loop().time()
        
        logger.info(f"Processing create batch: {len(batch)} events")
        
        # Send to Celery
        process_creates_batch.delay(batch)
    
    async def _process_trade_batch(self):
        """Process batch of trade events"""
        if not self.trade_queue:
            return
        
        batch = self.trade_queue[:]
        self.trade_queue.clear()
        self.last_trade_process = asyncio.get_event_loop().time()
        
        logger.info(f"Processing trade batch: {len(batch)} events")
        
        # Send to Celery
        process_trades_batch.delay(batch)
    
    async def periodic_batch_check(self):
        """Periodically check for batches to process"""
        while True:
            await asyncio.sleep(self.batch_delay)
            await self._check_create_batch()
            await self._check_trade_batch()
    
    async def run_listener(self):
        """Run the Solana event listener"""
        listener = SolanaEventListener(
            rpc_ws_url=settings.RPC_WS_URL,
            program_id=settings.PROGRAM_ID,
            callback=self.process_event,
            max_retries=None,
            retry_delay=3,
            auto_restart=True
        )
        
        try:
            # Start periodic batch checker
            batch_task = asyncio.create_task(self.periodic_batch_check())
            
            # Start listener
            await listener.listen()
            
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received")
        finally:
            # Process remaining events
            await self._process_create_batch()
            await self._process_trade_batch()
            
            # Clean up
            await listener.stop()
            await self.close_ipfs_session()


class CreateEventHandler(EventHandler):
    """Handler that only processes create events"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.event_types = ["CreateToken"]


class TradeEventHandler(EventHandler):
    """Handler that only processes trade events"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.event_types = ["PurchaseToken", "SellToken"]