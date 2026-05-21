import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface CheckItem {
  ok: boolean;
  label: string;
  help?: string;
}

interface ValidationChecklistProps {
  checks: CheckItem[];
}

export default function ValidationChecklist({ checks }: ValidationChecklistProps) {
  return (
    <div className="space-y-3">
      {checks.map((c, i) => (
        <div 
          key={i} 
          className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
            c.ok 
              ? 'bg-emerald-50/40 border-emerald-100/70 text-slate-800' 
              : 'bg-amber-50/40 border-amber-100/70 text-slate-800'
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {c.ok ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500 fill-amber-50" />
            )}
          </div>
          <div className="flex-1">
            <div className={`text-sm font-semibold leading-none ${c.ok ? 'text-slate-800' : 'text-slate-900'}`}>
              {c.label}
            </div>
            {c.help ? (
              <div className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                {c.help}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
