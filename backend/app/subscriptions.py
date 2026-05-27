from __future__ import annotations
import asyncio
from typing import Any, AsyncGenerator, Dict
from ariadne import SubscriptionType

from .pubsub import pubsub
from .store import store

subscription = SubscriptionType()

def _order_to_event(order: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "orderId": order["order_id"],
        "clOrdId": order["clordid"],
        "ndsOrderId": order.get("ndsorderid"),
        "isin": order["isin"],
        "securityName": order["securityname"],
        "side": order["side"],
        "quantity": order["quantity"],
        "limitPrice": float(order["limitprice"]),
        "orderValue": float(order["ordervalue"]),
        "status": order["status"],
        "message": order.get("message"),
        "updatedAt": str(order["updatedat"]),
    }

@subscription.source("orderStatusChanged")
async def order_status_source(_, info, customerCode: str) -> AsyncGenerator[Dict[str, Any], None]:
    identity = info.context.get("identity")
    if not identity:
        raise Exception("Not Authorized")
        
    # Tenant verification
    if identity["customercode"] != customerCode:
        raise Exception("Not Authorized")
        
    async for event in pubsub.subscribe(f"order:{customerCode}"):
        yield event

@subscription.field("orderStatusChanged")
def order_status_resolver(event: Dict[str, Any], info, customerCode: str) -> Dict[str, Any]:
    return _order_to_event(event)

@subscription.source("securitiesUpdated")
async def securities_source(_, info) -> AsyncGenerator[Any, None]:
    identity = info.context.get("identity")
    if not identity:
        raise Exception("Not Authorized")
        
    while True:
        # Retrieve CCIL securities dynamically from database
        securities = store.list_securities()
        yield securities
        await asyncio.sleep(5)

@subscription.field("securitiesUpdated")
def securities_resolver(securities, info):
    return securities

@subscription.source("fundsUpdated")
async def funds_source(_, info, customerCode: str) -> AsyncGenerator[Dict[str, Any], None]:
    identity = info.context.get("identity")
    if not identity:
        raise Exception("Not Authorized")
        
    # Tenant verification
    if identity["customercode"] != customerCode:
        raise Exception("Not Authorized")
        
    async for event in pubsub.subscribe(f"funds:{customerCode}"):
        yield event

@subscription.field("fundsUpdated")
def funds_resolver(event: Dict[str, Any], info, customerCode: str) -> Dict[str, Any]:
    return {
        "customerCode": event["customercode"],
        "availableBalance": float(event["availablebalance"]),
        "blockedBalance": float(event["blockedbalance"]),
        "usedToday": float(event["usedtoday"])
    }
