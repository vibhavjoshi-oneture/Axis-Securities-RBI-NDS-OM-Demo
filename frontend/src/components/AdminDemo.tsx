import React from 'react';
import { Terminal, Cpu, CheckCircle2, RefreshCw, Layers, ShieldCheck, Database } from 'lucide-react';
import type { AuditEvent } from '../types';

interface AdminDemoProps {
  fixRequest?: string | null;
  fixResponse?: string | null;
  graphqlRequestExample?: string;
  auditTrail?: AuditEvent[];
}

export default function AdminDemo({ 
  fixRequest, 
  fixResponse, 
  graphqlRequestExample,
  auditTrail = []
}: AdminDemoProps) {

  function getEventBadge(type: string) {
    const s = type.toUpperCase();
    if (s === 'FIX') return 'bg-amber-950/40 text-amber-400 border-amber-900/50';
    if (s === 'API') return 'bg-blue-950/40 text-blue-400 border-blue-900/50';
    if (s === 'MUTATION') return 'bg-purple-950/40 text-purple-400 border-purple-900/50';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  }

  function getParsedJSON(val?: string | null) {
    if (!val) return '/* No active payload registered in this session */';
    try {
      return JSON.stringify(JSON.parse(val), null, 2);
    } catch {
      return val;
    }
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Introduction Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-slate-900 rounded-2xl text-blue-400 flex-shrink-0">
            <Cpu className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Admin & Technical Simulator Control</h1>
            <p className="text-xs text-slate-400 font-semibold mt-1 max-w-xl leading-relaxed">
              This terminal provides developer visibility into intermediate system states. It captures simulated FIX payloads, Ariadne GraphQL mutations, and internal AppSync engine audit trails.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-3 py-1 uppercase tracking-wider block text-center">
          Developer Mode Active
        </span>
      </div>

      {/* Service Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GraphQL local API</span>
            <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-2">
              <Database className="w-4 h-4 text-emerald-500" /> Active (Ariadne)
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">FIX Gateway Simulator</span>
            <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-2">
              <RefreshCw className="w-4 h-4 text-emerald-500" /> Active (Mock)
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Matching Engine NDS-OM</span>
            <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-2">
              <Layers className="w-4 h-4 text-emerald-500" /> Active (AppSync)
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cleared Settlement ICCL</span>
            <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Active (T+1 Match)
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
        </div>

      </div>

      {/* Main split dashboard: FIX and Audit log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: FIX JSON payloads */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* FIX tags */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-300 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Terminal className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Sovereign Order FIX Inspector</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tag 35=D NewOrderSingle (Buy/Sell Limit)
                </span>
                <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono overflow-auto max-h-[220px] text-slate-300 border border-slate-950/80">
                  {getParsedJSON(fixRequest)}
                </pre>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tag 35=8 ExecutionReport (Success match)
                </span>
                <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono overflow-auto max-h-[220px] text-slate-300 border border-slate-950/80">
                  {getParsedJSON(fixResponse)}
                </pre>
              </div>
            </div>
          </div>

          {/* GraphQL request query */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-300 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active GraphQL Ariadne Mutation Schema
            </span>
            <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono overflow-auto max-h-[160px] text-slate-300 border border-slate-950/80">
              {graphqlRequestExample || '/* GraphQL placeOrder Mutation definitions */'}
            </pre>
          </div>

        </div>

        {/* Right Col: Live audit log console */}
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 text-slate-300 flex flex-col h-[540px]">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-900">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Event Audit console</h2>
            </div>
            
            <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-slate-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" /> LIVE STREAM
            </span>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-3 font-mono text-[10px] leading-relaxed">
            {auditTrail.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                /* No audit event packets broadcast yet. Interact with the platform to trigger engine logs */
              </div>
            ) : (
              auditTrail.map((event) => (
                <div 
                  key={event.id} 
                  className="p-3 bg-slate-900/60 border border-slate-900 rounded-lg space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[9px]">{event.timestamp.split('T')[1]?.slice(0, 8) || event.timestamp}</span>
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                      getEventBadge(event.type)
                    }`}>
                      {event.type}
                    </span>
                  </div>
                  
                  <div className="font-bold text-slate-200 text-[10px]">
                    {event.title}
                  </div>
                  
                  <div className="text-slate-450 leading-relaxed">
                    {event.details}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
