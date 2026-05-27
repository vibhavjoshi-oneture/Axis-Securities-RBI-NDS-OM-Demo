import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastMessage = { id: string; type?: 'success' | 'error' | 'info'; text: string };

interface ToastProps {
  message: ToastMessage | null;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800 shadow-emerald-50',
    error: 'bg-rose-50 border-rose-100 text-rose-800 shadow-rose-50',
    info: 'bg-blue-50 border-blue-100 text-blue-800 shadow-blue-50',
  };

  const Icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertTriangle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const type = message.type || 'info';

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl border shadow-lg max-w-sm w-full animate-slide-in ${bgColors[type]}`}
      role="status"
    >
      <div className="flex-shrink-0">{Icons[type]}</div>
      <div className="flex-1 text-sm font-medium leading-relaxed">{message.text}</div>
      <button 
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 p-1 hover:bg-black/5 rounded transition-all" 
        onClick={onClose}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
