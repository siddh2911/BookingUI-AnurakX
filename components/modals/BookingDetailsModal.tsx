import React from 'react';
import Modal from '../ui/Modal';
import { Booking } from '../../types';
import { CreditCard, Calendar, User, Clock, CheckCircle, Download } from 'lucide-react';
import { generateInvoice } from '../../services/pdfGenerator';
import PlatformIcon from '../common/PlatformIcon';

interface BookingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking;
    onAddPayment: () => void;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ isOpen, onClose, booking, onAddPayment }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Booking Details">
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{booking.guestName}</h3>
                        <p className="text-slate-600 text-sm font-semibold">Room {booking.roomId}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
                            <PlatformIcon source={booking.sources?.[0]?.source || 'Direct'} className="w-3.5 h-3.5" />
                            <span>{booking.sources?.[0]?.source || 'Unknown'}</span>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                        booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                        {booking.status}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/10 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <Calendar size={14} /> <span className="text-xs uppercase font-bold">Check In</span>
                        </div>
                        <p className="font-semibold text-slate-800">{booking.checkInDate}</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <Calendar size={14} /> <span className="text-xs uppercase font-bold">Check Out</span>
                        </div>
                        <p className="font-semibold text-slate-800">{booking.checkOutDate}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-white/10 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">Total Amount</p>
                            <p className="text-xs text-slate-500">Includes taxes</p>
                        </div>
                    </div>
                    <span className="text-lg font-bold text-slate-900">₹{booking.totalAmount.toLocaleString()}</span>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onAddPayment}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-sm"
                    >
                        Add Payment
                    </button>
                    <button
                        onClick={() => generateInvoice(booking)}
                        className="flex-1 flex justify-center items-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm"
                    >
                        <Download size={18} />
                        Receipt
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default BookingDetailsModal;
