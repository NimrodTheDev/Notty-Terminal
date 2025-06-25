import asyncio
from django.core.management.base import BaseCommand
from systems.listeners import SolanaEventListener
from systems.models import Coin, Trade, SolanaUser
from decimal import Decimal
from systems.parser import TokenEventDecoder
from django.db import OperationalError
from asgiref.sync import sync_to_async
import requests
import aiohttp
import time
from django.db import connection, close_old_connections

class Command(BaseCommand):
    help = 'Listen for Solana program events'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting Solana event listener...'))
        asyncio.run(self.run_listener())

    async def run_listener(self):
        # Setup your event listener similar to the consumer code
        rpc_ws_url = "wss://api.devnet.solana.com"
        program_id = "A7sBBSngzEZTsCPCffHDbeXDJ54uJWkwdEsskmn2YBGo"#"443aQT61EYaeiqqdqGth95LYgfQkZF1BQbaJLZJ6i29w"
        
        listener = SolanaEventListener(
            rpc_ws_url=rpc_ws_url,
            program_id=program_id,
            callback=self.process_event,
            max_retries=None,  # Infinite retries
            retry_delay=3,
            auto_restart=True
        )
        self.decoders = {}
        # self.decoders["CreateToken"] = TokenEventDecoder(
        #     "TokenCreatedEvent", {
        #         "token_name": "string",
        #         "token_symbol": "string",
        #         "token_uri": "string",
        #         "mint_address": "pubkey",
        #         "creator": "pubkey",
        #         "decimals": "u8",
        #         "price_per_token": "u64",
        #         "initial_supply": "u64",
        #     }
        # )
        self.decoders["CreateTokenWithVault"] = TokenEventDecoder(
            "TokenWithVaultCreatedEvent", {
                "token_name": "string",
                "token_symbol": "string",
                "token_uri": "string",
                "mint_address": "pubkey",
                "creator": "pubkey",
                "decimals": "u8",
                "price_per_token": "u64",
                "initial_supply": "u64",
            }
        )
        # self.decoders["InitVault"] = TokenEventDecoder(
        #     "InitVaultEvent", {
        #         "mint_address": "pubkey2",
        #         "price_per_token": "u64",
        #         "initial_supply": "u64",
        #     }
        # )
        trade_decoder = TokenEventDecoder(
            "TokenTransferEvent", {
                "transfer_type": "u8",
                "mint_address": "pubkey",
                "user": "pubkey",
                "sol_amount": "u64",
                "coin_amount": "u64",
            }
        )
        self.decoders["BuyToken"] = trade_decoder
        self.decoders["SellToken"] = trade_decoder
        
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
        print(logs)
        event_type, currect_log = self.get_function_id(logs)
        if event_type and signature:
            if event_type == "CreateTokenWithVault":
                if event_type in self.decoders:
                    for log in logs[currect_log:]:
                        event = self.decoders[event_type].decode(log)
                        if event:
                            event = await self.get_metadata(event)
                            await self.handle_coin_creation(signature, event)
                            break
            if event_type in ["SellToken", "BuyToken"]:
                if event_type in self.decoders:
                    for log in logs[currect_log:]:
                        event = self.decoders[event_type].decode(log)
                        if event:
                            await self.handle_trade(signature, event)
                            break
            if event_type == "InitVault":
                if event_type in self.decoders:
                    for log in logs[currect_log:]:
                        event = self.decoders[event_type].decode(log)
                        if event:
                            await self.handle_coin_initalization(signature, event)
                            break

    async def get_metadata(self, log: dict) -> dict:
        try:
            ipfuri: str = log.get("token_uri", "")
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

        # try:
        self.ensure_connection()
        if not Coin.objects.filter(address=logs["mint_address"]).exists() and creator:
            attributes = logs.get('attributes') or {}
            new_coin = Coin(
                address=logs["mint_address"],
                name=logs["token_name"],
                ticker=logs["token_symbol"],
                creator=creator,
                total_supply=self.bigint_to_float(logs["initial_supply"], logs["decimals"]),#Decimal("1000000.0"),
                image_url=logs.get("image", ""),
                current_price=Decimal("1.0"),
                description=logs.get("description", None),
                discord=attributes.get("discord"),
                website=attributes.get("website"),
                twitter=attributes.get("twitter"),
                decimals = logs["decimals"],
                price_per_token = logs["price_per_token"]
            )
            new_coin.save()
            print(f"Created new coin with address: {logs['mint_address']}")
        # except Exception as e:
        #     print(f"Error while saving coin: {e}")
    
    @sync_to_async(thread_sensitive=True)
    def handle_coin_initalization(self, signature: str, logs: dict):
        print(logs["mint_address"])
        coin:Coin = self.custom_check(
            lambda: Coin.objects.get(address=logs["mint_address"]),
            not_found_exception=Coin.DoesNotExist
        )
        coin.total_supply = self.bigint_to_float(logs["initial_supply"], coin.decimals)
        coin.price_per_token = logs["price_per_token"]
        try:
            self.ensure_connection()
            coin.save()
            print(f"Initailized coin with address: {logs['mint_address']}")
        except Exception as e:
            print(f"Error while saving coin: {e}")

    @sync_to_async(thread_sensitive=True)
    def handle_trade(self, signature, logs):
        """Handle coin creation event"""
        tradeuser = self.custom_check(
            lambda: SolanaUser.objects.get(wallet_address=logs["user"]),
            not_found_exception=SolanaUser.DoesNotExist
        )

        coin:Coin = self.custom_check(
            lambda: Coin.objects.get(address=logs["mint_address"]),
            not_found_exception=Coin.DoesNotExist
        )

        coin_amount = self.bigint_to_float(logs["coin_amount"], coin.decimals)
        sol_amount = self.bigint_to_float(logs["sol_amount"], coin.decimals)
        print(logs)
        try:
            self.ensure_connection()
            if not Trade.objects.filter(transaction_hash=signature).exists() and tradeuser != None and coin != None:
                new_trade = Trade(
                    transaction_hash=signature,
                    user= tradeuser,
                    coin=coin,
                    trade_type=self.get_transaction_type(logs["transfer_type"]),
                    coin_amount=coin_amount,
                    sol_amount=sol_amount,
                )
                new_trade.save()
                print(f"Created new trade with transaction_hash: {signature}")
        except Exception as e:
            print(f"Error while saving trade: {e}")

    def bigint_to_float(self, value: int, power:int=9) -> float:
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
