export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'VALIDATED' | 'SENT_TO_FIX' | 'ACCEPTED' | 'REJECTED' | 'PARTIALLY_EXECUTED' | 'EXECUTED' | 'CANCELLED' | 'MODIFIED' | 'ON_HOLD';

export type Security = {
  isin: string;
  contractId: string;
  name: string;
  coupon: string;
  maturityDate: string;
  bid: number;
  ask: number;
  ltp: number;
  yield: string;
  lotSize: number;
  tickSize: number;
};

export type FundsSummary = {
  customerCode: string;
  availableBalance: number;
  blockedBalance: number;
  usedToday: number;
};

export type Order = {
  id: string;
  clOrdId: string;
  ndsOrderId?: string | null;
  isin: string;
  contractId: string;
  securityName: string;
  side: OrderSide;
  orderType: 'LIMIT';
  quantity: number;
  limitPrice: number;
  orderValue: number;
  status: OrderStatus;
  message?: string | null;
  fixRequest?: string | null;
  fixResponse?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Position = {
  isin: string;
  securityName: string;
  quantity: number;
  averagePrice: number;
  marketValue: number;
};

export type Trade = {
  id: string;
  orderId: string;
  isin: string;
  securityName: string;
  side: OrderSide;
  quantity: number;
  price: number;
  tradeValue: number;
  tradeTime: string;
};

export type LedgerEntry = {
  id: string;
  timestamp: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'BLOCK' | 'RELEASE' | 'SETTLEMENT';
  amount: number;
  balanceAfter: number;
  referenceId: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  description: string;
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  title: string;
  type: 'SYSTEM' | 'API' | 'FIX' | 'MUTATION';
  details: string;
  success: boolean;
};

export type BootstrapData = {
  securities: Security[];
  funds: FundsSummary;
  orders: Order[];
  positions: Position[];
  trades: Trade[];
  ledger?: LedgerEntry[];
  auditTrail?: AuditEvent[];
};
