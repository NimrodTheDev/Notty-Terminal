import asyncio
from django.core.management.base import BaseCommand
from systems.listeners import SolanaEventListener
from systems.models import Coin, Trade, SolanaUser
from decimal import Decimal
from systems.parser import TokenEventDecoder
from django.db import OperationalError
from asgiref.sync import sync_to_async
import aiohttp
import time
from django.db import connection, close_old_connections
from django.utils import timezone
from datetime import datetime
from django.forms.models import model_to_dict

class Command(BaseCommand):
    help = 'Listen for Solana program events'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting Solana event listener...'))
        asyncio.run(self.run_listener())

    async def run_listener(self):
        # Setup your event listener similar to the consumer code
        rpc_ws_url = "wss://api.devnet.solana.com"
        program_id = "3Jy5qUaaAQMKVUehh4cLncAAYVgf1XELnt1RhNJGe8ZD"
        
        listener = SolanaEventListener(
            rpc_ws_url=rpc_ws_url,
            program_id=program_id,
            callback=self.process_event,
            max_retries=None,  # Infinite retries
            retry_delay=3,
            auto_restart=True
        )
        self.decoders = {}
        self.decoders["CreateToken"] = TokenEventDecoder(
            "TokenCreated", {
                "mint": "pubkey",
                "initial_price_per_token": "u64", # 
                "migrated": "bool", # opt
                "total_supply": "u64", 
                "tokens_sold": "u64", # opt
                "sol_raised": "u64", # opt
                "start_mcap": "u64", # sol
                "target_sol": "u64", # graduation sol
                "creator": "pubkey",
                "raydium_pool": "option<pubkey>",
                "migration_timestamp": "i64",
                "uri": "string",
            }
        )
        # amount purchased is token amount 
        # cost is sol used
        self.decoders["PurchaseToken"] = TokenEventDecoder(
            "PurchasedToken", {
                "mint": "pubkey",
                "amount_purchased": "u64",
                "migrated": "bool",
                "total_supply": "u64",
                "tokens_sold": "u64",
                "sol_raised": "u64",
                "cost": "u64", 
                "current_price": "u64",
                "buyer": "pubkey",
                "timestamp": "i64",
            }
        )
        self.decoders["SellToken"] = TokenEventDecoder(
            "SoldToken", {
                "mint": "pubkey",
                "cost": "u64", 
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
        try:
            # Start the listener with auto-restart enabled
            await listener.listen()
        except KeyboardInterrupt:
            print("Keyboard interrupt received")
        finally:
            # Gracefully shut down
            await listener.stop()
    
    async def process_event(self, event_data):
        # This handles both dict and dot-access objects
        # check the type
        signature = getattr(event_data, 'signature', None)
        logs = getattr(event_data, 'logs', [])
        # print(logs)
        event_type, currect_log = self.get_function_id(logs)
        if event_type and signature:
            if event_type == "CreateToken":
                if event_type in self.decoders:
                    for log in logs[currect_log:]:
                        event = self.decoders[event_type].decode(log)
                        if event:
                            event = await self.get_metadata(event)
                            await self.handle_coin_creation(signature, event)
                            break
            if event_type in ["SellToken", "PurchaseToken"]:
                if event_type in self.decoders:
                    for log in logs[currect_log:]:
                        event = self.decoders[event_type].decode(log)
                        if event:
                            await self.handle_trade(signature, event)
                            break

    async def get_metadata(self, log: dict) -> dict:
        try:
            ipfuri: str = log.get("uri", "")
            ipfs_hash = self.extract_ipfs_hash(ipfuri)

            if not ipfs_hash:
                print(f"Invalid IPFS URI: {ipfuri}")
                return log

            gateways = [
                "https://ipfs.io/ipfs/",
                "https://cloudflare-ipfs.com/ipfs/",
                "https://gateway.pinata.cloud/ipfs/"
            ]

            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                for gateway in gateways:
                    url = f"{gateway}{ipfs_hash}"
                    try:
                        # print(f"Trying: {url}")
                        async with session.get(url) as response:
                            if response.status == 200:
                                content = await response.json()
                                log.update(content)
                                return log  # Success
                            else:
                                print(f"Failed to fetch: {response.status}")
                    except Exception as e:
                        print(f"Error on {url}: {e}")

        except Exception as e:
            print(f"Unexpected error: {e}")
        return log

    def extract_ipfs_hash(self, uri: str) -> str:
        parts = uri.rstrip("/").split("/")
        if parts:
            return parts[-1]
        return ""
    
    @sync_to_async(thread_sensitive=True)
    def handle_coin_creation(self, signature: str, logs: dict):
        creator = self.custom_check(
            lambda: SolanaUser.objects.get(wallet_address=logs["creator"]),
            not_found_exception=SolanaUser.DoesNotExist
        )

        try:
            self.ensure_connection()
            if not Coin.objects.filter(address=logs["mint"]).exists() and creator:
                attributes = logs.get('attributes') or {}
                new_coin = Coin(
                    address=logs["mint"],
                    name=logs["name"],
                    ticker=logs["symbol"],
                    creator=creator,
                    total_supply=Decimal(str(logs["total_supply"])),
                    image_url=logs.get("image", ""),
                    current_price=Decimal(str(logs["initial_price_per_token"])),
                    description=logs.get("description", None),
                    discord=attributes.get("discord"),
                    website=attributes.get("website"),
                    twitter=attributes.get("twitter"),
                    decimals = 9,
                    current_marketcap=self.bigint_to_float(logs["start_mcap"], 9), # amount of sol raised
                    start_marketcap=self.bigint_to_float(logs["start_mcap"], 9),
                    end_marketcap=self.bigint_to_float(logs["target_sol"], 9),
                    raydium_pool = logs["raydium_pool"],
                )
                new_coin.save()
                print(model_to_dict(new_coin))
                print(f"Created new coin with address: {logs['mint']}")
        except Exception as e:
            print(f"Error while saving coin: {e}")
    
    @sync_to_async(thread_sensitive=True)
    def handle_trade(self, signature, logs):
        """Handle coin creation event"""
        wallet = logs.get("buyer") or logs.get("seller")
        transfer_type = '0' if logs.get("buyer") else '1'
        tradeuser:SolanaUser = self.custom_check(
            lambda: SolanaUser.objects.get(wallet_address=wallet),
            not_found_exception=SolanaUser.DoesNotExist
        )

        coin:Coin = self.custom_check(
            lambda: Coin.objects.get(address=logs["mint"]),
            not_found_exception=Coin.DoesNotExist
        )

        amount = logs.get("amount_purchased") or logs.get("amount_sold")
        coin_amount = self.bigint_to_float(amount, coin.decimals)
        sol_amount = logs["cost"]#self.bigint_to_float(logs["cost"], 9)
        try:
            self.ensure_connection()
            timestamp = datetime.fromtimestamp(logs['timestamp'], tz=timezone.utc)
            if coin.updated < timestamp:
                coin.current_price = logs['current_price']
                coin.updated = timestamp
                coin.save(update_fields=['current_price', 'updated'])
            if not Trade.objects.filter(transaction_hash=signature).exists() and tradeuser != None and coin != None:
                new_trade = Trade(
                    transaction_hash=signature,
                    user=tradeuser,
                    coin=coin,
                    trade_type=self.get_transaction_type(transfer_type),
                    coin_amount=coin_amount,
                    sol_amount=sol_amount,
                    created_at=timestamp,
                ) 
                new_trade.save()
                print(f"Created new trade with transaction_hash: {signature}")
        except Exception as e:
            print(f"Error while saving trade: {e}")

    def bigint_to_float(self, value: int, power:int=9) -> Decimal:
        result = Decimal(value).scaleb(-power).quantize(Decimal(f'0.{"0"*(power-1)}1'))  # for 9 decimals
        return result

    def custom_check(self, info: callable, not_found_exception: type[Exception]):
        return_value = None
        for attempt in range(3):
            try:
                self.ensure_connection()
                return_value = info()
                break
            except not_found_exception as e:
                print(f"Specific object({not_found_exception}) not found: {e}")
                return
            except OperationalError as e:
                print(f"DB OperationalError (attempt {attempt + 1}/3): {e}")
                time.sleep(1)
            except Exception as e:
                print(f"Unexpected error: {e}")
                return
        return return_value

    def ensure_connection(self):
        close_old_connections()
        if not connection.is_usable():
            connection.connect()

    def get_transaction_type(self, ttype):
        ttype = str(ttype)
        if ttype == "1":
            return "SELL"
        if ttype == "2":
            return "COIN_CREATE"
        if ttype == "0":
            return "BUY"
        raise(ValueError("Type not Registered"))

    def get_function_id(self, logs:list) -> tuple:
        for num, log in enumerate(logs): # get the function id
            if "Program log: Instruction:" in log:
                return log.split(": ")[-1], num
