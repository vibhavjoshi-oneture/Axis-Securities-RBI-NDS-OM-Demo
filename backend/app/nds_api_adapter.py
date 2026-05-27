from __future__ import annotations
import json
import urllib.request
import urllib.error
from typing import Any, Dict, Optional

class NdsApiAdapter:
    """
    HTTP Client adapter to communicate with the Go NDS-OM Wrapper APIs.
    """
    def __init__(self, base_url: str = "http://localhost:8082"):
        self.base_url = base_url

    def _post(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        data = json.dumps(payload).encode('utf-8')
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                response_body = response.read().decode('utf-8')
                return json.loads(response_body)
        except urllib.error.HTTPError as e:
            try:
                error_body = e.read().decode('utf-8')
                return {"error": True, "status_code": e.code, "message": json.loads(error_body).get("error", "Unknown error")}
            except Exception:
                return {"error": True, "status_code": e.code, "message": str(e)}
        except Exception as e:
            return {"error": True, "message": str(e)}

    def send_new_order(self, order_req: Dict[str, Any]) -> Dict[str, Any]:
        """Sends a create order request to the Go Wrapper."""
        payload = {
            "client_order_id": order_req["clOrdId"],
            "symbol": order_req["contractId"],
            "side": order_req["side"],
            "quantity": int(order_req["quantity"]),
            "price": float(order_req["limitPrice"])
        }
        return self._post("/api/order/create", payload)

    def send_modify_order(self, order_req: Dict[str, Any]) -> Dict[str, Any]:
        """Sends a modify order request to the Go Wrapper."""
        payload = {
            "client_order_id": order_req["newClOrdId"],
            "orig_client_order_id": order_req["origClOrdId"],
            "nds_order_id": order_req.get("ndsOrderId", ""),
            "symbol": order_req["contractId"],
            "side": order_req["side"],
            "quantity": int(order_req["quantity"]),
            "price": float(order_req["limitPrice"]),
            "prev_quantity": int(order_req["prevQuantity"]),
            "prev_price": float(order_req["prevPrice"]),
            "last_activity_timestamp": int(order_req.get("lastActivityTimestamp", 0))
        }
        return self._post("/api/order/modify", payload)

    def send_cancel_order(self, order_req: Dict[str, Any]) -> Dict[str, Any]:
        """Sends a cancel order request to the Go Wrapper."""
        payload = {
            "client_order_id": order_req["newClOrdId"],
            "orig_client_order_id": order_req["origClOrdId"],
            "nds_order_id": order_req.get("ndsOrderId", ""),
            "symbol": order_req["contractId"],
            "side": order_req["side"],
            "quantity": int(order_req["quantity"]),
            "last_activity_timestamp": int(order_req.get("lastActivityTimestamp", 0))
        }
        return self._post("/api/order/cancel", payload)

nds_api_adapter = NdsApiAdapter()
