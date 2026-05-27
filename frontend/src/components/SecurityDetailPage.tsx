import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { 
  Building, BookOpen, Scale, Landmark, Info, ArrowLeft, ArrowUpRight 
} from 'lucide-react';
import type { Security } from '../types';

interface SecurityDetailPageProps {
  security: Security;
  setPage: (page: string) => void;
}

export default function SecurityDetailPage({ security, setPage }: SecurityDetailPageProps) {
  // Generate dummy historical curve points for this security to make the charts look premium
  const chartData = useMemo(() => {
    const yieldNum = parseFloat(security.yield) || 7.2;
    const ltpNum = security.ltp || 100.0;
    
    return [
      { date: 'Mon', yield: yieldNum + 0.04, price: ltpNum - 0.25 },
      { date: 'Tue', yield: yieldNum + 0.02, price: ltpNum - 0.15 },
      { date: 'Wed', yield: yieldNum + 0.05, price: ltpNum - 0.35 },
      { date: 'Thu', yield: yieldNum - 0.01, price: ltpNum + 0.05 },
      { date: 'Fri', yield: yieldNum, price: ltpNum },
    ];
  }, [security]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Back button and title */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setPage('market')}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Market Watch
        </button>
        
        <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 uppercase tracking-wider">
          Sovereign G-Sec Security Details
        </span>
      </div>

      {/* Main Grid Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-blue-50 rounded-2xl text-blue-600 flex-shrink-0">
            <Landmark className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{security.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-semibold text-slate-400">
              <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{security.isin}</span>
              <span>•</span>
              <span>Contract ID: <strong className="font-mono text-slate-600">{security.contractId}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-50 transition-all hover:-translate-y-0.5"
            onClick={() => setPage('order')}
          >
            Place Limit Order
          </button>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Indicative Bid</span>
          <div className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">{security.bid.toFixed(4)}</div>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Lot Size: {security.lotSize.toLocaleString('en-IN')}</span>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Indicative Ask</span>
          <div className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">{security.ask.toFixed(4)}</div>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Lot Size: {security.lotSize.toLocaleString('en-IN')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Traded Price</span>
          <div className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight mt-1">{security.ltp.toFixed(4)}</div>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Face Value: ₹100 per unit</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm bg-emerald-50/20 border-emerald-100/50">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Indicative Yield</span>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono tracking-tight mt-1">{security.yield}</div>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-1">Annual Yield Return</span>
        </div>
      </div>

      {/* Main Content Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Historical Line Chart and Depth */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Yield / Price Chart Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Historical Yield Trend</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Indicative yields for this security this week</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                <ArrowUpRight className="w-3.5 h-3.5" /> Live Indicative Curve
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} domain={['auto', 'auto']} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }} 
                  />
                  <Area type="monotone" dataKey="yield" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#yieldGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Market Depth Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">NDS-OM Market Depth</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Top order book depths (simulated live values)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Buy Side */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-blue-600 bg-blue-50/50 rounded-lg p-2 border border-blue-100 text-center">
                  BUY ORDERS (BID)
                </div>
                <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-slate-50">
                      <th className="py-2">Depth No</th>
                      <th className="py-2 text-right">Price</th>
                      <th className="py-2 text-right">Qty (Units)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-mono">
                    <tr className="bg-blue-50/20 font-bold">
                      <td className="py-2.5 text-blue-600">Bid #1</td>
                      <td className="py-2.5 text-right text-slate-800">{(security.bid - 0.0001).toFixed(4)}</td>
                      <td className="py-2.5 text-right text-slate-800">1,00,000</td>
                    </tr>
                    <tr>
                      <td className="py-2">Bid #2</td>
                      <td className="py-2 text-right text-slate-600">{(security.bid - 0.0015).toFixed(4)}</td>
                      <td className="py-2 text-right text-slate-600">2,00,000</td>
                    </tr>
                    <tr>
                      <td className="py-2">Bid #3</td>
                      <td className="py-2 text-right text-slate-500">{(security.bid - 0.0025).toFixed(4)}</td>
                      <td className="py-2 text-right text-slate-500">5,00,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sell Side */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-rose-600 bg-rose-50/50 rounded-lg p-2 border border-rose-100 text-center">
                  SELL ORDERS (ASK)
                </div>
                <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-slate-50">
                      <th className="py-2">Depth No</th>
                      <th className="py-2 text-right">Price</th>
                      <th className="py-2 text-right">Qty (Units)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-mono">
                    <tr className="bg-rose-50/20 font-bold">
                      <td className="py-2.5 text-rose-600">Ask #1</td>
                      <td className="py-2.5 text-right text-slate-800">{(security.ask + 0.0001).toFixed(4)}</td>
                      <td className="py-2.5 text-right text-slate-800">1,50,000</td>
                    </tr>
                    <tr>
                      <td className="py-2">Ask #2</td>
                      <td className="py-2 text-right text-slate-600">{(security.ask + 0.0015).toFixed(4)}</td>
                      <td className="py-2 text-right text-slate-600">3,00,000</td>
                    </tr>
                    <tr>
                      <td className="py-2">Ask #3</td>
                      <td className="py-2 text-right text-slate-500">{(security.ask + 0.003).toFixed(4)}</td>
                      <td className="py-2 text-right text-slate-500">1,00,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Educational Help and Security Rules */}
        <div className="space-y-8">
          
          {/* Rules & Setup */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <Scale className="w-5 h-5 text-blue-600" /> Trading Rules
            </h2>
            <div className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
              <div className="py-3 flex justify-between">
                <span className="text-slate-400">Coupon Percentage</span>
                <span className="text-slate-700">{security.coupon} per annum</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-400">Permitted Lot Size</span>
                <span className="text-slate-700">{security.lotSize.toLocaleString('en-IN')} units</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-400">Tick Increments</span>
                <span className="text-slate-700">{security.tickSize.toFixed(4)} ₹</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-400">Settlement Code</span>
                <span className="text-slate-700">T+1 Sovereign Cycle</span>
              </div>
            </div>
          </div>

          {/* Jargon Translation Sheet */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm text-slate-200 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              <BookOpen className="w-5 h-5 text-blue-400" /> Bond Jargon Simplified
            </h2>
            
            <div className="space-y-4 text-xs leading-relaxed font-semibold">
              <div>
                <span className="text-blue-400 block font-bold">What is Coupon?</span>
                <p className="text-slate-400 mt-1">
                  The Coupon is the fixed interest paid by the Indian Government on this G-Sec. It is expressed as an annual percentage and typically paid semi-annually.
                </p>
              </div>

              <div>
                <span className="text-blue-400 block font-bold">What is Indicative Yield?</span>
                <p className="text-slate-400 mt-1">
                  Yield is the return you will earn if you hold the G-Sec until its maturity date. Unlike equity stock dividends, this return is highly secure.
                </p>
              </div>

              <div>
                <span className="text-blue-400 block font-bold">What is Maturity Date?</span>
                <p className="text-slate-400 mt-1">
                  This is the pre-specified date on which the Central Government will fully repay you the original principal face value (₹100 per unit).
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
