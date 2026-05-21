import React, { useState, useMemo } from 'react';
import { 
  FolderHeart, List, LayoutGrid, CalendarRange, Landmark, 
  ArrowUpRight, ArrowDownRight, TrendingUp, HelpCircle 
} from 'lucide-react';
import type { Position, Security } from '../types';

interface PortfolioPageProps {
  positions: Position[];
  securities: Security[];
  setPage: (page: string) => void;
  setSelectedSecurity: (security: Security) => void;
}

export default function PortfolioPage({ positions, securities, setPage, setSelectedSecurity }: PortfolioPageProps) {
  const [layout, setLayout] = useState<'TABLE' | 'CARD'>('TABLE');

  // Compute portfolio metrics
  const portfolioMetrics = useMemo(() => {
    let totalVal = 0;
    let totalUnrealizedPL = 0;

    positions.forEach(pos => {
      // Find matching security in master to check LTP
      const masterSec = securities.find(s => s.isin === pos.isin);
      const ltp = masterSec ? masterSec.ltp : pos.averagePrice;
      
      const currentVal = Math.round((pos.quantity * ltp) / 100);
      const avgCostVal = Math.round((pos.quantity * pos.averagePrice) / 100);
      const pl = currentVal - avgCostVal;

      totalVal += currentVal;
      totalUnrealizedPL += pl;
    });

    return {
      marketValue: totalVal,
      unrealizedPL: totalUnrealizedPL,
      positionsCount: positions.length
    };
  }, [positions, securities]);

  function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  // Calculate horizontal maturity percentage (dummy timeline for dates)
  function getMaturityProgress(maturityStr: string) {
    try {
      const yearStr = maturityStr.match(/\d{4}/);
      if (!yearStr) return 40;
      const year = parseInt(yearStr[0]);
      const currentYear = new Date().getFullYear();
      
      // Assume timeline of 2024 to 2045
      const totalSpan = 20;
      const elapsed = year - currentYear;
      if (elapsed <= 0) return 100;
      const pct = 100 - Math.round((elapsed / totalSpan) * 100);
      return Math.max(10, Math.min(95, pct));
    } catch {
      return 50;
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Portfolio Value Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">G-Sec Portfolio Value</span>
          <div className="mt-3">
            <strong className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {formatCurrency(portfolioMetrics.marketValue)}
            </strong>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Total Valuation at LTP</span>
          </div>
        </div>

        <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between ${
          portfolioMetrics.unrealizedPL >= 0 
            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50/50 border-rose-100 text-rose-800'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider block">Unrealized P&L</span>
          <div className="mt-3">
            <strong className="text-3xl font-extrabold font-mono tracking-tight flex items-center gap-1.5">
              {portfolioMetrics.unrealizedPL >= 0 ? '+' : ''}
              {formatCurrency(portfolioMetrics.unrealizedPL)}
              {portfolioMetrics.unrealizedPL >= 0 ? (
                <ArrowUpRight className="w-6 h-6 text-emerald-600" />
              ) : (
                <ArrowDownRight className="w-6 h-6 text-rose-600" />
              )}
            </strong>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Compared to Avg Cost</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Securities Held</span>
          <div className="mt-3">
            <strong className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight">
              {portfolioMetrics.positionsCount}
            </strong>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Sovereign Debt positions</span>
          </div>
        </div>

      </div>

      {/* maturity timeline */}
      {positions.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <CalendarRange className="w-5 h-5 text-blue-600" /> Holdings Maturity Horizons
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Visual timeline showing years remaining until government principal repayment</p>
          </div>

          <div className="space-y-4 pt-2">
            {positions.map((pos) => {
              const secMaster = securities.find(s => s.isin === pos.isin);
              const maturity = secMaster ? secMaster.maturityDate : '2033-05-18';
              const progress = getMaturityProgress(maturity);

              return (
                <div key={pos.isin} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{pos.securityName}</span>
                    <span className="text-slate-400 font-mono">{maturity} (Principal Repay)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Holdings Section */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Demat G-Sec Holdings</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Portfolio assets held directly in dematerialized format</p>
          </div>

          {/* Table / Card layout toggle */}
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setLayout('TABLE')}
              className={`p-1.5 rounded-lg transition-all ${
                layout === 'TABLE' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('CARD')}
              className={`p-1.5 rounded-lg transition-all ${
                layout === 'CARD' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {positions.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FolderHeart className="w-12 h-12 text-slate-300 stroke-1 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Portfolio is Empty</h3>
            <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">
              You do not hold any Government Securities yet. Browse market rates to invest.
            </p>
          </div>
        ) : layout === 'TABLE' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Sovereign Security</th>
                  <th className="py-4 px-4 text-center">ISIN Code</th>
                  <th className="py-4 px-4 text-right">Qty (Face Value)</th>
                  <th className="py-4 px-4 text-right">Avg Buy Price</th>
                  <th className="py-4 px-4 text-right">Current LTP</th>
                  <th className="py-4 px-4 text-right">Market Value</th>
                  <th className="py-4 px-4 text-right">Profit / Loss</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-600">
                {positions.map((pos) => {
                  const masterSec = securities.find(s => s.isin === pos.isin);
                  const ltp = masterSec ? masterSec.ltp : pos.averagePrice;
                  
                  const marketValue = Math.round((pos.quantity * ltp) / 100);
                  const averageCostValue = Math.round((pos.quantity * pos.averagePrice) / 100);
                  const pl = marketValue - averageCostValue;

                  return (
                    <tr key={pos.isin} className="hover:bg-slate-50/40 transition-colors">
                      
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800">{pos.securityName}</div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Sovereign Debt</div>
                      </td>

                      <td className="py-4 px-4 text-center font-mono text-xs text-slate-400">
                        {pos.isin}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                        {pos.quantity.toLocaleString('en-IN')}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-500">
                        {pos.averagePrice.toFixed(4)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                        {ltp.toFixed(4)}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(marketValue)}
                      </td>

                      <td className={`py-4 px-4 text-right font-mono font-bold ${
                        pl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center">
                          <button
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-rose-50"
                            onClick={() => {
                              if (masterSec) {
                                setSelectedSecurity(masterSec);
                                setPage('order');
                              }
                            }}
                          >
                            Sell
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {positions.map((pos) => {
              const masterSec = securities.find(s => s.isin === pos.isin);
              const ltp = masterSec ? masterSec.ltp : pos.averagePrice;
              
              const marketValue = Math.round((pos.quantity * ltp) / 100);
              const averageCostValue = Math.round((pos.quantity * pos.averagePrice) / 100);
              const pl = marketValue - averageCostValue;

              return (
                <div key={pos.isin} className="border border-slate-100 rounded-xl p-5 hover:shadow-md transition-all duration-200 bg-slate-50/20">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{pos.securityName}</h4>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{pos.isin}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      pl >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
                    <div>
                      <span>Quantity Held</span>
                      <strong className="block text-slate-700 font-mono text-sm mt-0.5">{pos.quantity.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span>Market Value</span>
                      <strong className="block text-slate-800 font-mono text-sm mt-0.5">{formatCurrency(marketValue)}</strong>
                    </div>
                    <div>
                      <span>Avg Buy Cost</span>
                      <strong className="block text-slate-600 font-mono mt-0.5">{pos.averagePrice.toFixed(4)}</strong>
                    </div>
                    <div>
                      <span>Current LTP</span>
                      <strong className="block text-slate-700 font-mono mt-0.5">{ltp.toFixed(4)}</strong>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end">
                    <button
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all"
                      onClick={() => {
                        if (masterSec) {
                          setSelectedSecurity(masterSec);
                          setPage('order');
                        }
                      }}
                    >
                      Sell Security
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info notice about Demat ledger safety */}
      <div className="flex items-start gap-3 bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
        <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-800 leading-relaxed font-semibold">
          <strong>Demat Demarcation Notice:</strong> Axis G-Sec holdings represent high-security Sovereign Bonds allocated to your NSDL/CDSL Demat account. In accordance with RBI guidelines, G-Sec holdings are monitored on a dedicated secure ledger, completely isolated from your standard equity equity trading balances to ensure asset trust.
        </div>
      </div>

    </div>
  );
}
