import React from 'react';
import Modal from '../ui/Modal';
import { ShieldCheck, Lock } from 'lucide-react';

interface SecurityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthenticated: () => void;
    message?: string;
    confirmLabel?: string;
}

export default function SecurityModal({
    isOpen,
    onClose,
    onAuthenticated,
    message = 'This data is sensitive and is only available to authenticated administrators.',
    confirmLabel = 'Continue'
}: SecurityModalProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAuthenticated();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Security Check" maxWidth="max-w-md">
            <div className="flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600">
                    <ShieldCheck size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Restricted Access</h3>
                <p className="text-slate-500 text-center mb-6 text-sm">
                    {message}
                </p>

                <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-bold text-sm shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                        >
                            <Lock size={16} /> {confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
