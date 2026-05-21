import React from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function Drawer({ open, onClose, children, title }: DrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <aside 
        className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white border-l border-slate-100 shadow-2xl z-50 flex flex-col animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800">{title || 'Details'}</h3>
          <button 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </aside>
    </>
  );
}
