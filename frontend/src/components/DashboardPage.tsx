import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { 
  Wallet, ShieldCheck, PieChart as PieIcon, ClipboardList, 
  TrendingUp, Activity, PlusCircle, Globe, ShoppingBag, FolderHeart, ChevronRight
} from 'lucide-react';
import type { BootstrapData, Security, Order } from '../types';

interface DashboardPageProps {
  data: BootstrapData;
  setPage: (page: string) => void;
  setSelectedSecurity: (security: Security) => void;
  onAddFundsClick: () => void;
}

const COLORS = ['#2B6CB0', '#2F855A', '#D69E2E', '#C53030', '#4A5568'];

export default function DashboardPage({ data, setPage, setSelectedSecurity, onAddFundsClick }: DashboardPageProps) {
  const openOrders = useMemo(() => {
    return data.orders.filter((item) => 
      ['ACCEPTED', 'MODIFIED', 'SENT_TO_FIX', 'VALIDATED'].includes(item.status)
    ).length;
  }, [data.orders]);

  const portfolioValue = useMemo(() => {
    return data.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
  }, [data.positions]);

  const totalBuyValue = useMemo(() => {
    return data.trades
      .filter(t => t.side === 'BUY')
      .reduce((sum, t) => sum + t.tradeValue, 0);
  }, [data.trades]);

  const chartData = useMemo(() => {
    if (!data.positions.length) {
      return [{ name: 'Cash Balance', value: data.funds.availableBalance }];
    }
    const holdings = data.positions.map(p => ({
      name: p.securityName,
      value: p.marketValue
    }));
    return [
      ...holdings,
      { name: 'Unutilized Cash', value: data.funds.availableBalance }
    ];
  }, [data.positions, data.funds]);

  function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Funds</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Wallet className="w-5 h-5" /></div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight">
              {formatCurrency(data.funds.availableBalance)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-semibold">Separate Ledger Balance</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Blocked Funds</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><ShieldCheck className="w-5 h-5" /></div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight">
              {formatCurrency(data.funds.blockedBalance)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-semibold">Held for Open Orders</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Portfolio G-Sec</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><PieIcon className="w-5 h-5" /></div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight">
              {formatCurrency(portfolioValue)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-semibold">Valued at LTP</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Orders</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><ClipboardList className="w-5 h-5" /></div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight">
              {openOrders}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-semibold">NDS-OM Pending States</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Trades</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600"><TrendingUp className="w-5 h-5" /></div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight">
              {data.trades.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-semibold">{formatCurrency(totalBuyValue)} Buy Vol</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Market Status</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Activity className="w-5 h-5" /></div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-600 flex items-center gap-1.5 mt-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              NDS-OM LIVE
            </div>
            <div className="text-[11px] text-slate-400 mt-2 font-semibold">T+1 Settlement Cycle</div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Market Highlights & Actions */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Quick Actions Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4">Quick Client Tools</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button 
                onClick={onAddFundsClick}
                className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors text-slate-700"
              >
                <PlusCircle className="w-6 h-6 text-blue-600 mb-2" />
                <span className="text-xs font-semibold">Add Funds</span>
              </button>
              <button 
                onClick={() => setPage('market')}
                className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors text-slate-700"
              >
                <Globe className="w-6 h-6 text-emerald-600 mb-2" />
                <span className="text-xs font-semibold">View Market</span>
              </button>
              <button 
                onClick={() => setPage('order')}
                className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors text-slate-700"
              >
                <ShoppingBag className="w-6 h-6 text-amber-600 mb-2" />
                <span className="text-xs font-semibold">Place Order</span>
              </button>
              <button 
                onClick={() => setPage('portfolio')}
                className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors text-slate-700"
              >
                <FolderHeart className="w-6 h-6 text-indigo-600 mb-2" />
                <span className="text-xs font-semibold">My Portfolio</span>
              </button>
            </div>
          </div>

          {/* Market Highlights */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Market Highlights</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Top-traded sovereign G-Sec securities from master</p>
              </div>
              <button 
                className="text-xs font-bold text-blue-600 flex items-center gap-0.5 hover:text-blue-700 transition-colors"
                onClick={() => setPage('market')}
              >
                Market Watch <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3.5 px-6">Sovereign Security</th>
                    <th className="py-3.5 px-4 text-right">Indicative Bid</th>
                    <th className="py-3.5 px-4 text-right">Indicative Ask</th>
                    <th className="py-3.5 px-4 text-right">Indicative Yield</th>
                    <th className="py-3.5 px-6 text-center">Trade Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-600">
                  {data.securities.slice(0, 3).map((sec) => (
                    <tr key={sec.isin} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800">{sec.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono font-medium mt-0.5">
                          {sec.isin} • Lot: {sec.lotSize.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                        {sec.bid.toFixed(4)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                        {sec.ask.toFixed(4)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-emerald-600 font-bold">
                        {sec.yield}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                            onClick={() => {
                              setSelectedSecurity(sec);
                              setPage('order');
                            }}
                          >
                            Buy
                          </button>
                          <button 
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                            onClick={() => {
                              setSelectedSecurity(sec);
                              setPage('security');
                            }}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Pie Chart Allocation & Recent Orders */}
        <div className="space-y-8">
          {/* Asset Allocation Pie Chart */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[300px]">
            <div>
              <h2 className="text-base font-bold text-slate-800">Portfolio Distribution</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Current G-Sec market assets & cash balances</p>
            </div>
            
            <div className="h-44 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => formatCurrency(Number(val))} 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Net Worth</span>
                <span className="text-base font-extrabold text-slate-800 font-mono">
                  {formatCurrency(portfolioValue + data.funds.availableBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Orders List */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">Recent Action Log</h2>
              <button 
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                onClick={() => setPage('orders')}
              >
                Full Book
              </button>
            </div>

            <div className="space-y-4">
              {data.orders.length === 0 ? (
                <div className="text-center py-6 text-sm font-semibold text-slate-400">
                  No orders placed today.
                </div>
              ) : (
                data.orders.slice(0, 3).map((order) => {
                  const statusColors = {
                    EXECUTED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-100',
                    MODIFIED: 'bg-blue-50 text-blue-700 border-blue-100',
                    CANCELLED: 'bg-slate-50 text-slate-500 border-slate-100',
                    REJECTED: 'bg-rose-50 text-rose-700 border-rose-100',
                    SENT_TO_FIX: 'bg-amber-50 text-amber-700 border-amber-100',
                    VALIDATED: 'bg-amber-50 text-amber-700 border-amber-100',
                  } as Record<string, string>;

                  return (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-3.5 border border-slate-50 rounded-xl hover:bg-slate-50/30 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate text-sm">{order.securityName}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs font-semibold text-slate-400">
                          <span className={order.side === 'BUY' ? 'text-blue-600' : 'text-rose-600 font-bold'}>
                            {order.side}
                          </span>
                          <span>•</span>
                          <span>{order.quantity.toLocaleString('en-IN')} units</span>
                        </div>
                      </div>
                      <div>
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                          statusColors[order.status] || 'bg-slate-50 text-slate-600'
                        }`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
