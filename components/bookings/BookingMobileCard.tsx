import React from 'react';
import { Booking, Room, BookingStatus } from '../../types';
import { Pencil, Trash2, Calendar, MapPin, CheckCircle, Download } from 'lucide-react';
import PlatformIcon from '../common/PlatformIcon';
import { generateInvoice } from '../../services/pdfGenerator';

interface BookingMobileCardProps {
    booking: Booking;
    room: Room | undefined;
    onUpdateStatus: (bookingId: string, status: BookingStatus) => void;
    onEditBooking: (booking: Booking) => void;
    onAddPayment: (booking: Booking) => void;
    onDeleteBooking: (bookingId: string) => void;
}

const BookingMobileCard: React.FC<BookingMobileCardProps> = ({
    booking,
    room,
    onUpdateStatus,
    onEditBooking,
    onAddPayment,
    onDeleteBooking
}) => {
    const paid = (booking.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const balance = booking.pendingBalance || 0;
    const roomNumber = room?.number || 'N/A';



    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="bg-white/70 backdrop-blur-xl transition-colors duration-1000 rounded-xl shadow-sm border border-white/20 p-4 space-y-3">
            {/* Header: Guest Info & Status */}
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate pr-2 w-full">{booking.guestName}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {booking.sources?.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                                <PlatformIcon source={s.source} className="w-3.5 h-3.5 text-slate-400" />
                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${s.source === 'Airbnb' ? 'bg-[#FF5A5F]/10 text-[#FF5A5F]' :
                                    s.source === 'Booking.com' ? 'bg-[#003580]/10 text-[#003580]' :
                                        'bg-slate-100 text-slate-500'
                                    }`} title={`₹${s.amount || 0}${s.startDate && s.endDate ? ` (${formatDate(s.startDate)} - ${formatDate(s.endDate)})` : ''}`}>
                                    {s.source}
                                </span>
                            </div>
                        ))}
                        <span className="text-xs font-mono text-slate-400 ml-1">#{booking.id}</span>
                    </div>
                </div>
                <select
                    value={booking.status}
                    onChange={(e) => onUpdateStatus(booking.id, e.target.value as BookingStatus)}
                    className="text-xs font-medium border-white/20 rounded-md py-1 pr-7 pl-2 bg-white/10 text-slate-800 focus:ring-0 focus:border-blue-500 shrink-0"
                >
                    {Object.values(BookingStatus).map(s => <option key={s} value={s} className="text-slate-800 bg-white">{s}</option>)}
                </select>
            </div>

            <div className="border-t border-white/10 -mx-4" />

            {/* Body: Room & Dates */}
            <div className="flex items-center justify-between text-sm">
                <div className="space-y-1">
                    <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} /> Room</div>
                    <div className="font-bold text-slate-800 flex items-baseline gap-1.5">
                        <span>{roomNumber}</span>
                    </div>
                    {(booking.bookingPackage || booking.mealPlan) && (
                        <div className="text-[10px] text-slate-500 leading-tight">
                            {[booking.bookingPackage, booking.mealPlan].filter(Boolean).join(' | ')}
                        </div>
                    )}
                </div>
                <div className="space-y-0.5 text-right">
                    <div className="text-xs text-slate-500 flex items-center justify-end gap-1">Dates</div>
                    <div className="font-semibold text-slate-800 flex items-center justify-end flex-wrap">
                        {formatDate(booking.checkInDate)} <span className="text-slate-400 font-bold mx-1">→</span> {formatDate(booking.checkOutDate)}
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10 -mx-4" />

            {/* Footer: Balance & Actions */}
            <div className="flex items-center justify-between pt-1">
                <div>
                    {balance > 0 ? (
                        <div className="flex items-center gap-2.5">
                            <span className="text-red-600 font-bold text-sm">₹{balance.toLocaleString()}</span>
                            <button
                                className="text-red-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                                onClick={(e) => { e.stopPropagation(); onAddPayment(booking); }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                Pay
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wide">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span>Paid</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={async (e) => { e.stopPropagation(); await generateInvoice(booking, room); }}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEditBooking(booking); }}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    >
                        <Pencil size={18} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDeleteBooking(booking.id); }}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookingMobileCard;
