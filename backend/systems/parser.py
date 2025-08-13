import hashlib 
import base64
import base58
from construct import Struct, Bytes, Int8ul, Int32ul, Int64ul, PaddedString, If, this, Int64sl

class TokenEventDecoder:
    def __init__(self, event_name: str, parse_dict: dict):
        self.event_name = event_name
        self.parse_dict = parse_dict
        self.struct = self._convert_dict_to_struct()
        self.discriminator = self._get_discriminator()

    def decode(self, log_line: str) -> dict | None:
        if "Program data:" not in log_line:
            return None

        base64_data = log_line.split("Program data: ")[1].strip()
        raw = base64.b64decode(base64_data)

        if raw[:8] != self.discriminator:
            print("Discriminator mismatch.")
            return None

        parsed = self.struct.parse(raw[8:])
        return self._convert_from_struct_to_dict(parsed)

    def _get_discriminator(self) -> bytes:
        return hashlib.sha256(f"event:{self.event_name}".encode()).digest()[:8]

    def _convert_dict_to_struct(self) -> Struct:
        fields = {}

        for key, value_type in self.parse_dict.items():
            if value_type == "string":
                fields[f"{key}_len"] = Int32ul
                fields[key] = PaddedString(lambda this, k=key: getattr(this, f"{k}_len"), "utf8")

            elif value_type == "pubkey":
                fields[key] = Bytes(32)

            elif value_type == "u8":
                fields[key] = Int8ul

            elif value_type == "u64":
                fields[key] = Int64ul

            elif value_type == "i64":
                fields[key] = Int64sl  # Same binary format as u64 but interpreted as signed

            elif value_type == "bool":
                fields[key] = Int8ul

            elif value_type == "option<pubkey>":
                fields[f"{key}_present"] = Int8ul  # flag: 0 = None, 1 = Some
                fields[key] = If(this[f"{key}_present"] == 1, Bytes(32))

            else:
                raise ValueError(f"Unsupported type: {value_type}")

        return Struct(**fields)

    def _convert_from_struct_to_dict(self, struct_output) -> dict:
        new_dict = {}
        for key, value_type in self.parse_dict.items():
            if value_type == "option<pubkey>":
                present_flag = struct_output.get(f"{key}_present", 0)
                pubkey_bytes = struct_output.get(key)
                new_dict[key] = base58.b58encode(pubkey_bytes).decode() if present_flag and pubkey_bytes else None
            else:
                new_dict[key] = self._get_proper_output(value_type, struct_output.get(key))
        return new_dict

    @staticmethod
    def _get_proper_output(output_type, output):
        if output_type == "pubkey":
            return base58.b58encode(output).decode()
        elif output_type == "bool":
            return bool(output)
        return output

if __name__ == "__main__":
    # my_dict = {
    #     "token_name": "string",
    #     "token_symbol": "string",
    #     "token_uri": "string",
    #     "mint_address": "pubkey",
    #     "metadata_address": "pubkey",
    #     "authority": "pubkey",
    #     "decimals": "u8",
    # }
    my_dict = {
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

    log_line = "Program data: NwJpTA5vXgRKByzDDNZGKPpNC2Z6twDm5SH+ulRqLmFPO/GSI/XfQS8AAAAAAAAAAOQLVAIAAAAAAMqaOwAAAAAAAAAAAAAAABF4fQEAAAAAAAAAAAAAAABOdQgk+i6uMOB07IiPogErJKU9YMhkWMCFyROux8o8POROnGgAAAAA"#"Program data: YHpxijLjlTkEAAAAT1RYWwQAAABya2tFBAAAAGdlcmXC/sKDZhL9WAglOAoGvMmCyhG8jVL3YSJo0JgMhNfHIxFxSi0yRsbzff3VW2I+0zipxim6KdmtuY9xFCiCfHka6WbAL72J1laWy4AVoH/xMcMVfCdfht60iQunUEMRTSMJ"

    decoder = TokenEventDecoder(
        # "TokenCreatedEvent",
        "SoldToken", 
        my_dict
    )
    event = decoder.decode(log_line)
    print("✅ Decoded Event:", event)
