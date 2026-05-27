from __future__ import annotations

import time
from typing import Any, Dict


class MockFixAdapter:
    """Local mock of NDS-OM / CCIL FIX behavior.

    Returns Execution Report 35=8 for place/modify/cancel requests.
    """

    def send_new_order(self, fix_message: Dict[str, Any]) -> Dict[str, Any]:
        qty = int(fix_message["38"])
        if qty <= 0:
            return self.business_reject(fix_message, "Invalid quantity")

        return {
            "35": "8",
            "11": fix_message["11"],
            "17": f"EXEC-{int(time.time() * 1000)}",
            "37": f"NDS-{int(time.time() * 1000)}",
            "38": fix_message["38"],
            "39": "0",       # 0 = New/Released
            "40": fix_message["40"],
            "44": fix_message["44"],
            "48": fix_message["48"],
            "54": fix_message["54"],
            "58": "Normal Order Accepted",
            "60": fix_message["60"],
            "150": "0",      # 0 = New Order response
            "151": fix_message["38"],
            "440": fix_message["440"],
            "528": fix_message["528"],
            "10004": int(time.time()),
            "10005": "00000",
        }

    def send_modify_order(self, fix_message: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "35": "8",
            "11": fix_message["11"],
            "17": f"EXEC-{int(time.time() * 1000)}",
            "37": fix_message["37"],
            "38": fix_message["38"],
            "39": "5",       # 5 = Replaced
            "40": fix_message["40"],
            "44": fix_message["44"],
            "48": fix_message["48"],
            "54": fix_message["54"],
            "58": "Normal Order Replaced",
            "60": fix_message["60"],
            "150": "5",      # 5 = Modified order response
            "151": fix_message["38"],
            "10004": int(time.time()),
            "10005": "00000",
        }

    def send_cancel_order(self, fix_message: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "35": "8",
            "11": fix_message["11"],
            "17": f"EXEC-{int(time.time() * 1000)}",
            "37": fix_message["37"],
            "38": fix_message["38"],
            "39": "4",       # 4 = Cancelled
            "40": fix_message["40"],
            "48": fix_message["48"],
            "54": fix_message["54"],
            "58": "Order Cancelled",
            "60": fix_message["60"],
            "150": "4",      # 4 = Cancelled order response
            "151": 0,
            "10004": int(time.time()),
            "10005": "00000",
        }

    def business_reject(self, fix_message: Dict[str, Any], reason: str) -> Dict[str, Any]:
        return {
            "35": "j",
            "11": fix_message.get("11"),
            "58": reason,
        }


mock_fix_adapter = MockFixAdapter()
