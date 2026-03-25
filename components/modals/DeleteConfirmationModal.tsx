import React from 'react';
import Modal from '../ui/Modal';
import { AlertCircle } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    bookingId: string | null;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, bookingId }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirm Deletion" maxWidth="max-w-md">
            <div className="flex flex-col items-center text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle size={32} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Delete Booking #{bookingId}?</h3>
                <p className="text-slate-500 text-sm">
                    Are you sure you want to permanently delete this booking? This action cannot be undone.
                </p>
                <div className="flex w-full gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => { onConfirm(); onClose(); }}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors"
                    >
                        Yes, Delete
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DeleteConfirmationModal;
