import React from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-4xl',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  maxWidth?: string;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 md:p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className={`bg-white/90 backdrop-blur-2xl rounded-xl shadow-2xl w-full ${maxWidth} max-h-[95vh] flex flex-col border border-white/20`}
          >
            <div className="flex justify-between items-center p-3 md:p-6 bg-white/5 border-b border-white/10 shrink-0">
              <h2
                className="text-xl md:text-3xl font-bold text-slate-900"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                {title}
              </h2>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-500/10 transition-colors text-slate-500 hover:text-slate-900"
              >
                <X size={24} />
              </motion.button>
            </div>
            <div className="p-3 md:p-8 bg-slate-50/10 overflow-y-auto flex-1">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
