# Backend - Local Ariadne GraphQL Server

This is the local GraphQL backend for the Retail G-Sec Trading POC.

It mimics the AppSync GraphQL layer locally using:

- FastAPI
- Ariadne GraphQL
- In-memory data store
- Mock NDS-OM / CCIL FIX adapter

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open GraphQL Playground:

```text
http://localhost:8000/graphql
```

## Sample query

```graphql
query Securities {
  securities {
    isin
    contractId
    name
    bid
    ask
    yield
    lotSize
    tickSize
  }
}
```

## Sample mutation

```graphql
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
```

Variables:

```json
{
  "input": {
    "customerCode": "ASL-DEMO-1001",
    "isin": "IN0020240010",
    "side": "BUY",
    "orderType": "LIMIT",
    "quantity": 100000,
    "limitPrice": 99.8425
  }
}
```

## FIX notes

The app builds developer-friendly FIX objects for:

- New Order Single: `35=D`
- Modify Order: `35=G`
- Cancel Order: `35=F`
- Mock Execution Report: `35=8`

The real implementation should replace `MockFixAdapter` with a persistent FIX engine service on EC2/ECS.
