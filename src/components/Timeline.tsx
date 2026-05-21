import React from 'react';
import { Calendar, Circle, CheckCircle2, AlertCircle } from 'lucide-react';

interface TimelineEvent {
  time: string;
  status: string;
  note?: string;
  statusType?: 'success' | 'warning' | 'error' | 'info';
}

interface TimelineProps {
  events: TimelineEvent[];
}

export default function Timeline({ events }: TimelineProps) {
  function getIcon(status: string) {
    const s = status.toUpperCase();
    if (['EXECUTED', 'ACCEPTED', 'COMPLETED', 'SUCCESS'].some(x => s.includes(x))) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-500 bg-white" />;
    }
    if (['REJECTED', 'FAILED', 'CANCELLED'].some(x => s.includes(x))) {
      return <AlertCircle className="w-5 h-5 text-rose-500 bg-white" />;
    }
    if (['VALIDATED', 'SENT_TO_FIX', 'PENDING'].some(x => s.includes(x))) {
      return <Circle className="w-5 h-5 text-amber-500 bg-white fill-amber-50" />;
    }
    return <Circle className="w-5 h-5 text-blue-500 bg-white fill-blue-50" />;
  }

  return (
    <div className="relative border-l-2 border-slate-100 ml-3 pl-6 space-y-6 py-2">
      {events.map((ev, idx) => (
        <div className="relative" key={idx}>
          {/* Node Icon */}
          <div className="absolute -left-[37px] top-0.5">
            {getIcon(ev.status)}
          </div>
          
          {/* Node Card */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:shadow-sm transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
              <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {ev.status.replace(/_/g, ' ')}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium font-mono">
                <Calendar className="w-3.5 h-3.5" />
                {ev.time}
              </span>
            </div>
            {ev.note ? (
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                {ev.note}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
