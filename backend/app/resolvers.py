from __future__ import annotations
import json
import asyncio
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List
from ariadne import MutationType, QueryType

from .auth import generate_session_token
from .crud_handler import lambda_handler
from .fix_builder import cl_ord_id_generator, fix_builder
from .nds_api_adapter import nds_api_adapter
from .pubsub import pubsub
from .store import store
import random
import time

query = QueryType()
mutation = MutationType()

class BusinessValidationError(Exception):
    pass

def order_value(quantity: int, price: float) -> float:
    return round((quantity * price) / 100, 2)

def is_multiple(value: float, step: float) -> bool:
    try:
        value_dec = Decimal(str(value))
        step_dec = Decimal(str(step))
        return (value_dec / step_dec) % 1 == 0
    except (InvalidOperation, ZeroDivisionError):
        return False

# Public authentication mutation
@mutation.field("login")
def resolve_login(_, info, customercode: str, pan: str):
    customer = store.get_customer(customercode)
    if not customer or customer["pan"].upper() != pan.upper():
        raise BusinessValidationError("Invalid customer credentials")
    
    token = generate_session_token(customercode, customer["name"])
    return {
        "token": token,
        "customercode": customercode,
        "name": customer["name"]
    }

def validate_order_rules(input_data: Dict[str, Any], customer: Dict[str, Any], security: Dict[str, Any]) -> float:
    if not customer:
        raise BusinessValidationError("Customer not found")
    if customer["status"] != "ACTIVE":
        raise BusinessValidationError("Customer is not active")
    if not customer["gsecenabled"]:
        raise BusinessValidationError("Customer is not enabled for G-Sec trading")
        
    if not security:
        raise BusinessValidationError("Security not found in dynamic securities master (CCIL checks failed)")
        
    if input_data["ordertype"] != "LIMIT":
        raise BusinessValidationError("Only LIMIT orders are allowed in this POC")
    if input_data["quantity"] <= 0:
        raise BusinessValidationError("Quantity must be greater than zero")
        
    if input_data["quantity"] % int(security["lotsize"]) != 0:
        raise BusinessValidationError(f"Quantity must be multiple of lot size {security['lotsize']}")
        
    if not is_multiple(float(input_data["limitprice"]), float(security["ticksize"])):
        raise BusinessValidationError(f"Price must be multiple of tick size {security['ticksize']}")

    value = order_value(int(input_data["quantity"]), float(input_data["limitprice"]))
    if value > 10000000:
        raise BusinessValidationError("Single order value cannot exceed ₹1 crore")
    return value

def execution_report_to_status(exec_report: Dict[str, Any]) -> str:
    exec_type = str(exec_report.get("150"))
    ord_status = str(exec_report.get("39"))
    if exec_type == "0" and ord_status == "0":
        return "ACCEPTED"
    if exec_type == "4" and ord_status == "4":
        return "CANCELLED"
    if exec_type == "5" and ord_status == "5":
        return "MODIFIED"
    if exec_type == "8" and ord_status == "8":
        return "REJECTED"
    return "SENT_TO_FIX"

def serialize_json(value: Dict[str, Any]) -> str:
    return json.dumps(value, separators=(",", ":"), default=str)

