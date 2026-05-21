import React, { useMemo, useState } from 'react';
import { ShoppingBag, ArrowUpRight, ArrowDownRight, Clipboard, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import type { Trade } from '../types';

interface TradeBookPageProps {
  trades: Trade[];
}

export default function TradeBookPage({ trades }: TradeBookPageProps) {
  const [downloading, setDownloading] = useState(false);

  // Compute metrics
  const metrics = useMemo(() => {
    let buyVal = 0;
    let sellVal = 0;
    trades.forEach(t => {
      if (t.side === 'BUY') buyVal += t.tradeValue;
      else sellVal += t.tradeValue;
    });

    return {
      buyValue: buyVal,
      sellValue: sellVal,
      count: trades.length
    };
  }, [trades]);

  function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  function formatTradeTime(timeStr: string) {
    try {
      return new Date(timeStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
    }
  }

  // Calculate mock Settlement Date (T+1 Business Day)
  function getSettlementDate(timeStr: string) {
    try {
      const date = new Date(timeStr);
      // add 1 day
      date.setDate(date.getDate() + 1);
      // If weekend, push to Monday
      if (date.getDay() === 0) date.setDate(date.getDate() + 1); // Sunday -> Monday
      else if (date.getDay() === 6) date.setDate(date.getDate() + 2); // Saturday -> Monday
      
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'T+1 Cycle';
    }
  }

  // Simulated export action
  function handleExport() {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      
      // Build dummy CSV contents
      const headers = 'Trade ID,Order ID,Security,Side,Quantity,Price,Value,Trade Time,Settlement\n';
      const rows = trades.map(t => 
        `${t.id},${t.orderId},"${t.securityName}",${t.side},${t.quantity},${t.price},${t.tradeValue},"${t.tradeTime}","${getSettlementDate(t.tradeTime)}"`
      ).join('\n');
      
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `Axis_GSec_TradeBook_${Date.now()}.csv`);
      a.click();
    }, 1200);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Overview Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sovereign Purchases</span>
            <strong className="text-2xl font-extrabold text-blue-700 font-mono block mt-1">
              {formatCurrency(metrics.buyValue)}
            </strong>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sovereign Sales</span>
            <strong className="text-2xl font-extrabold text-slate-600 font-mono block mt-1">
              {formatCurrency(metrics.sellValue)}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Executed Trades Count</span>
            <strong className="text-2xl font-extrabold text-slate-800 font-mono block mt-1">
              {metrics.count}
            </strong>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Trades table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Trade Ledger History</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Settle-guaranteed trades finalized on NDS-OM</p>
          </div>
          
          <button
            onClick={handleExport}
            disabled={trades.length === 0 || downloading}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 rounded-xl text-xs font-bold text-slate-600 transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {downloading ? 'Exporting CSV...' : 'Export Trade Book'}
          </button>
        </div>

        {trades.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Clipboard className="w-12 h-12 text-slate-300 stroke-1 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Trades Finalized</h3>
            <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">
              You haven't executed any G-Sec orders in this session yet. Placed orders get matched automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Trade ID</th>
                  <th className="py-4 px-4">Order ID</th>
                  <th className="py-4 px-4">Security</th>
                  <th className="py-4 px-4 text-center">Side</th>
                  <th className="py-4 px-4 text-right">Quantity</th>
                  <th className="py-4 px-4 text-right">Price</th>
                  <th className="py-4 px-4 text-right">Trade Value</th>
                  <th className="py-4 px-4 text-right">Trade Time</th>
                  <th className="py-4 px-6 text-right">Settlement Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-600">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-slate-50/40 transition-colors">
                    
                    <td className="py-4 px-6 font-mono text-xs text-slate-800 font-bold">
                      {trade.id.slice(0, 8)}
                    </td>

                    <td className="py-4 px-4 font-mono text-xs text-slate-400">
                      {trade.orderId.slice(0, 8)}
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-800">{trade.securityName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{trade.isin}</div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded ${
                        trade.side === 'BUY' 
                          ? 'bg-blue-50 text-blue-600 border border-blue-100/40' 
                          : 'bg-rose-50 text-rose-600 border border-rose-100/40'
                      }`}>
                        {trade.side}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                      {trade.quantity.toLocaleString('en-IN')}
                    </td>

                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                      {trade.price.toFixed(4)}
                    </td>

                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                      {formatCurrency(trade.tradeValue)}
                    </td>

                    <td className="py-4 px-4 text-right text-slate-500 font-medium font-mono text-xs">
                      {formatTradeTime(trade.tradeTime)}
                    </td>

                    <td className="py-4 px-6 text-right text-emerald-600 font-bold font-mono text-xs">
                      {getSettlementDate(trade.tradeTime)}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
