import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { ShieldCheck, Lock } from 'lucide-react';

interface SecurityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthenticated: () => void;
}

export default function SecurityModal({ isOpen, onClose, onAuthenticated }: SecurityModalProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Static credentials check as per user request
        if (username === 'Admin' && password === 'VaranasiKarunaVilla') {
            onAuthenticated();
            onClose();
            setUsername('');
            setPassword('');
            setError('');
        } else {
            setError('Invalid credentials. Access denied.');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Security Check" maxWidth="max-w-md">
            <div className="flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600">
                    <ShieldCheck size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Restricted Access</h3>
                <p className="text-slate-500 text-center mb-6 text-sm">
                    This data is sensitive. Please enter your administrator credentials to view revenue details.
                </p>

                <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
                    <div>
                        <input
                            type="text"
                            placeholder="Username"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-xs font-medium text-center bg-red-50 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

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
                            <Lock size={16} /> Authenticate
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
