import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-4xl" }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode; maxWidth?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 md:p-4 backdrop-blur-md">
      <div className={`bg-white/90 backdrop-blur-2xl rounded-xl shadow-2xl w-full ${maxWidth} max-h-[95vh] overflow-y-auto border border-white/20 transition-colors duration-1000`}>
        <div className="flex justify-between items-center p-3 md:p-6 bg-white/5 border-b border-white/10">
          <h2 className="text-xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: '"Playfair Display", serif' }}>{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-500/10 transition-colors text-slate-500 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>
        <div className="p-3 md:p-8 bg-slate-50/10">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
