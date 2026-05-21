export const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:8000/graphql';

export type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
};

export async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as GraphQLResponse<T>;

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((err) => err.message).join('\n'));
  }

  if (!payload.data) {
    throw new Error('GraphQL response did not contain data');
  }

  return payload.data;
}

export const QUERIES = {
  bootstrap: `
    query Bootstrap($customerCode: String!) {
      securities {
        isin
        contractId
        name
        coupon
        maturityDate
        bid
        ask
        ltp
        yield
        lotSize
        tickSize
      }
      funds(customerCode: $customerCode) {
        customerCode
        availableBalance
        blockedBalance
        usedToday
      }
      orders(customerCode: $customerCode) {
        id
        clOrdId
        ndsOrderId
        isin
        contractId
        securityName
        side
        orderType
        quantity
        limitPrice
        orderValue
        status
        message
        fixRequest
        fixResponse
        createdAt
        updatedAt
      }
      positions(customerCode: $customerCode) {
        isin
        securityName
        quantity
        averagePrice
        marketValue
      }
      trades(customerCode: $customerCode) {
        id
        orderId
        isin
        securityName
        side
        quantity
        price
        tradeValue
        tradeTime
      }
    }
  `,
  placeOrder: `
    mutation PlaceOrder($input: PlaceOrderInput!) {
      placeOrder(input: $input) {
        orderId
        clOrdId
        ndsOrderId
        status
        message
        fixRequest
        fixResponse
      }
    }
  `,
  modifyOrder: `
    mutation ModifyOrder($input: ModifyOrderInput!) {
      modifyOrder(input: $input) {
        orderId
        clOrdId
        ndsOrderId
        status
        message
        fixRequest
        fixResponse
      }
    }
  `,
  cancelOrder: `
    mutation CancelOrder($orderId: ID!) {
      cancelOrder(orderId: $orderId) {
        orderId
        clOrdId
        ndsOrderId
        status
        message
        fixRequest
        fixResponse
      }
    }
  `,
};