# Pre/Post Order Mutation Interceptors (Rich OMS business rules + Mock FIX connection)
def handle_create_orders_hook(auth_code: str, kwargs: dict) -> dict:
    input_args = kwargs["input"]
    input_args["customercode"] = auth_code
    
    # Check lowercase parameter mapping
    input_args = {k.lower(): v for k, v in input_args.items()}
    
    customer = store.get_customer(auth_code)
    security = store.get_security(input_args["isin"])
    
    value = validate_order_rules(input_args, customer, security)
    
    if input_args["side"] == "BUY":
        funds = store.get_funds(auth_code)
        if funds["availablebalance"] < value:
            raise BusinessValidationError("Available G-Sec funds are not sufficient")
        store.block_funds(auth_code, value)
    else:
        # Check sell demat positions
        current_qty = store.get_position_quantity(auth_code, input_args["isin"])
        if current_qty < input_args["quantity"]:
            raise BusinessValidationError("Insufficient demat holding quantity for SELL order")
            
    cl_ord_id = cl_ord_id_generator.next()
    
    # Store dynamic order initially
    event_place = {
        "info": {"fieldName": "createPublic_orders"},
        "arguments": {
            "input": {
                "customercode": auth_code,
                "clientid": "CL001",
                "clordid": cl_ord_id,
                "ndsorderid": None,
                "isin": security["isin"],
                "contractid": security["contractid"],
                "securityname": security["name"],
                "side": input_args["side"],
                "ordertype": input_args["ordertype"],
                "quantity": int(input_args["quantity"]),
                "limitprice": float(input_args["limitprice"]),
                "ordervalue": value,
                "status": "VALIDATED",
                "message": "Order validated by OMS",
                "lastactivitytimestamp": 0,
                "fixrequest": None,
                "fixresponse": None
            }
        }
    }
    
    order = lambda_handler(event_place, None)
    
    # Build HTTP request for Go wrapper
    req = {
        "clOrdId": cl_ord_id,
        "contractId": security["contractid"],
        "side": input_args["side"],
        "quantity": int(input_args["quantity"]),
        "limitPrice": float(input_args["limitprice"])
    }
    
    # Call Go HTTP adapter
    res = nds_api_adapter.send_new_order(req)
    
    status = "SENT_TO_FIX" if res.get("status") in ("queued", "created") else "REJECTED"
    
    # Update Order table
    event_update = {
        "info": {"fieldName": "updatePublic_orders"},
        "arguments": {
            "input": {
                "order_id": order["order_id"],
                "status": status,
                "ndsorderid": res.get("nds_order_id"),
                "message": res.get("message", "Sent to API"),
                "fixrequest": serialize_json(req),
                "fixresponse": serialize_json(res)
            }
        }
    }
    
    updated_order = lambda_handler(event_update, None)
    
    # Log Audit Event
    store.log_audit("PLACE_ORDER", {"input": input_args, "orderId": order["order_id"]})
    
    # Trigger matching engine simulated execution (Async CCIL Simulation)
    async def simulate_ccil_lifecycle(order_id: int, original_value: float, side: str, auth_code: str):
        await asyncio.sleep(1.5)
        
        current_order = store.get_order(order_id)
        if not current_order or current_order["status"] != "SENT_TO_FIX":
            return
            
        # 1. Simulate CCIL Validation (Random 10% reject to mimic real behavior)
        is_rejected = random.random() < 0.10
        if is_rejected:
            new_status = "REJECTED"
            msg = "Rejected by CCIL Validation Simulator"
        else:
            new_status = "ACCEPTED"
            msg = "Order Accepted by CCIL Matching Engine"
            
        event_ack = {
            "info": {"fieldName": "updatePublic_orders"},
            "arguments": {
                "input": {
                    "order_id": order_id,
                    "status": new_status,
                    "message": msg
                }
            }
        }
        ack_order = lambda_handler(event_ack, None)
        pubsub.publish_sync(f"order:{auth_code}", ack_order)
        
        if is_rejected:
            # Rollback funds/positions
            if side == "BUY":
                store.release_funds(auth_code, original_value)
                pubsub.publish_sync(f"funds:{auth_code}", store.get_funds(auth_code))
            return
            
        # 2. Simulate order book matching delay
        await asyncio.sleep(2.5)
        store.execute_simulated_trade(order_id)

    asyncio.ensure_future(simulate_ccil_lifecycle(updated_order["order_id"], value, input_args["side"], auth_code))
    
    # Pub/Sub triggers
    pubsub.publish_sync(f"order:{auth_code}", updated_order)
    pubsub.publish_sync(f"funds:{auth_code}", store.get_funds(auth_code))
    
    return updated_order

