import React from 'react';
import { Scan } from 'lucide-react';

export const PaymentQRCard: React.FC = () => {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group h-full">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-slate-500 text-sm font-medium">Quick Payment</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">Scan to Pay</h3>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <Scan size={20} />
                </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-3 bg-white border-2 border-dashed border-slate-200 rounded-xl group-hover:border-blue-500/30 transition-colors">
                    <img
                        src="/assets/upi-qr.jpg"
                        alt="UPI QR Code"
                        className="w-64 h-64 object-contain mix-blend-multiply"
                    />
                </div>
                <div className="text-center">
                    <p className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-1 rounded-full inline-block">
                        9415294966@axl
                    </p>
                </div>
            </div>
        </div>
    );
};
