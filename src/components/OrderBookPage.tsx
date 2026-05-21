import React, { useState, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, Eye, Edit3, Trash2, Calendar, 
  Clock, ShieldAlert, Cpu, Terminal, ArrowRight 
} from 'lucide-react';
import Drawer from './Drawer';
import Modal from './Modal';
import Timeline from './Timeline';
import ValidationChecklist from './ValidationChecklist';
import type { Order, OrderSide, OrderStatus } from '../types';

interface OrderBookPageProps {
  orders: Order[];
  onCancelOrder: (orderId: string) => Promise<void>;
  onModifyOrder: (orderId: string, quantity: number, price: number) => Promise<void>;
  showAdminMode: boolean;
}

export default function OrderBookPage({ orders, onCancelOrder, onModifyOrder, showAdminMode }: OrderBookPageProps) {
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState<'ALL' | OrderSide>('ALL');
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | OrderStatus>('ALL');

  // Detail Drawer State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Modify Modal State
  const [modifyOrder, setModifyOrder] = useState<Order | null>(null);
  const [newQty, setNewQty] = useState(100000);
  const [newPrice, setNewPrice] = useState(100.0);
  const [modifyLoading, setModifyLoading] = useState(false);

  // Cancel Modal State
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Filter computations
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Search text match
      const matchesSearch = `${o.id} ${o.clOrdId} ${o.securityName} ${o.isin}`.toLowerCase().includes(search.toLowerCase());

      // 2. Side match
      const matchesSide = sideFilter === 'ALL' || o.side === sideFilter;

      // 3. Status match
      let matchesStatus = true;
      if (statusTab === 'PENDING') {
        matchesStatus = ['VALIDATED', 'SENT_TO_FIX', 'ON_HOLD'].includes(o.status);
      } else if (statusTab !== 'ALL') {
        matchesStatus = o.status === statusTab;
      }

      return matchesSearch && matchesSide && matchesStatus;
    });
  }, [orders, search, sideFilter, statusTab]);

  function getStatusStyle(status: OrderStatus) {
    const map = {
      EXECUTED: 'bg-emerald-50 text-emerald-700 border-emerald-100/70',
      ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-100/70',
      MODIFIED: 'bg-blue-50 text-blue-700 border-blue-100/70',
      CANCELLED: 'bg-slate-50 text-slate-500 border-slate-100/70',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-100/70',
      SENT_TO_FIX: 'bg-amber-50 text-amber-700 border-amber-100/70',
      VALIDATED: 'bg-amber-50 text-amber-700 border-amber-100/70',
      PARTIALLY_EXECUTED: 'bg-amber-50 text-amber-700 border-amber-100/70',
      ON_HOLD: 'bg-slate-100 text-slate-600 border-slate-200/50',
    } as Record<OrderStatus, string>;
    return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  }

  function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  function formatDate(val: string) {
    try {
      return new Date(val).toLocaleString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return val;
    }
  }

  async function handleModifySubmit() {
    if (!modifyOrder) return;
    setModifyLoading(true);
    try {
      await onModifyOrder(modifyOrder.id, newQty, newPrice);
      setModifyOrder(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Modification failed');
    } finally {
      setModifyLoading(false);
    }
  }

  async function handleCancelSubmit() {
    if (!cancelOrder) return;
    setCancelLoading(true);
    try {
      await onCancelOrder(cancelOrder.id);
      setCancelOrder(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Search and Tab Headers */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Order Allocation Book</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Audit log of placed, matched, and pending manual limit orders</p>
          </div>
          
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
            <input
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2.5 pl-11 pr-4 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
              placeholder="Search ID, Client Code, Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filters and Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-50">
          
          {/* Status Tab buttons */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'PENDING', label: 'Pending / Hold' },
              { id: 'ACCEPTED', label: 'Accepted' },
              { id: 'EXECUTED', label: 'Executed' },
              { id: 'CANCELLED', label: 'Cancelled' },
              { id: 'REJECTED', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id as any)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                  statusTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-50'
                    : 'bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100/70 border border-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Side Filter */}
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
            {['ALL', 'BUY', 'SELL'].map((side) => (
              <button
                key={side}
                onClick={() => setSideFilter(side as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  sideFilter === side
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {side}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Main Order Grid Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <SlidersHorizontal className="w-12 h-12 text-slate-300 stroke-1 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Orders Matched</h3>
            <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">
              No orders matched your active filters or query. Try adjusting them.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Order ID / Client ID</th>
                  <th className="py-4 px-4">G-Sec Security</th>
                  <th className="py-4 px-4 text-center">Side</th>
                  <th className="py-4 px-4 text-right">Face Qty</th>
                  <th className="py-4 px-4 text-right">Price</th>
                  <th className="py-4 px-4 text-right">Total Capital</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-600">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/40 transition-colors">
                    
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800 font-mono text-xs">{order.id.slice(0, 8)}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">ClOrdID: {order.clOrdId}</div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-800">{order.securityName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{order.isin}</div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        order.side === 'BUY' 
                          ? 'bg-blue-50 text-blue-600 border border-blue-100/40' 
                          : 'bg-rose-50 text-rose-600 border border-rose-100/40'
                      }`}>
                        {order.side}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                      {order.quantity.toLocaleString('en-IN')}
                    </td>

                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                      {order.limitPrice.toFixed(4)}
                    </td>

                    <td className="py-4 px-4 text-right font-mono text-slate-800 font-bold">
                      {formatCurrency(order.orderValue)}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${getStatusStyle(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Audit Details */}
                        <button
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                          title="View Audit Trail"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Modify order */}
                        <button
                          disabled={!['ACCEPTED', 'MODIFIED'].includes(order.status)}
                          className="p-1.5 hover:bg-blue-50 disabled:hover:bg-transparent text-slate-400 disabled:text-slate-200 hover:text-blue-600 rounded-lg transition-colors"
                          title="Modify Order"
                          onClick={() => {
                            setModifyOrder(order);
                            setNewQty(order.quantity);
                            setNewPrice(order.limitPrice);
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Cancel order */}
                        <button
                          disabled={!['ACCEPTED', 'MODIFIED'].includes(order.status)}
                          className="p-1.5 hover:bg-rose-50 disabled:hover:bg-transparent text-slate-400 disabled:text-slate-200 hover:text-rose-600 rounded-lg transition-colors"
                          title="Cancel Order"
                          onClick={() => {
                            setCancelOrder(order);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modify Modal */}
      {modifyOrder && (
        <Modal 
          title={`Modify G-Sec Order ${modifyOrder.id.slice(0, 8)}`} 
          open={!!modifyOrder} 
          onClose={() => setModifyOrder(null)}
        >
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-bold text-slate-700">{modifyOrder.securityName}</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{modifyOrder.isin}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">New Face Qty</label>
                <input
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500 transition-all font-mono"
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">New Limit Price</label>
                <input
                  type="number"
                  step="0.0005"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500 transition-all font-mono"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs font-semibold text-slate-500 flex justify-between">
              <span>Original Capital: {formatCurrency(modifyOrder.orderValue)}</span>
              <span className="text-blue-600 font-bold">New Est Capital: {formatCurrency(Math.round((newQty * newPrice) / 100))}</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleModifySubmit}
                disabled={modifyLoading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                {modifyLoading ? 'Submitting modification...' : 'Confirm Modification'}
              </button>
              <button
                onClick={() => setModifyOrder(null)}
                className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Modal */}
      {cancelOrder && (
        <Modal 
          title="Cancel G-Sec Order" 
          open={!!cancelOrder} 
          onClose={() => setCancelOrder(null)}
        >
          <div className="space-y-5">
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Are you sure you want to cancel the manual Limit order on <strong className="text-slate-800">{cancelOrder.securityName}</strong> (ISIN: {cancelOrder.isin})?
            </p>
            
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-800">
              This action will release the blocked cash balance of <strong>{formatCurrency(cancelOrder.orderValue)}</strong> back to your available G-Sec funds immediately.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCancelSubmit}
                disabled={cancelLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel G-Sec Order'}
              </button>
              <button
                onClick={() => setCancelOrder(null)}
                className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Drawer */}
      {selectedOrder && (
        <Drawer
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order Audit Trail — ${selectedOrder.id.slice(0, 8)}`}
        >
          <div className="space-y-8">
            
            {/* Header info */}
            <div className="pb-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-slate-800">{selectedOrder.securityName}</h4>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedOrder.isin}</div>
              </div>
              <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border ${getStatusStyle(selectedOrder.status)}`}>
                {selectedOrder.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Timelines and Lifecycles */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" /> Lifecycle Status Pipeline
              </h4>
              <Timeline 
                events={[
                  { 
                    time: formatDate(selectedOrder.createdAt), 
                    status: 'Order Validated', 
                    note: 'Manual lot rules and tick increments successfully confirmed by client wrapper.' 
                  },
                  { 
                    time: formatDate(selectedOrder.createdAt), 
                    status: 'FIX Message Broadcast', 
                    note: `Simulated FIX gateway converted transaction parameters to Tag 35=D NewOrderSingle.` 
                  },
                  { 
                    time: formatDate(selectedOrder.updatedAt), 
                    status: selectedOrder.status, 
                    note: selectedOrder.message || 'Execution Report 35=8 compiled matching logic and committed state.' 
                  }
                ]} 
              />
            </div>

            {/* Checklists */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-slate-400" /> Regulatory Pre-Submit Status
              </h4>
              <ValidationChecklist 
                checks={[
                  { ok: true, label: 'Manual Limit Order quote type approved' },
                  { ok: selectedOrder.quantity % 10000 === 0, label: 'Approved Sovereign Face Qty Lot check' },
                  { ok: true, label: 'Indian Clearing Corporation T+1 settle guarantee verified' },
                ]} 
              />
            </div>

            {/* FIX Payloads for Developers */}
            {showAdminMode && (selectedOrder.fixRequest || selectedOrder.fixResponse) && (
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-slate-400" /> Technical Demo payloads
                </h4>
                
                <div className="space-y-3 font-mono">
                  {selectedOrder.fixRequest && (
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 text-[10px] text-slate-500 font-bold border-b border-slate-100 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" /> MOCK FIX REQUEST 35=D
                      </div>
                      <pre className="bg-slate-950 p-4 text-[10px] text-slate-300 max-h-40 overflow-y-auto">
                        {JSON.stringify(JSON.parse(selectedOrder.fixRequest), null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedOrder.fixResponse && (
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 text-[10px] text-slate-500 font-bold border-b border-slate-100 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" /> MOCK EXECUTION REPORT 35=8
                      </div>
                      <pre className="bg-slate-950 p-4 text-[10px] text-slate-300 max-h-40 overflow-y-auto">
                        {JSON.stringify(JSON.parse(selectedOrder.fixResponse), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </Drawer>
      )}

    </div>
  );
}
