from django.db import close_old_connections, connection
from decimal import Decimal

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