def handle_update_orders_hook(auth_code: str, kwargs: dict) -> dict:
    input_args = kwargs["input"]
    input_args = {k.lower(): v for k, v in input_args.items()}
    
    order_id = input_args["order_id"]
    order = store.get_order(order_id)
    if not order:
        raise BusinessValidationError("Order not found")
        
    if order["customercode"] != auth_code:
        raise BusinessValidationError("Not Authorized")
        
    # Check if request is order modification or cancellation
    if "status" in input_args and input_args["status"] == "CANCELLED":
        # Cancel order execution
        if order["status"] not in ("ACCEPTED", "MODIFIED"):
            raise BusinessValidationError("Only accepted/open orders can be cancelled")
            
        req = {
            "newClOrdId": cl_ord_id_generator.next(),
            "origClOrdId": order["clordid"],
            "ndsOrderId": order.get("ndsorderid", ""),
            "contractId": order["contractid"],
            "side": order["side"],
            "quantity": int(order["quantity"]),
            "lastActivityTimestamp": int(time.time() * 1000)
        }
        res = nds_api_adapter.send_cancel_order(req)
        status = "CANCELLED" if res.get("status") in ("queued", "cancelled") else "REJECTED"
        
        if order["side"] == "BUY" and status == "CANCELLED":
            store.release_funds(auth_code, float(order["ordervalue"]))
            
        event_cancel = {
            "info": {"fieldName": "updatePublic_orders"},
            "arguments": {
                "input": {
                    "order_id": order_id,
                    "status": status,
                    "message": res.get("message", "Order cancelled manually by user."),
                    "fixrequest": serialize_json(req),
                    "fixresponse": serialize_json(res)
                }
            }
        }
        updated_order = lambda_handler(event_cancel, None)
        store.log_audit("CANCEL_ORDER", {"orderId": order_id})
        
        # PubSub
        pubsub.publish_sync(f"order:{auth_code}", updated_order)
        pubsub.publish_sync(f"funds:{auth_code}", store.get_funds(auth_code))
        return updated_order
        
    else:
        # Modification execution
        if order["status"] not in ("ACCEPTED", "MODIFIED"):
            raise BusinessValidationError("Only accepted/open orders can be modified")
            
        new_qty = int(input_args.get("quantity", order["quantity"]))
        new_price = float(input_args.get("limitprice", order["limitprice"]))
        
        customer = store.get_customer(auth_code)
        security = store.get_security(order["isin"])
        
        validation_input = {
            "customercode": auth_code,
            "isin": order["isin"],
            "side": order["side"],
            "ordertype": "LIMIT",
            "quantity": new_qty,
            "limitprice": new_price
        }
        new_value = validate_order_rules(validation_input, customer, security)
        
        if order["side"] == "BUY":
            funds = store.get_funds(auth_code)
            delta = new_value - float(order["ordervalue"])
            if delta > 0 and funds["availablebalance"] < delta:
                raise BusinessValidationError("Available G-Sec funds are not sufficient for modification")
            if delta > 0:
                store.block_funds(auth_code, delta)
            elif delta < 0:
                store.release_funds(auth_code, abs(delta))
                
        req = {
            "newClOrdId": cl_ord_id_generator.next(),
            "origClOrdId": order["clordid"],
            "ndsOrderId": order.get("ndsorderid", ""),
            "contractId": order["contractid"],
            "side": order["side"],
            "quantity": new_qty,
            "limitPrice": new_price,
            "prevQuantity": int(order["quantity"]),
            "prevPrice": float(order["limitprice"]),
            "lastActivityTimestamp": int(time.time() * 1000)
        }
        
        res = nds_api_adapter.send_modify_order(req)
        status = "MODIFIED" if res.get("status") in ("queued", "updated") else "REJECTED"
        
        event_modify = {
            "info": {"fieldName": "updatePublic_orders"},
            "arguments": {
                "input": {
                    "order_id": order_id,
                    "quantity": new_qty,
                    "limitprice": new_price,
                    "ordervalue": new_value,
                    "status": status,
                    "message": res.get("message", "Order modified"),
                    "fixrequest": serialize_json(req),
                    "fixresponse": serialize_json(res)
                }
            }
        }
        updated_order = lambda_handler(event_modify, None)
        store.log_audit("MODIFY_ORDER", {"input": input_args, "orderId": order_id})
        
        # Trigger matching engine simulated execution again since it's modified and still open
        async def simulate_ccil_modification(order_id: int):
            await asyncio.sleep(2.5)
            store.execute_simulated_trade(order_id)
        
        if status == "MODIFIED":
            asyncio.ensure_future(simulate_ccil_modification(updated_order["order_id"]))
            
        # PubSub
        pubsub.publish_sync(f"order:{auth_code}", updated_order)
        pubsub.publish_sync(f"funds:{auth_code}", store.get_funds(auth_code))
        return updated_order

