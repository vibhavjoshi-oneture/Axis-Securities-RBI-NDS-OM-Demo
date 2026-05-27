import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title?: string;
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
}

export default function Modal({ title, children, open, onClose }: ModalProps) {
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col scale-100 transition-transform duration-300 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-800">{title || 'Confirm Action'}</h3>
          <button 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
