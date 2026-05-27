export const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:8000/graphql';

export type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
};

export async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = localStorage.getItem('session_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as GraphQLResponse<any>;

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (payload.errors?.length) {
    const errorMsg = payload.errors.map((err) => err.message).join('\n');
    if (errorMsg.includes('Not Authorized') || payload.errors.some(e => e.extensions?.code === 'UNAUTHORIZED')) {
      // Flush token and dispatch event to redirect to Login
      localStorage.removeItem('session_token');
      localStorage.removeItem('customer_code');
      localStorage.removeItem('customer_name');
      window.dispatchEvent(new Event('auth_unauthorized'));
    }
    throw new Error(errorMsg);
  }

  if (!payload.data) {
    throw new Error('GraphQL response did not contain data');
  }

  const data = payload.data;

  // Perform dynamic AppSync-style backend camelCase mapping
  const mapped: any = {};

  if (data.login) {
    mapped.login = data.login;
  }

  if (data.getPublic_securities) {
    mapped.securities = data.getPublic_securities.results.map((s: any) => ({
      isin: s.isin,
      contractId: s.contractid,
      name: s.name,
      coupon: s.coupon,
      maturityDate: s.maturitydate,
      bid: s.bid,
      ask: s.ask,
      ltp: s.ltp,
      yield: s.yield,
      lotSize: s.lotsize,
      tickSize: s.ticksize,
    }));
  }

  if (data.getPublic_funds) {
    const f = data.getPublic_funds.results[0];
    if (f) {
      mapped.funds = {
        customerCode: f.customercode,
        availableBalance: f.availablebalance,
        blockedBalance: f.blockedbalance,
        usedToday: f.usedtoday,
      };
    }
  }

  if (data.getPublic_orders) {
    mapped.orders = data.getPublic_orders.results.map((o: any) => ({
      id: String(o.order_id),
      clOrdId: o.clordid,
      ndsOrderId: o.ndsorderid,
      isin: o.isin,
      contractId: o.contractid,
      securityName: o.securityname,
      side: o.side,
      orderType: o.ordertype,
      quantity: o.quantity,
      limitPrice: o.limitprice,
      orderValue: o.ordervalue,
      status: o.status,
      message: o.message,
      fixRequest: o.fixrequest,
      fixResponse: o.fixresponse,
      createdAt: o.createdat,
      updatedAt: o.updatedat,
    }));
  }

  if (data.getPublic_positions) {
    mapped.positions = data.getPublic_positions.results.map((p: any) => ({
      isin: p.isin,
      securityName: p.securityname,
      quantity: p.quantity,
      averagePrice: p.averageprice,
      marketValue: p.marketvalue,
    }));
  }

  if (data.getPublic_trades) {
    mapped.trades = data.getPublic_trades.results.map((t: any) => ({
      id: String(t.trade_id),
      orderId: String(t.orderid),
      isin: t.isin,
      securityName: t.securityname,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      tradeValue: t.tradevalue,
      tradeTime: t.tradetime,
    }));
  }

  if (data.getPublic_ledger_entries) {
    mapped.ledger = data.getPublic_ledger_entries.results.map((l: any) => ({
      id: String(l.ledger_id),
      timestamp: l.timestamp,
      type: l.type,
      amount: l.amount,
      balanceAfter: l.balanceafter,
      referenceId: l.referenceid,
      status: l.status,
      description: l.description,
    }));
  }

  if (data.getPublic_audit_events) {
    mapped.auditTrail = data.getPublic_audit_events.results.map((a: any) => {
      let details = '';
      let success = true;
      try {
        const payloadObj = JSON.parse(a.payload);
        details = payloadObj.details || JSON.stringify(payloadObj);
        success = payloadObj.success !== undefined ? payloadObj.success : true;
      } catch (e) {
        details = a.payload;
      }
      return {
        id: String(a.audit_id),
        timestamp: a.createdat,
        title: a.eventtype,
        type: 'SYSTEM',
        details: details,
        success: success,
      };
    });
  }

  if (data.createPublic_orders) {
    const o = data.createPublic_orders;
    mapped.placeOrder = {
      orderId: String(o.order_id),
      clOrdId: o.clordid,
      ndsOrderId: o.ndsorderid,
      status: o.status,
      message: o.message,
      fixRequest: o.fixrequest,
      fixResponse: o.fixresponse,
    };
  }

  if (data.updatePublic_orders) {
    const o = data.updatePublic_orders;
    const mappedOrder = {
      orderId: String(o.order_id),
      clOrdId: o.clordid,
      ndsOrderId: o.ndsorderid,
      status: o.status,
      message: o.message,
      fixRequest: o.fixrequest,
      fixResponse: o.fixresponse,
    };
    mapped.modifyOrder = mappedOrder;
    mapped.cancelOrder = mappedOrder;
  }

  if (data.createPublic_ledger_entries) {
    const l = data.createPublic_ledger_entries;
    mapped.createLedgerEntry = {
      id: String(l.ledger_id),
      customerCode: l.customercode,
      timestamp: l.timestamp,
      type: l.type,
      amount: l.amount,
      balanceAfter: l.balanceafter,
      referenceId: l.referenceid,
      status: l.status,
      description: l.description,
    };
  }

  return mapped as T;
}

