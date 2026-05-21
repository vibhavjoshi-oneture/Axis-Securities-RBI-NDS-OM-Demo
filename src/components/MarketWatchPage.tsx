import React, { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, ArrowUpRight, ArrowDownRight, Compass, ShieldAlert } from 'lucide-react';
import type { BootstrapData, Security } from '../types';

interface MarketWatchPageProps {
  data: BootstrapData;
  setPage: (page: string) => void;
  setSelectedSecurity: (security: Security) => void;
}

export default function MarketWatchPage({ data, setPage, setSelectedSecurity }: MarketWatchPageProps) {
  const [query, setQuery] = useState('');
  const [secType, setSecType] = useState('ALL'); // ALL, GSEC, TBILL, SDL
  const [maturityFilter, setMaturityFilter] = useState('ALL'); // ALL, SHORT (<3y), MEDIUM (3-10y), LONG (10y+)
  
  // High-fidelity dynamic tick state
  const [prices, setPrices] = useState<Record<string, { bid: number; ask: number; ltp: number; direction: 'up' | 'down' | null }>>({});

  useEffect(() => {
    // Sync prices with live data from backend
    setPrices(prev => {
      const next = { ...prev };
      data.securities.forEach(s => {
        const prevPrice = prev[s.isin];
        
        // Determine direction if price changed
        let direction: 'up' | 'down' | null = null;
        if (prevPrice) {
          if (s.ltp > prevPrice.ltp) direction = 'up';
          else if (s.ltp < prevPrice.ltp) direction = 'down';
        }

        next[s.isin] = { bid: s.bid, ask: s.ask, ltp: s.ltp, direction };
      });
      return next;
    });

    // Clear direction highlight after 1 second
    const timeout = setTimeout(() => {
      setPrices(current => {
        const cleared = { ...current };
        Object.keys(cleared).forEach(isin => {
          if (cleared[isin].direction !== null) {
            cleared[isin] = { ...cleared[isin], direction: null };
          }
        });
        return cleared;
      });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [data.securities]);

  // Compute filtered securities list
  const filteredSecurities = useMemo(() => {
    return data.securities.filter((sec) => {
      // 1. Text Search query
      const matchText = `${sec.name} ${sec.isin} ${sec.contractId}`.toLowerCase().includes(query.toLowerCase());
      
      // 2. Security type filter
      let matchType = true;
      if (secType === 'GSEC') matchType = sec.name.includes('GS') || sec.name.includes('Government');
      else if (secType === 'TBILL') matchType = sec.name.includes('TB') || sec.name.includes('T-Bill');
      else if (secType === 'SDL') matchType = sec.name.includes('SDL') || sec.name.includes('State');

      // 3. Maturity filter
      let matchMaturity = true;
      const maturityYear = new Date(sec.maturityDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const yearsToMaturity = maturityYear - currentYear;

      if (maturityFilter === 'SHORT') matchMaturity = yearsToMaturity <= 3;
      else if (maturityFilter === 'MEDIUM') matchMaturity = yearsToMaturity > 3 && yearsToMaturity <= 10;
      else if (maturityFilter === 'LONG') matchMaturity = yearsToMaturity > 10;

      return matchText && matchType && matchMaturity;
    });
  }, [data.securities, query, secType, maturityFilter]);

  function getDirectionColor(direction: 'up' | 'down' | null) {
    if (direction === 'up') return 'text-emerald-600 bg-emerald-50 animate-tick-up';
    if (direction === 'down') return 'text-rose-600 bg-rose-50 animate-tick-down';
    return '';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Search and Filters Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Sovereign Market Watch</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Real-time G-Sec, Treasury Bills, and SDL yield rates</p>
          </div>
          
          {/* Search bar */}
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
            <input 
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2.5 pl-11 pr-4 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700" 
              placeholder="Search by ISIN, Name, Contract..." 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
            />
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            Filter By:
          </div>

          {/* Security Type Filter */}
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
            {['ALL', 'GSEC', 'TBILL', 'SDL'].map((type) => (
              <button
                key={type}
                onClick={() => setSecType(type)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  secType === type 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type === 'ALL' ? 'All Types' : type}
              </button>
            ))}
          </div>

          {/* Maturity Filter */}
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
            {[
              { id: 'ALL', label: 'All Maturities' },
              { id: 'SHORT', label: 'Short (<3y)' },
              { id: 'MEDIUM', label: 'Medium (3-10y)' },
              { id: 'LONG', label: 'Long (10y+)' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMaturityFilter(m.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  maturityFilter === m.id 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {filteredSecurities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <Compass className="w-12 h-12 text-slate-300 stroke-1" />
            <h3 className="text-sm font-bold text-slate-700">No G-Secs Found</h3>
            <p className="text-xs text-slate-400 font-semibold max-w-xs">
              No results match your search parameters. Try clearing your filters or query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Sovereign Security</th>
                  <th className="py-4 px-4 text-center">ISIN Code</th>
                  <th className="py-4 px-4 text-right">Maturity Date</th>
                  <th className="py-4 px-4 text-right">LTP</th>
                  <th className="py-4 px-4 text-right">Bid</th>
                  <th className="py-4 px-4 text-right">Ask</th>
                  <th className="py-4 px-4 text-right">Indicative Yield</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-600">
                {filteredSecurities.map((sec) => {
                  const state = prices[sec.isin] || { bid: sec.bid, ask: sec.ask, ltp: sec.ltp, direction: null };
                  
                  return (
                    <tr key={sec.isin} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800">{sec.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-bold uppercase px-1.5 py-0.5 bg-blue-50 border border-blue-100/50 rounded text-blue-600 tracking-wide">
                            Coupon {sec.coupon}
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold">
                            Lot: {sec.lotSize.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-slate-400 text-xs font-semibold select-all">
                        {sec.isin}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-500 font-medium">
                        {sec.maturityDate}
                      </td>
                      <td className={`py-4 px-4 text-right font-mono font-bold text-slate-800 transition-all duration-300 rounded ${getDirectionColor(state.direction)}`}>
                        <div className="flex items-center justify-end gap-1">
                          {state.ltp.toFixed(4)}
                          {state.direction === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-600" />}
                          {state.direction === 'down' && <ArrowDownRight className="w-3 h-3 text-rose-600" />}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                        {state.bid.toFixed(4)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                        {state.ask.toFixed(4)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600">
                        {sec.yield}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all hover:shadow"
                            onClick={() => {
                              setSelectedSecurity(sec);
                              setPage('order');
                            }}
                          >
                            Trade
                          </button>
                          <button 
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition-all"
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Alert Footer Banner */}
      <div className="flex items-start gap-3 bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
        <ShieldAlert className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800 leading-relaxed font-medium">
          <strong>Important Pricing Notice:</strong> The G-Sec buy and sell rates displayed above are indicative matching rates from NDS-OM. In compliance with RBI guidelines, retail order executions on the Axis Platform are routing exclusively as <strong>manual Limit orders</strong> to ensure transparent executions.
        </p>
      </div>

    </div>
  );
}
