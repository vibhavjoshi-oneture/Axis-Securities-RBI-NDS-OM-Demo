import { useEffect, useRef, useMemo, useState } from 'react';
import {
  graphqlRequest, QUERIES
} from './graphql';
import {
  subscribeToOrderStatus,
  subscribeToSecurities,
  subscribeToFunds,
  disposeSubscriptionClient,
} from './subscriptions';
import {
  Landmark, Wallet, Globe, ShoppingBag, ClipboardList,
  TrendingUp, FolderHeart, Coins, Cpu, ShieldCheck,
  Menu, X, RefreshCw, AlertTriangle, LogOut, CheckCircle,
  Radio,
} from 'lucide-react';
import type {
  BootstrapData, FundsSummary, Order, OrderSide,
  Position, Security, Trade, LedgerEntry, AuditEvent
} from './types';

// modular imports
import DashboardPage from './components/DashboardPage';
import MarketWatchPage from './components/MarketWatchPage';
import SecurityDetailPage from './components/SecurityDetailPage';
import PlaceOrderPage from './components/PlaceOrderPage';
import OrderBookPage from './components/OrderBookPage';
import TradeBookPage from './components/TradeBookPage';
import PortfolioPage from './components/PortfolioPage';
import FundsLedgerPage from './components/FundsLedgerPage';
import AdminDemo from './components/AdminDemo';
import Toast, { ToastMessage } from './components/Toast';

import './styles.css';

const CUSTOMER_CODE = 'ASL-DEMO-1001';

type Page = 'dashboard' | 'market' | 'order' | 'orders' | 'trades' | 'portfolio' | 'funds' | 'admin';
type ExtendedPage = Page | 'security';

