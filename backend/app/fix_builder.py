from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

SOH = "\x01"


def fix_timestamp() -> str:
    # FIX timestamp format from spec: YYYYMMDD-HH:MM:SS.sss
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H:%M:%S.%f")[:21]


class ClOrdIdGenerator:
    """POC ClOrdID generator that mimics the RBI/Clearcorp bit allocation idea.

    Spec format:
      7 bit Login Frequency + 24 bit User Number + 32 bit Running Sequence Number.
    For local POC we generate a deterministic integer-like string using the same shift idea.
    """

    def __init__(self, login_frequency: int = 1, user_number: int = 1):
        self.login_frequency = login_frequency
        self.user_number = user_number
        self.sequence = 1

    def next(self) -> str:
        value = (self.login_frequency << 56) + (self.user_number << 32) + self.sequence
        self.sequence += 1
        return str(value)


cl_ord_id_generator = ClOrdIdGenerator()


class FixMessageBuilder:
    def build_new_order_single(self, *, order: Dict[str, Any], security: Dict[str, Any]) -> Dict[str, Any]:
        # NDS-OM New Order - Single, FIX MsgType 35=D
        return {
            "8": "FIXT.1.1",
            "35": "D",
            "49": "TM001",             # Placeholder CCIL issued user number
            "50": "TMID1",             # Placeholder TM ID
            "56": "CCILNDSFIX",
            "115": order["clientId"],  # Client ID for NON-DMA client order
            "11": order["clOrdId"],
            "38": order["quantity"],
            "40": "2",                 # 2 = Limit
            "44": order["limitPrice"],
            "48": security["contractId"],
            "54": "1" if order["side"] == "BUY" else "2",  # 1 Bid, 2 Offer
            "59": "0",                 # 0 = Day
            "60": fix_timestamp(),
            "440": "CM001",            # Placeholder Clearing Member ID
            "528": "4",                # 4 = TM for Client
            "10001": 0,                # Market Making Flag always 0
            "10002": "1",              # 1 = Normal quantity condition
            "10005": "00000",          # PortfolioID when 528=4
        }

    def build_modify_order(self, *, order: Dict[str, Any], quantity: int, limit_price: float) -> Dict[str, Any]:
        # NDS-OM Order Modification/Release Request, FIX MsgType 35=G
        return {
            "8": "FIXT.1.1",
            "35": "G",
            "49": "TM001",
            "50": "TMID1",
            "56": "CCILNDSFIX",
            "115": order["clientId"],
            "11": order["clOrdId"],
            "37": order.get("ndsOrderId"),
            "38": quantity,
            "40": "2",
            "41": order["clOrdId"],
            "44": limit_price,
            "48": order["contractId"],
            "54": "1" if order["side"] == "BUY" else "2",
            "59": "0",
            "60": fix_timestamp(),
            "440": "CM001",
            "528": "4",
            "10001": 0,
            "10002": "1",
            "10004": order.get("lastActivityTimestamp", 0),
            "10005": "00000",
            "10009": "M", # M = Modify, R = Release
            "10011": order["quantity"],
            "10012": order["limitPrice"],
        }

    def build_cancel_order(self, *, order: Dict[str, Any]) -> Dict[str, Any]:
        # NDS-OM Order Cancel/Hold Request, FIX MsgType 35=F
        return {
            "8": "FIXT.1.1",
            "35": "F",
            "49": "TM001",
            "50": "TMID1",
            "56": "CCILNDSFIX",
            "115": order["clientId"],
            "11": cl_ord_id_generator.next(),
            "37": order.get("ndsOrderId"),
            "38": order["quantity"],
            "40": "2",
            "41": order["clOrdId"],
            "48": order["contractId"],
            "54": "1" if order["side"] == "BUY" else "2",
            "60": fix_timestamp(),
            "440": "CM001",
            "528": "4",
            "10004": order.get("lastActivityTimestamp", 0),
            "10005": "00000",
            "10010": "C", # C = Cancel, H = Hold
        }

    def to_raw_fix_preview(self, fix_object: Dict[str, Any]) -> str:
        """Developer preview string only. Real FIX requires BodyLength and CheckSum.

        Use a FIX engine for production serialization.
        """
        return SOH.join(f"{k}={v}" for k, v in fix_object.items()) + SOH


fix_builder = FixMessageBuilder()
