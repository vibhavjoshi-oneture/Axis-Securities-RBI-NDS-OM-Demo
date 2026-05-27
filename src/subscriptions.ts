/**
 * GraphQL Subscription client using the graphql-ws protocol.
 *
 * Built on top of the `graphql-ws` package (already installed).
 * Provides three typed subscription helpers that mirror the backend schema:
 *   - subscribeToOrderStatus
 *   - subscribeToSecurities
 *   - subscribeToFunds
 *
 * Each returns an unsubscribe function. Call it to cleanly close the stream.
 */

import { createClient } from 'graphql-ws';
import type { FundsSummary, Order, Security } from './types';

// WebSocket endpoint (swap http → ws automatically)
const HTTP_ENDPOINT =
  (import.meta as any).env?.VITE_GRAPHQL_ENDPOINT || 'http://localhost:8000/graphql';

export const WS_ENDPOINT = HTTP_ENDPOINT.replace(/^http/, 'ws');

// Singleton graphql-ws client (lazy-created, auto-reconnects)
let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    _client = createClient({
      url: WS_ENDPOINT,
      connectionParams: () => {
        const token = localStorage.getItem('session_token');
        return {
          Authorization: token ? `Bearer ${token}` : '',
        };
      },
      // Retry up to 5 times with exponential back-off before giving up
      retryAttempts: 5,
      retryWait: async (attempt) => {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000 * 2 ** attempt, 10000))
        );
      },
      on: {
        connected: () => console.log('[graphql-ws] connected securely to', WS_ENDPOINT),
        closed: () => console.log('[graphql-ws] connection closed'),
        error: (err) => console.error('[graphql-ws] error', err),
      },
    });
  }
  return _client;
}

/** Call this to hard-reset the singleton (e.g. on logout). */
export function disposeSubscriptionClient() {
  if (_client) {
    _client.dispose();
    _client = null;
  }
}

// Subscription document strings
const ORDER_STATUS_SUBSCRIPTION = /* GraphQL */ `
  subscription OnOrderStatusChanged($customerCode: String!) {
    orderStatusChanged(customerCode: $customerCode) {
      orderId
      clOrdId
      ndsOrderId
      isin
      securityName
      side
      quantity
      limitPrice
      orderValue
      status
      message
      updatedAt
    }
  }
`;

const SECURITIES_SUBSCRIPTION = /* GraphQL */ `
  subscription OnSecuritiesUpdated {
    securitiesUpdated {
      security_id
      isin
      contractid
      name
      coupon
      maturitydate
      bid
      ask
      ltp
      yield
      lotsize
      ticksize
    }
  }
`;

const FUNDS_SUBSCRIPTION = /* GraphQL */ `
  subscription OnFundsUpdated($customerCode: String!) {
    fundsUpdated(customerCode: $customerCode) {
      customerCode
      availableBalance
      blockedBalance
      usedToday
    }
  }
`;

type OrderStatusEvent = Omit<Order, 'contractId' | 'orderType' | 'fixRequest' | 'fixResponse' | 'createdAt'> & {
  orderId: string;
};

/**
 * Subscribe to live order status changes for a given customer.
 * @returns unsubscribe function
 */
export function subscribeToOrderStatus(
  customerCode: string,
  onData: (event: OrderStatusEvent) => void,
  onError?: (err: unknown) => void
): () => void {
  const unsub = getClient().subscribe<{ orderStatusChanged: OrderStatusEvent }>(
    {
      query: ORDER_STATUS_SUBSCRIPTION,
      variables: { customerCode },
    },
    {
      next: ({ data }) => {
        if (data?.orderStatusChanged) onData(data.orderStatusChanged);
      },
      error: (err) => {
        console.error('[subscription:orderStatusChanged]', err);
        onError?.(err);
      },
      complete: () => console.log('[subscription:orderStatusChanged] completed'),
    }
  );
  return unsub;
}

/**
 * Subscribe to live NDS-OM securities price feed (~5 s cadence).
 * @returns unsubscribe function
 */
export function subscribeToSecurities(
  onData: (securities: Security[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const unsub = getClient().subscribe<{ securitiesUpdated: any[] }>(
    { query: SECURITIES_SUBSCRIPTION },
    {
      next: ({ data }) => {
        if (data?.securitiesUpdated) {
          const mapped = data.securitiesUpdated.map((s: any) => ({
            isin: s.isin,
            contractId: s.contractid,
            name: s.name,
            coupon: s.coupon,
            maturityDate: s.maturitydate,
            bid: Number(s.bid),
            ask: Number(s.ask),
            ltp: Number(s.ltp),
            yield: s.yield,
            lotSize: Number(s.lotsize),
            tickSize: Number(s.ticksize),
          }));
          onData(mapped);
        }
      },
      error: (err) => {
        console.error('[subscription:securitiesUpdated]', err);
        onError?.(err);
      },
      complete: () => console.log('[subscription:securitiesUpdated] completed'),
    }
  );
  return unsub;
}

/**
 * Subscribe to live funds balance updates for a given customer.
 * @returns unsubscribe function
 */
export function subscribeToFunds(
  customerCode: string,
  onData: (funds: FundsSummary) => void,
  onError?: (err: unknown) => void
): () => void {
  const unsub = getClient().subscribe<{ fundsUpdated: FundsSummary }>(
    {
      query: FUNDS_SUBSCRIPTION,
      variables: { customerCode },
    },
    {
      next: ({ data }) => {
        if (data?.fundsUpdated) onData(data.fundsUpdated);
      },
      error: (err) => {
        console.error('[subscription:fundsUpdated]', err);
        onError?.(err);
      },
      complete: () => console.log('[subscription:fundsUpdated] completed'),
    }
  );
  return unsub;
}