// Pre-populated sovereign securities for local simulated fallback
const MOCK_SECURITIES: Security[] = [
  {
    isin: 'IN0020230085',
    contractId: '7.18 GS 2033',
    name: '7.18% Government Security 2033',
    coupon: '7.18%',
    maturityDate: '2033-08-14',
    bid: 99.8540,
    ask: 99.8820,
    ltp: 99.8650,
    yield: '7.18%',
    lotSize: 10000,
    tickSize: 0.0005,
  },
  {
    isin: 'IN0020220011',
    contractId: '7.26 GS 2032',
    name: '7.26% Government Security 2032',
    coupon: '7.26%',
    maturityDate: '2032-02-06',
    bid: 100.1220,
    ask: 100.1510,
    ltp: 100.1400,
    yield: '7.24%',
    lotSize: 10000,
    tickSize: 0.0005,
  },
  {
    isin: 'IN002023X012',
    contractId: '91 DTB 22062026',
    name: '91 Days Treasury Bill 2026',
    coupon: '0.00%',
    maturityDate: '2026-06-22',
    bid: 98.2450,
    ask: 98.2600,
    ltp: 98.2520,
    yield: '6.85%',
    lotSize: 10000,
    tickSize: 0.0005,
  },
  {
    isin: 'IN0020150036',
    contractId: '6.89 GS 2025',
    name: '6.89% Government Security 2025',
    coupon: '6.89%',
    maturityDate: '2025-10-15',
    bid: 99.9410,
    ask: 99.9620,
    ltp: 99.9500,
    yield: '6.90%',
    lotSize: 10000,
    tickSize: 0.0005,
  },
  {
    isin: 'IN0020210244',
    contractId: '8.20 SDL 2028',
    name: '8.20% Maharashtra State Dev Loan 2028',
    coupon: '8.20%',
    maturityDate: '2028-11-20',
    bid: 102.4500,
    ask: 102.4850,
    ltp: 102.4600,
    yield: '7.45%',
    lotSize: 10000,
    tickSize: 0.0005,
  }
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState<ExtendedPage>('dashboard');
  const [loading, setLoading] = useState(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Refs to hold unsubscribe functions so we can clean up on logout / unmount
  const unsubOrderRef = useRef<(() => void) | null>(null);
  const unsubSecRef = useRef<(() => void) | null>(null);
  const unsubFundsRef = useRef<(() => void) | null>(null);

  // App Data State (Securities, Orders, Trades, Portfolio, Funds, Ledgers, Audit trail)
  const [securities, setSecurities] = useState<Security[]>(MOCK_SECURITIES);
  const [funds, setFunds] = useState<FundsSummary>({
    customerCode: CUSTOMER_CODE,
    availableBalance: 2500000, // ₹25L starting
    blockedBalance: 0,
    usedToday: 0
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([
    {
      id: 'L-INIT-01',
      timestamp: new Date(Date.now() - 36000000).toISOString(),
      type: 'DEPOSIT',
      amount: 2500000,
      balanceAfter: 2500000,
      referenceId: 'REF-TXN-00921',
      status: 'COMPLETED',
      description: 'Opening sovereign allocation balance transfer'
    }
  ]);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([
    {
      id: 'A-INIT-01',
      timestamp: new Date().toISOString(),
      title: 'Platform Initialization',
      type: 'SYSTEM',
      details: 'Axis Securities G-Sec trading module loaded successfully in browser.',
      success: true
    }
  ]);

  const [selectedSecurity, setSelectedSecurity] = useState<Security>(MOCK_SECURITIES[0]);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Add event helper to audit terminal
  function logAuditEvent(title: string, type: AuditEvent['type'], details: string, success: boolean = true) {
    const newEvent: AuditEvent = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      title,
      type,
      details,
      success
    };
    setAuditTrail(prev => [newEvent, ...prev]);
  }

  // Flash toast message helper
  function triggerToast(text: string, type: ToastMessage['type'] = 'info') {
    setToast({ id: String(Date.now()), type, text });
  }

  // Load baseline values from Ariadne GraphQL backend
  async function syncBackendData(silent = false) {
    if (!silent) setLoading(true);
    try {
      if (!silent) logAuditEvent('API Sync Attempt', 'API', 'Connecting to AppSync GraphQL backend at http://localhost:8000/graphql...');
      const response = await graphqlRequest<BootstrapData>(QUERIES.bootstrap, { customerCode: CUSTOMER_CODE });

      if (response && response.securities && response.securities.length > 0) {
        setIsSimulatedMode(false);
        setSecurities(response.securities);
        setFunds(response.funds);
        setOrders(response.orders);
        setPositions(response.positions);
        setTrades(response.trades);

        // Sync selected security if needed
        const currentSec = response.securities.find(s => s.isin === selectedSecurity.isin);
        if (currentSec) setSelectedSecurity(currentSec);
        else setSelectedSecurity(response.securities[0]);

        if (!silent) {
          logAuditEvent('API Sync Succeeded', 'API', 'Real-time master parameters fetched from local GraphQL endpoint successfully.');
          triggerToast('Synchronized with local GraphQL API', 'success');
        }
      } else {
        throw new Error('Empty response datasets from Ariadne');
      }
    } catch (err) {
      // Graceful connection failure: Activate high-fidelity local simulation
      setIsSimulatedMode(true);
      logAuditEvent(
        'GraphQL Server Offline',
        'SYSTEM',
        'Ariadne GraphQL server (http://localhost:8000/graphql) not found or returned error. Activating high-fidelity offline simulation.',
        false
      );
      triggerToast('GraphQL server offline. Simulated Mode active.', 'info');
    } finally {
      setLoading(false);
    }
  }

  // Helper: tear down all active subscriptions
  function teardownSubscriptions() {
    unsubOrderRef.current?.();
    unsubSecRef.current?.();
    unsubFundsRef.current?.();
    unsubOrderRef.current = null;
    unsubSecRef.current = null;
    unsubFundsRef.current = null;
    disposeSubscriptionClient();
    setWsConnected(false);
  }

  // Boot: initial fetch + start WebSocket subscriptions
  useEffect(() => {
    if (!loggedIn) return;

    // 1. Initial data load via HTTP query
    void syncBackendData();

    // 2. Subscribe to live order status changes
    unsubOrderRef.current = subscribeToOrderStatus(
      CUSTOMER_CODE,
      (event) => {
        setWsConnected(true);
        // Upsert the order in local state
        setOrders((prev) => {
          const idx = prev.findIndex((o) => o.id === event.orderId);
          const updated: Order = {
            ...(idx >= 0 ? prev[idx] : ({} as Order)),
            id: event.orderId,
            clOrdId: event.clOrdId,
            ndsOrderId: event.ndsOrderId,
            isin: event.isin,
            contractId: event.isin, // best-effort fallback
            securityName: event.securityName,
            side: event.side,
            orderType: 'LIMIT',
            quantity: event.quantity,
            limitPrice: event.limitPrice,
            orderValue: event.orderValue,
            status: event.status,
            message: event.message,
            updatedAt: event.updatedAt,
            createdAt: idx >= 0 ? prev[idx].createdAt : event.updatedAt,
          };
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [updated, ...prev];
        });
        logAuditEvent(
          'Order Update (WS)',
          'API',
          `Order ${event.orderId} → ${event.status} via GraphQL subscription`
        );
      },
      () => setWsConnected(false)
    );

    // 3. Subscribe to live NDS-OM securities price feed
    unsubSecRef.current = subscribeToSecurities(
      (securities) => {
        setWsConnected(true);
        setSecurities(securities);
        setSelectedSecurity((prev) => {
          const refreshed = securities.find((s) => s.isin === prev.isin);
          return refreshed ?? prev;
        });
      },
      () => setWsConnected(false)
    );

    // 4. Subscribe to live funds balance updates
    unsubFundsRef.current = subscribeToFunds(
      CUSTOMER_CODE,
      (updatedFunds) => {
        setWsConnected(true);
        setFunds(updatedFunds);
      },
      () => setWsConnected(false)
    );

    return () => {
      teardownSubscriptions();
    };
  }, [loggedIn]);

  // UPI deposit simulation handler
  async function simulateFundsAdd(amount: number) {
    if (isSimulatedMode) {
      // Simulate client balance deposit in-state
      const updatedAvailable = funds.availableBalance + amount;
      const refId = `REF-DEP-${Math.floor(Math.random() * 90000) + 10000}`;

      setFunds(prev => ({
        ...prev,
        availableBalance: updatedAvailable
      }));

      // Append ledger log
      const newLedger: LedgerEntry = {
        id: `LED-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'DEPOSIT',
        amount,
        balanceAfter: updatedAvailable,
        referenceId: refId,
        status: 'COMPLETED',
        description: 'UPI simulated client deposit'
      };
      setLedger(prev => [newLedger, ...prev]);

      logAuditEvent(
        'Client Funds Added',
        'API',
        `Deposited ${amount.toLocaleString('en-IN')} INR into available funds. Ref: ${refId}`
      );
      triggerToast(`Deposited ₹${amount.toLocaleString('en-IN')} successfully!`, 'success');
    } else {
      // If live backend existed for funds adjustment, we would route it. 
      // For POC, simulate client side regardless:
      const updatedAvailable = funds.availableBalance + amount;
      setFunds(prev => ({ ...prev, availableBalance: updatedAvailable }));
      triggerToast(`Simulated deposit of ₹${amount.toLocaleString('en-IN')} completed.`, 'success');
    }
  }

  // Limit Order Place handler
  async function handleOrderPlace(input: {
    isin: string;
    side: OrderSide;
    quantity: number;
    limitPrice: number;
  }) {
    const sec = securities.find(s => s.isin === input.isin);
    if (!sec) return null;

    const estimatedValue = Math.round((input.quantity * input.limitPrice) / 100);

    if (isSimulatedMode) {
      // 1. Double check client bounds
      if (input.side === 'BUY' && estimatedValue > funds.availableBalance) {
        triggerToast('Insufficient available G-Sec funds.', 'error');
        return null;
      }

      // Generate dummy clOrdId and orderId
      const clId = `CL-${Math.floor(Math.random() * 90000) + 10000}`;
      const ordId = `ORD-${Date.now().toString().slice(-6)}`;
      const ndsId = `NDS-${Math.floor(Math.random() * 900000) + 100000}`;

      // Build mock FIX 35=D NewOrderSingle
      const fixRequest = {
        BeginString: 'FIX.4.4',
        MsgType: 'D',
        SenderCompID: 'AXIS_SEC_RETAIL',
        TargetCompID: 'NDS_OM_MATCH',
        ClOrdID: clId,
        Account: CUSTOMER_CODE,
        Symbol: sec.contractId,
        SecurityID: sec.isin,
        Side: input.side === 'BUY' ? '1' : '2',
        OrderQty: input.quantity,
        Price: input.limitPrice,
        OrdType: '2', // Limit
        HandlInst: '1',
        TransactTime: new Date().toISOString()
      };

      // Build mock Execution Report 35=8
      const fixResponse = {
        BeginString: 'FIX.4.4',
        MsgType: '8',
        SenderCompID: 'NDS_OM_MATCH',
        TargetCompID: 'AXIS_SEC_RETAIL',
        OrderID: ordId,
        ClOrdID: clId,
        ExecID: `EX-${Math.floor(Math.random() * 90000) + 10000}`,
        ExecType: '0', // New
        OrdStatus: '0', // New
        Symbol: sec.contractId,
        Side: input.side === 'BUY' ? '1' : '2',
        OrderQty: input.quantity,
        Price: input.limitPrice,
        LeavesQty: input.quantity,
        CumQty: 0,
        AvgPx: 0.0,
        TransactTime: new Date().toISOString()
      };

      // 2. Adjust funds balances immediately for BUY
      if (input.side === 'BUY') {
        setFunds(prev => ({
          ...prev,
          availableBalance: prev.availableBalance - estimatedValue,
          blockedBalance: prev.blockedBalance + estimatedValue
        }));

        // Ledger Block Entry
        const blockLedger: LedgerEntry = {
          id: `LED-${Date.now()}-B`,
          timestamp: new Date().toISOString(),
          type: 'BLOCK',
          amount: estimatedValue,
          balanceAfter: funds.availableBalance - estimatedValue,
          referenceId: clId,
          status: 'COMPLETED',
          description: `Capital hold for BUY limit order: ${sec.contractId}`
        };
        setLedger(prev => [blockLedger, ...prev]);
      }

      // 3. Create simulated accepted order record
      const newOrder: Order = {
        id: ordId,
        clOrdId: clId,
        ndsOrderId: ndsId,
        isin: sec.isin,
        contractId: sec.contractId,
        securityName: sec.name,
        side: input.side,
        orderType: 'LIMIT',
        quantity: input.quantity,
        limitPrice: input.limitPrice,
        orderValue: estimatedValue,
        status: 'ACCEPTED',
        message: 'Order accepted by sovereign matching gateway.',
        fixRequest: JSON.stringify(fixRequest),
        fixResponse: JSON.stringify(fixResponse),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setOrders(prev => [newOrder, ...prev]);

      logAuditEvent(
        'Limit Order Accepted',
        'FIX',
        `BUY ${input.quantity.toLocaleString('en-IN')} units of ${sec.contractId} accepted at ${input.limitPrice.toFixed(4)}. clOrdId: ${clId}`
      );

      triggerToast('Order accepted by NDS-OM simulator!', 'success');

      // 4. Scheduling high-fidelity matched execution! (simulates active clearing match after 2.5 seconds)
      setTimeout(() => {
        // Fetch order again to verify it wasn't cancelled or modified in the meantime
        setOrders(currentOrders => {
          const ord = currentOrders.find(o => o.id === ordId);
          if (!ord || ord.status !== 'ACCEPTED') return currentOrders;

          // Process match
          const tradeId = `TRD-${Math.floor(Math.random() * 90000) + 10000}`;

          // A. Generate Trade record
          const newTrade: Trade = {
            id: tradeId,
            orderId: ordId,
            isin: sec.isin,
            securityName: sec.name,
            side: input.side,
            quantity: input.quantity,
            price: input.limitPrice,
            tradeValue: estimatedValue,
            tradeTime: new Date().toISOString()
          };
          setTrades(t => [newTrade, ...t]);

          // B. Adjust demat holdings / Positions
          setPositions(pos => {
            const index = pos.findIndex(p => p.isin === sec.isin);
            const nextPos = [...pos];
            if (input.side === 'BUY') {
              if (index >= 0) {
                const existing = nextPos[index];
                nextPos[index] = {
                  ...existing,
                  quantity: existing.quantity + input.quantity,
                  marketValue: existing.marketValue + estimatedValue,
                  // re-calculate average buy price
                  averagePrice: Number(((existing.quantity * existing.averagePrice + input.quantity * input.limitPrice) / (existing.quantity + input.quantity)).toFixed(4))
                };
              } else {
                nextPos.push({
                  isin: sec.isin,
                  securityName: sec.name,
                  quantity: input.quantity,
                  averagePrice: input.limitPrice,
                  marketValue: estimatedValue
                });
              }
            } else {
              // SELL: Reduce quantity
              if (index >= 0) {
                const existing = nextPos[index];
                const rem = existing.quantity - input.quantity;
                if (rem <= 0) {
                  nextPos.splice(index, 1);
                } else {
                  nextPos[index] = {
                    ...existing,
                    quantity: rem,
                    marketValue: Math.round((rem * ltp) / 100) // update based on master LTP
                  };
                }
              }
            }
            return nextPos;
          });

          // C. Settle blocked balances and cash ledgers
          setFunds(currFunds => {
            let nextFunds = { ...currFunds };
            if (input.side === 'BUY') {
              nextFunds.blockedBalance = Math.max(0, currFunds.blockedBalance - estimatedValue);
              nextFunds.usedToday += estimatedValue;
            } else {
              // SELL: Releases cash directly to Available G-Sec funds
              nextFunds.availableBalance += estimatedValue;
              nextFunds.usedToday += estimatedValue;
            }
            return nextFunds;
          });

          // Add release ledger log (only for buy block releases, sell gets direct credit)
          if (input.side === 'BUY') {
            const releaseLedger: LedgerEntry = {
              id: `LED-${Date.now()}-R`,
              timestamp: new Date().toISOString(),
              type: 'RELEASE',
              amount: estimatedValue,
              balanceAfter: funds.availableBalance, // adjusted balance
              referenceId: tradeId,
              status: 'COMPLETED',
              description: `Escrow block released on execution match: ${sec.contractId}`
            };
            setLedger(l => [releaseLedger, ...l]);
          } else {
            // Sell deposit credit
            const creditLedger: LedgerEntry = {
              id: `LED-${Date.now()}-C`,
              timestamp: new Date().toISOString(),
              type: 'DEPOSIT',
              amount: estimatedValue,
              balanceAfter: funds.availableBalance + estimatedValue,
              referenceId: tradeId,
              status: 'COMPLETED',
              description: `ICCL sale settlement credit: ${sec.contractId}`
            };
            setLedger(l => [creditLedger, ...l]);
          }

          logAuditEvent(
            'NDS-OM Trade Execution',
            'FIX',
            `Trade Match Completed! ID: ${tradeId}. side: ${input.side} quantity: ${input.quantity.toLocaleString('en-IN')} units.`
          );

          triggerToast(`Order matched on NDS-OM. Trade ID: ${tradeId}`, 'success');

          // D. Change order state to EXECUTED
          return currentOrders.map(o => {
            if (o.id === ordId) {
              return {
                ...o,
                status: 'EXECUTED',
                message: 'All allocations executed and completed on clearing corporation (T+1).',
                updatedAt: new Date().toISOString()
              };
            }
            return o;
          });
        });
      }, 2500);

      // Return local response parameters
      return {
        status: 'ACCEPTED',
        message: 'Order accepted by sovereign matching gateway.',
        fixRequest: JSON.stringify(fixRequest),
        fixResponse: JSON.stringify(fixResponse)
      };

    } else {
      // Live GraphQL mutation routing
      logAuditEvent('Place Order Mutation', 'MUTATION', `Invoking placeOrder GraphQL mutation on ISIN ${input.isin}...`);
      const result = await graphqlRequest<{ placeOrder: any }>(QUERIES.placeOrder, {
        input: {
          customerCode: CUSTOMER_CODE,
          isin: input.isin,
          side: input.side,
          orderType: 'LIMIT',
          quantity: input.quantity,
          limitPrice: input.limitPrice,
        }
      });

      await syncBackendData();
      logAuditEvent(
        'Mutation Succeeded',
        'MUTATION',
        `Mutation processed. orderId: ${result.placeOrder.orderId} status: ${result.placeOrder.status}`
      );
      return result.placeOrder;
    }
  }

  // Cancel order execution handler
  async function handleOrderCancel(orderId: string) {
    logAuditEvent('Cancel Order Event', 'SYSTEM', `Client initiated cancellation of order ID: ${orderId}`);

    if (isSimulatedMode) {
      setOrders(currentOrders => {
        const ord = currentOrders.find(o => o.id === orderId);
        if (!ord) return currentOrders;

        // If Buy order, release blocked capital
        if (ord.side === 'BUY') {
          setFunds(prev => ({
            ...prev,
            availableBalance: prev.availableBalance + ord.orderValue,
            blockedBalance: Math.max(0, prev.blockedBalance - ord.orderValue)
          }));

          const releaseLedger: LedgerEntry = {
            id: `LED-${Date.now()}-CR`,
            timestamp: new Date().toISOString(),
            type: 'RELEASE',
            amount: ord.orderValue,
            balanceAfter: funds.availableBalance + ord.orderValue,
            referenceId: ord.clOrdId,
            status: 'COMPLETED',
            description: `Escrow block released on order cancel: ${ord.contractId}`
          };
          setLedger(prev => [releaseLedger, ...prev]);
        }

        logAuditEvent(
          'Limit Order Cancelled',
          'FIX',
          `Order ${orderId} successfully marked CANCELLED on NDS-OM matching grids.`
        );

        triggerToast('Order successfully cancelled.', 'info');

        return currentOrders.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'CANCELLED',
              message: 'Order cancelled manually by user.',
              updatedAt: new Date().toISOString()
            };
          }
          return o;
        });
      });
    } else {
      // Live GraphQL cancellation
      await graphqlRequest(QUERIES.cancelOrder, { orderId });
      await syncBackendData();
      triggerToast('Order cancelled successfully.', 'success');
    }
  }

  // Modify G-Sec order parameter handler
  async function handleOrderModify(orderId: string, quantity: number, price: number) {
    logAuditEvent(
      'Modify Order Event',
      'SYSTEM',
      `Client requested modification of order ID ${orderId} -> Qty: ${quantity.toLocaleString('en-IN')} Price: ${price.toFixed(4)}`
    );

    if (isSimulatedMode) {
      setOrders(currentOrders => {
        const ord = currentOrders.find(o => o.id === orderId);
        if (!ord) return currentOrders;

        const newEstimatedVal = Math.round((quantity * price) / 100);
        const valDiff = newEstimatedVal - ord.orderValue;

        // Verify balance safety if Buying more
        if (ord.side === 'BUY' && valDiff > funds.availableBalance) {
          triggerToast('Insufficient available balance to expand order limits.', 'error');
          return currentOrders;
        }

        // Adjust balances for BUY limits
        if (ord.side === 'BUY') {
          setFunds(prev => ({
            ...prev,
            availableBalance: prev.availableBalance - valDiff,
            blockedBalance: prev.blockedBalance + valDiff
          }));

          const adjustLedger: LedgerEntry = {
            id: `LED-${Date.now()}-MA`,
            timestamp: new Date().toISOString(),
            type: valDiff >= 0 ? 'BLOCK' : 'RELEASE',
            amount: Math.abs(valDiff),
            balanceAfter: funds.availableBalance - valDiff,
            referenceId: ord.clOrdId,
            status: 'COMPLETED',
            description: `Escrow hold adjustment for BUY modification: ${ord.contractId}`
          };
          setLedger(prev => [adjustLedger, ...prev]);
        }

        logAuditEvent(
          'Limit Order Modified',
          'FIX',
          `Order ${orderId} parameters changed successfully. Qty: ${quantity} Price: ${price}`
        );

        triggerToast('Order parameters modified successfully!', 'success');

        return currentOrders.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              quantity,
              limitPrice: price,
              orderValue: newEstimatedVal,
              status: 'MODIFIED',
              message: 'Order modified and matching indices adjusted.',
              updatedAt: new Date().toISOString()
            };
          }
          return o;
        });
      });
    } else {
      // Live GraphQL modification
      await graphqlRequest(QUERIES.modifyOrder, {
        input: {
          orderId,
          quantity,
          limitPrice: price
        }
      });
      await syncBackendData();
      triggerToast('Order modified successfully!', 'success');
    }
  }

  // Side bar Navigation listings
  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: <Landmark className="w-5 h-5" /> },
    { id: 'market', label: 'Market Watch', icon: <Globe className="w-5 h-5" /> },
    { id: 'order', label: 'Place Order', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'orders', label: 'Order Book', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'trades', label: 'Trade Book', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'portfolio', label: 'Positions', icon: <FolderHeart className="w-5 h-5" /> },
    { id: 'funds', label: 'Funds ledger', icon: <Coins className="w-5 h-5" /> },
    { id: 'admin', label: 'Admin Sim Demo', icon: <Cpu className="w-5 h-5" /> },
  ] as Array<{ id: Page; label: string; icon: React.ReactNode }>;

  // Retrieve current active view title
  const activeTitle = useMemo(() => {
    if (page === 'security') return `G-Sec Security Profile: ${selectedSecurity.contractId}`;
    return nav.find(item => item.id === page)?.label || 'Axis Sec Platform';
  }, [page, selectedSecurity]);

  // Main login prompt view
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800 animate-fade-in selection:bg-blue-100">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left panel: Info & brand */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50 text-xs font-bold text-blue-600 tracking-wide uppercase">
              🏛️ Retail G-Sec Trading Hub
            </span>

            <h1 className="text-4xl sm:text-5xl font-black text-slate-850 tracking-tight leading-none">
              Axis Securities G-Sec trading
            </h1>

            <p className="text-base text-slate-500 font-semibold leading-relaxed max-w-xl">
              Invest in high-security Sovereign Government Securities with transparent live pricing, safety checks, and secure clearing settlement.
            </p>

            {/* Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200/50 shadow-sm space-y-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <strong className="text-xs text-slate-850 block font-bold">Manual Limit Orders</strong>
                <p className="text-[10px] text-slate-400 font-semibold leading-normal">RBI regulatory compliant retail pricing execution protect.</p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200/50 shadow-sm space-y-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <strong className="text-xs text-slate-850 block font-bold">Funds Isolation</strong>
                <p className="text-[10px] text-slate-400 font-semibold leading-normal">Dedicated sovereign ledgers separated from equity funds.</p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200/50 shadow-sm space-y-2">
                <Cpu className="w-5 h-5 text-amber-600" />
                <strong className="text-xs text-slate-850 block font-bold">Technical Auditing</strong>
                <p className="text-[10px] text-slate-400 font-semibold leading-normal">Simulated FIX protocol event tags visible for reviews.</p>
              </div>
            </div>
          </div>

          {/* Right panel: Login box */}
          <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl shadow-xl p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Demo Account Gateway</h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">Authenticate client credentials to access sovereign matching</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Customer Code</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 font-mono"
                  value={CUSTOMER_CODE}
                  readOnly
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Password</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
                  value="password"
                  type="password"
                  readOnly
                />
              </div>
            </div>

            <button
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/10 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              onClick={() => setLoggedIn(true)}
            >
              Sign In to Axis G-Sec POC
            </button>

            <div className="text-[10px] text-slate-400 font-semibold text-center mt-4">
              Authorized demo profile presets automatically configure CDSL demat.
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800">

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 fixed inset-y-0 left-0 z-40">

        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="p-2 bg-blue-900 rounded-xl text-blue-400">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-sm font-black text-white block uppercase tracking-wide">Axis Sovereign</span>
            <span className="text-[10px] font-bold text-slate-500 block uppercase">G-Sec Platform</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${page === item.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* User Footer info */}
        <div className="p-5 border-t border-slate-800/80 bg-slate-950/20 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-900 rounded-full flex items-center justify-center font-bold text-xs text-blue-300 uppercase">
              AS
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">ASL Demo Account</span>
              <span className="text-[9px] font-mono text-slate-500 block truncate">{CUSTOMER_CODE}</span>
            </div>
          </div>

          <button
            onClick={() => {
              teardownSubscriptions();
              setLoggedIn(false);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Work Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Sticky Header Banner */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100/80 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider font-mono">Axis G-Sec Terminal</span>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">{activeTitle}</h1>
            </div>
          </div>

          {/* Platform controls / connection tags */}
          <div className="flex items-center gap-3">

            {/* Live Indicator */}
            {isSimulatedMode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-100 bg-amber-50 text-[10px] font-bold text-amber-700 font-mono">
                <span className="h-1.5 w-1.5 bg-amber-400 rounded-full animate-pulse" /> SIMULATED OFFLINE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-100 bg-emerald-50 text-[10px] font-bold text-emerald-700 font-mono">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" /> GRAPHQL ACTIVE
              </span>
            )}

            {/* WebSocket subscription badge */}
            {!isSimulatedMode && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold font-mono transition-all ${
                  wsConnected
                    ? 'border-violet-200 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
                title={wsConnected ? 'WebSocket subscription active' : 'Connecting to WS…'}
              >
                <Radio className={`w-3 h-3 ${wsConnected ? 'text-violet-500 animate-pulse' : 'text-slate-300'}`} />
                {wsConnected ? 'WS LIVE' : 'WS…'}
              </span>
            )}

            <button
              onClick={syncBackendData}
              disabled={loading}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition-all disabled:opacity-40"
              title="Refresh Platform Master"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* View render slot router */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {page === 'dashboard' && (
            <DashboardPage
              data={{ securities, funds, orders, positions, trades }}
              setPage={(p) => setPage(p as any)}
              setSelectedSecurity={setSelectedSecurity}
              onAddFundsClick={() => setPage('funds')}
            />
          )}

          {page === 'market' && (
            <MarketWatchPage
              data={{ securities, funds, orders, positions, trades }}
              setPage={(p) => setPage(p as any)}
              setSelectedSecurity={setSelectedSecurity}
            />
          )}

          {page === 'order' && (
            <PlaceOrderPage
              securities={securities}
              selectedSecurity={selectedSecurity}
              setSelectedSecurity={setSelectedSecurity}
              funds={funds}
              positions={positions}
              onPlaceOrder={handleOrderPlace}
              showAdminMode={true}
            />
          )}

          {page === 'orders' && (
            <OrderBookPage
              orders={orders}
              onCancelOrder={handleOrderCancel}
              onModifyOrder={handleOrderModify}
              showAdminMode={true}
            />
          )}

          {page === 'trades' && (
            <TradeBookPage trades={trades} />
          )}

          {page === 'portfolio' && (
            <PortfolioPage
              positions={positions}
              securities={securities}
              setPage={(p) => setPage(p as any)}
              setSelectedSecurity={setSelectedSecurity}
            />
          )}

          {page === 'funds' && (
            <FundsLedgerPage
              funds={funds}
              ledger={ledger}
              onAddFunds={simulateFundsAdd}
            />
          )}

          {page === 'admin' && (
            <AdminDemo
              fixRequest={orders[0]?.fixRequest}
              fixResponse={orders[0]?.fixResponse}
              graphqlRequestExample={QUERIES.placeOrder}
              auditTrail={auditTrail}
            />
          )}

          {page === 'security' && (
            <SecurityDetailPage
              security={selectedSecurity}
              setPage={(p) => setPage(p as any)}
            />
          )}
        </main>
      </div>

      {/* Mobile Drawer Navigation overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-slate-900 text-slate-300 h-full p-6 animate-slide-in">
            <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-400" />
                <span className="font-extrabold text-white text-sm">Axis Sovereign</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-6 space-y-1.5 overflow-y-auto">
              {nav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setPage(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${page === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-900 rounded-full flex items-center justify-center font-bold text-xs text-blue-300">
                AS
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">ASL Demo Account</span>
                <span className="text-[9px] font-mono text-slate-500 block truncate">{CUSTOMER_CODE}</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Toast Alert messages slot */}
      <Toast message={toast} onClose={() => setToast(null)} />

    </div>
  );
}
