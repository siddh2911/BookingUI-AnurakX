import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border border-slate-100">
        <div className="flex justify-between items-center p-6 bg-white border-b border-transparent">
          <h2 className="text-3xl font-bold text-slate-900" style={{ fontFamily: '"Playfair Display", serif' }}>{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>
        <div className="p-8 bg-slate-50/30">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
