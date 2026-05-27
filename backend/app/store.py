from __future__ import annotations
from datetime import datetime, timezone
import urllib.request
import json
import time
from typing import Any, Dict, List, Optional
from psycopg2.extras import RealDictCursor

from .crud_handler import get_db_connection, serialize
from .pubsub import pubsub

class DatabaseStore:
    def sync_ccil_securities_to_db(self) -> None:
        """
        Scrapes live CCIL public listed bonds (G-Sec, T-Bills, and SDLs)
        and batch upserts them into ndsom.securities.
        """
        url = 'https://www.ccilindia.com/market-watch?p_p_id=com_ccil_ndsom_marketwatch_CcilNDSOMMarketWatchPortlet_INSTANCE_swas&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=NDSOMCG&p_p_cacheability=cacheLevelPage'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                result1_str = data.get('result1', '[]').replace('\n', '').replace('\r', '')
                raw_securities = json.loads(result1_str)
                
                parsed_securities = []
                for item in raw_securities:
                    name = item.get('ismt_idnt', '').strip()
                    if not name:
                        continue
                    isin = name.replace(' ', '')
                    if len(isin) > 12:
                        isin = isin[:12]
                    elif len(isin) < 12:
                        isin = isin.ljust(12, '0')
                        
                    # Standardize dates
                    mdate_raw = item.get('mrty_date', '')
                    try:
                        # Convert e.g., '14-Aug-2033' to standard YYYY-MM-DD
                        mdate = datetime.strptime(mdate_raw, "%d-%b-%Y").date().isoformat()
                    except Exception:
                        mdate = "2033-08-14"
                        
                    bid = float(item.get('c', 99.8500) or 99.8500)
                    ask = float(item.get('d', 99.8800) or 99.8800)
                    ltp = float(item.get('lty', 99.8600) or 99.8600)
                    
                    parsed_securities.append((
                        isin,
                        name,
                        name,
                        name.split(' ')[0] + "%" if ' ' in name else '0%',
                        mdate,
                        bid,
                        ask,
                        ltp,
                        item.get('ltp', '7.18') + "%",
                        10000,
                        0.0005
                    ))
                
                if parsed_securities:
                    with get_db_connection() as conn:
                        with conn.cursor() as cur:
                            cur.executemany(
                                """
                                INSERT INTO ndsom.securities (isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (isin) DO UPDATE SET
                                    contractid = EXCLUDED.contractid,
                                    name = EXCLUDED.name,
                                    coupon = EXCLUDED.coupon,
                                    maturitydate = EXCLUDED.maturitydate,
                                    bid = EXCLUDED.bid,
                                    ask = EXCLUDED.ask,
                                    ltp = EXCLUDED.ltp,
                                    yield = EXCLUDED.yield
                                """,
                                parsed_securities
                            )
                            conn.commit()
                            print(f"Upserted {len(parsed_securities)} live CCIL securities.")
        except Exception as e:
            print(f"Error syncing CCIL live securities to database: {e}")

    def list_securities(self) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM ndsom.securities ORDER BY isin")
                return [serialize(row) for row in cur.fetchall()]

    def get_security(self, isin: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM ndsom.securities WHERE isin = %s", (isin,))
                row = cur.fetchone()
                return serialize(row) if row else None

    def get_customer(self, customer_code: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM ndsom.customers WHERE customercode = %s", (customer_code,))
                row = cur.fetchone()
                return serialize(row) if row else None

    def get_funds(self, customer_code: str) -> Dict[str, Any]:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM ndsom.funds WHERE customercode = %s", (customer_code,))
                return serialize(cur.fetchone())

    def block_funds(self, customer_code: str, amount: float) -> None:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE ndsom.funds 
                    SET availablebalance = availablebalance - %s, blockedbalance = blockedbalance + %s 
                    WHERE customercode = %s
                    """,
                    (amount, amount, customer_code)
                )
                conn.commit()

    def release_funds(self, customer_code: str, amount: float) -> None:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE ndsom.funds 
                    SET blockedbalance = GREATEST(0.00, blockedbalance - %s), availablebalance = availablebalance + %s 
                    WHERE customercode = %s
                    """,
                    (amount, amount, customer_code)
                )
                conn.commit()

    def deposit_funds(self, customer_code: str, amount: float) -> None:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE ndsom.funds 
                    SET availablebalance = availablebalance + %s 
                    WHERE customercode = %s
                    """,
                    (amount, customer_code)
                )
                conn.commit()

    def withdraw_funds(self, customer_code: str, amount: float) -> None:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE ndsom.funds 
                    SET availablebalance = GREATEST(0.00, availablebalance - %s) 
                    WHERE customercode = %s
                    """,
                    (amount, customer_code)
                )
                conn.commit()

    def consume_blocked_funds(self, customer_code: str, amount: float) -> None:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE ndsom.funds 
                    SET blockedbalance = GREATEST(0.00, blockedbalance - %s), usedtoday = usedtoday + %s 
                    WHERE customercode = %s
                    """,
                    (amount, amount, customer_code)
                )
                conn.commit()

    def get_position_quantity(self, customer_code: str, isin: str) -> int:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT quantity FROM ndsom.positions WHERE customercode = %s AND isin = %s", (customer_code, isin))
                row = cur.fetchone()
                return int(row[0]) if row else 0

    def get_order(self, order_id: int) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM ndsom.orders WHERE order_id = %s", (order_id,))
                row = cur.fetchone()
                return serialize(row) if row else None

    def log_audit(self, event_type: str, payload: Dict[str, Any]) -> None:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO ndsom.audit_events (eventtype, payload) VALUES (%s, %s)",
                    (event_type, json.dumps(payload, default=str))
                )
                conn.commit()

    def execute_simulated_trade(self, order_id: int) -> None:
        """Clearing corporation simulator completing order executions, trade ledgers and demat holdings."""
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM ndsom.orders WHERE order_id = %s", (order_id,))
                order = cur.fetchone()
                if not order or order["status"] not in ("ACCEPTED", "SENT_TO_FIX", "VALIDATED", "MODIFIED"):
                    return
                
                # Update order to EXECUTED
                cur.execute(
                    """
                    UPDATE ndsom.orders 
                    SET status = 'EXECUTED', message = 'All allocations executed and completed on clearing corporation (T+1).', updatedat = CURRENT_TIMESTAMP
                    WHERE order_id = %s RETURNING *
                    """,
                    (order_id,)
                )
                updated_order = serialize(cur.fetchone())
                
                # Insert trade row
                cur.execute(
                    """
                    INSERT INTO ndsom.trades (customercode, orderid, isin, securityname, side, quantity, price, tradevalue)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                    """,
                    (order["customercode"], order_id, order["isin"], order["securityname"], order["side"], order["quantity"], order["limitprice"], order["ordervalue"])
                )
                trade = serialize(cur.fetchone())
                
                # Adjust CDSL demat positions
                cur.execute("SELECT * FROM ndsom.positions WHERE customercode = %s AND isin = %s", (order["customercode"], order["isin"]))
                pos = cur.fetchone()
                
                if order["side"] == "BUY":
                    if pos:
                        new_qty = int(pos["quantity"]) + int(order["quantity"])
                        new_val = float(pos["marketvalue"]) + float(order["ordervalue"])
                        new_avg = round(((float(pos["quantity"]) * float(pos["averageprice"])) + (float(order["quantity"]) * float(order["limitprice"]))) / new_qty, 4)
                        cur.execute(
                            "UPDATE ndsom.positions SET quantity = %s, marketvalue = %s, averageprice = %s WHERE position_id = %s",
                            (new_qty, new_val, new_avg, pos["position_id"])
                        )
                    else:
                        cur.execute(
                            """
                            INSERT INTO ndsom.positions (customercode, isin, securityname, quantity, averageprice, marketvalue)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            """,
                            (order["customercode"], order["isin"], order["securityname"], order["quantity"], order["limitprice"], order["ordervalue"])
                        )
                    
                    # Settle escrow funds
                    cur.execute(
                        "UPDATE ndsom.funds SET blockedbalance = GREATEST(0.00, blockedbalance - %s), usedtoday = usedtoday + %s WHERE customercode = %s",
                        (order["ordervalue"], order["ordervalue"], order["customercode"])
                    )
                    
                    # Ledger Release and clearing settlement logs
                    cur.execute(
                        """
                        INSERT INTO ndsom.ledger_entries (customercode, type, amount, balanceafter, referenceid, status, description)
                        VALUES (%s, 'RELEASE', %s, (SELECT availablebalance FROM ndsom.funds WHERE customercode = %s), %s, 'COMPLETED', %s)
                        """,
                        (order["customercode"], order["ordervalue"], order["customercode"], f"T-{trade['trade_id']}", f"Escrow block released on execution match: {order['securityname']}")
                    )
                else:
                    # SELL
                    if pos:
                        new_qty = int(pos["quantity"]) - int(order["quantity"])
                        if new_qty <= 0:
                            cur.execute("DELETE FROM ndsom.positions WHERE position_id = %s", (pos["position_id"],))
                        else:
                            new_val = float(pos["marketvalue"]) - float(order["ordervalue"])
                            cur.execute(
                                "UPDATE ndsom.positions SET quantity = %s, marketvalue = %s WHERE position_id = %s",
                                (new_qty, new_val, pos["position_id"])
                            )
                    
                    # Add sale settlement cash directly to Available G-Sec cash
                    cur.execute(
                        "UPDATE ndsom.funds SET availablebalance = availablebalance + %s, usedtoday = usedtoday + %s WHERE customercode = %s",
                        (order["ordervalue"], order["ordervalue"], order["customercode"])
                    )
                    
                    # Ledger credit
                    cur.execute(
                        """
                        INSERT INTO ndsom.ledger_entries (customercode, type, amount, balanceafter, referenceid, status, description)
                        VALUES (%s, 'DEPOSIT', %s, (SELECT availablebalance FROM ndsom.funds WHERE customercode = %s), %s, 'COMPLETED', %s)
                        """,
                        (order["customercode"], order["ordervalue"], order["customercode"], f"T-{trade['trade_id']}", f"ICCL sale settlement credit: {order['securityname']}")
                    )
                
                cur.execute("SELECT * FROM ndsom.funds WHERE customercode = %s", (order["customercode"],))
                fresh_funds = serialize(cur.fetchone())
                
                conn.commit()
                
                # Push real-time WS triggers
                pubsub.publish_sync(f"order:{order['customercode']}", updated_order)
                pubsub.publish_sync(f"funds:{order['customercode']}", fresh_funds)

    def get_positions(self, customer_code: str) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM ndsom.positions WHERE customercode = %s", (customer_code,))
                return [serialize(row) for row in cur.fetchall()]

store = DatabaseStore()