def handle_create_ledger_entries_hook(auth_code: str, kwargs: dict) -> dict:
    input_args = kwargs["input"]
    input_args["customercode"] = auth_code

    # 1. First delegate to lambda_handler to insert ledger entry
    event = {
        "arguments": kwargs,
        "info": {"fieldName": "createPublic_ledger_entries"}
    }
    ledger_entry = lambda_handler(event, None)

    # 2. Adjust funds table available balance based on ledger transaction type
    amount = float(input_args["amount"])
    entry_type = input_args["type"].upper()

    if entry_type == "DEPOSIT":
        store.deposit_funds(auth_code, amount)
    elif entry_type == "WITHDRAW":
        funds = store.get_funds(auth_code)
        if funds["availablebalance"] < amount:
            raise BusinessValidationError("Insufficient G-Sec funds for withdrawal")
        store.withdraw_funds(auth_code, amount)

    # 3. Publish updated funds to WS pubsub
    fresh_funds = store.get_funds(auth_code)
    pubsub.publish_sync(f"funds:{auth_code}", fresh_funds)

    return ledger_entry

# Primary dynamic resolver hook
def dynamic_resolver(obj, info, **kwargs):
    fieldname = info.field_name
    
    # 1. Enforce Authentication Check
    identity = info.context.get("identity")
    if not identity:
        raise Exception("Not Authorized")
        
    auth_customer_code = identity["customercode"]
    
    # 2. Mutator Interceptor Hooks
    if fieldname == "createPublic_orders":
        return handle_create_orders_hook(auth_customer_code, kwargs)
    elif fieldname == "updatePublic_orders":
        return handle_update_orders_hook(auth_customer_code, kwargs)
    elif fieldname == "createPublic_ledger_entries":
        return handle_create_ledger_entries_hook(auth_customer_code, kwargs)
        
    # 3. Fine-Grained Tenant Isolation & Constraints
    if "input" in kwargs:
        input_args = kwargs["input"]
        # Enforce writing to own customer code for other private tables
        if "customercode" in input_args and input_args["customercode"] != auth_customer_code:
            raise Exception("Not Authorized")
        input_args["customercode"] = auth_customer_code
    else:
        if "filter" not in kwargs or kwargs["filter"] is None:
            kwargs["filter"] = {}
        filter_args = kwargs["filter"]
        
        # Lock filter on private tables to authenticated customer
        if fieldname != "getPublic_securities":
            if "customercode" in filter_args and filter_args["customercode"] != auth_customer_code:
                raise Exception("Not Authorized")
            filter_args["customercode"] = auth_customer_code
            
    # Delegate to psycopg2 CRUD query builder
    event = {
        "arguments": kwargs,
        "info": {"fieldName": fieldname}
    }
    return lambda_handler(event, None)

# Dynamically set fields
for q_field in ["getPublic_securities", "getPublic_customers", "getPublic_funds", "getPublic_positions", "getPublic_orders", "getPublic_trades", "getPublic_ledger_entries", "getPublic_audit_events"]:
    query.set_field(q_field, dynamic_resolver)
    
for m_field in ["createPublic_orders", "updatePublic_orders", "createPublic_ledger_entries"]:
    mutation.set_field(m_field, dynamic_resolver)

resolvers = [query, mutation]
