import React from 'react';
import Modal from '../ui/Modal';
import { Booking } from '../../types';
import { CreditCard, Calendar, User, Clock, CheckCircle } from 'lucide-react';
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
                        <h3 className="text-xl font-bold">{booking.guestName}</h3>
                        <p className="text-slate-500 text-sm">Room {booking.roomId}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                            <PlatformIcon source={booking.source} className="w-3.5 h-3.5" />
                            <span>{booking.source}</span>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                        booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                        {booking.status}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Calendar size={14} /> <span className="text-xs uppercase font-bold">Check In</span>
                        </div>
                        <p className="font-semibold">{booking.checkInDate}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Calendar size={14} /> <span className="text-xs uppercase font-bold">Check Out</span>
                        </div>
                        <p className="font-semibold">{booking.checkOutDate}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Total Amount</p>
                            <p className="text-xs text-slate-400">Includes taxes</p>
                        </div>
                    </div>
                    <span className="text-lg font-bold">₹{booking.totalAmount.toLocaleString()}</span>
                </div>

                <button
                    onClick={onAddPayment}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
                >
                    Add Payment
                </button>
            </div>
        </Modal>
    );
};

export default BookingDetailsModal;
