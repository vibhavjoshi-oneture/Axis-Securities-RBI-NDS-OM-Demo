# Frontend - React/Vite GraphQL POC

Local web app for the Retail G-Sec Trading POC.

It calls the local Ariadne GraphQL server at:

```text
http://localhost:8000/graphql
```

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## What it does

- Demo customer login
- Dashboard
- Market watch
- Place limit order via GraphQL mutation
- View FIX 35=D request preview and mock 35=8 execution report
- View order book
- Modify accepted orders
- Cancel accepted orders
- View positions and funds