export const QUERIES = {
  login: `
    mutation Login($customercode: String!, $pan: String!) {
      login(customercode: $customercode, pan: $pan) {
        token
        customercode
        name
      }
    }
  `,
  bootstrap: `
    query Bootstrap($customerCode: String!) {
      getPublic_securities {
        results {
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
      getPublic_funds(filter: { customercode: $customerCode }) {
        results {
          fund_id
          customercode
          availablebalance
          blockedbalance
          usedtoday
        }
      }
      getPublic_orders(filter: { customercode: $customerCode }) {
        results {
          order_id
          customercode
          clientid
          clordid
          ndsorderid
          isin
          contractid
          securityname
          side
          ordertype
          quantity
          limitprice
          ordervalue
          status
          message
          lastactivitytimestamp
          fixrequest
          fixresponse
          createdat
          updatedat
        }
      }
      getPublic_positions(filter: { customercode: $customerCode }) {
        results {
          position_id
          customercode
          isin
          securityname
          quantity
          averageprice
          marketvalue
        }
      }
      getPublic_trades(filter: { customercode: $customerCode }) {
        results {
          trade_id
          customercode
          orderid
          isin
          securityname
          side
          quantity
          price
          tradevalue
          tradetime
        }
      }
      getPublic_ledger_entries(filter: { customercode: $customerCode }) {
        results {
          ledger_id
          customercode
          timestamp
          type
          amount
          balanceafter
          referenceid
          status
          description
        }
      }
      getPublic_audit_events {
        results {
          audit_id
          eventtype
          payload
          createdat
        }
      }
    }
  `,
  placeOrder: `
    mutation CreatePublic_Orders($input: CreatePublic_OrdersInput!) {
      createPublic_orders(input: $input) {
        order_id
        clordid
        ndsorderid
        status
        message
        fixrequest
        fixresponse
      }
    }
  `,
  modifyOrder: `
    mutation UpdatePublic_Orders($input: UpdatePublic_OrdersInput!) {
      updatePublic_orders(input: $input) {
        order_id
        clordid
        ndsorderid
        status
        message
        fixrequest
        fixresponse
      }
    }
  `,
  cancelOrder: `
    mutation CancelPublic_Orders($orderId: Float!) {
      updatePublic_orders(input: { order_id: $orderId, status: CANCELLED }) {
        order_id
        clordid
        ndsorderid
        status
        message
        fixrequest
        fixresponse
      }
    }
  `,
  createLedgerEntry: `
    mutation CreatePublic_Ledger_Entries($input: CreatePublic_Ledger_EntriesInput!) {
      createPublic_ledger_entries(input: $input) {
        ledger_id
        customercode
        timestamp
        type
        amount
        balanceafter
        referenceid
        status
        description
      }
    }
  `
};
