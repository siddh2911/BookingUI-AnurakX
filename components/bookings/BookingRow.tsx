import React from 'react';
import { Booking, Room, BookingStatus, PaymentMethod } from '../../types';
import { Pencil, CreditCard, CheckCircle, Trash2 } from 'lucide-react';
import PlatformIcon from '../common/PlatformIcon';

interface BookingRowProps {
  booking: Booking;
  room: Room | undefined;
  onUpdateStatus: (bookingId: string, status: BookingStatus) => void;
  onEditBooking: (booking: Booking) => void;
  onAddPayment: (booking: Booking) => void;
  onDeleteBooking: (bookingId: string) => void;
}

const BookingRow: React.FC<BookingRowProps> = ({ booking, room, onUpdateStatus, onEditBooking, onAddPayment, onDeleteBooking }) => {
  const paid = (booking.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const balance = booking.pendingBalance || 0;
  const roomNumber = room?.number || 'N/A';

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-2 py-3 font-mono text-xs text-slate-500">{booking.id}</td>
      <td className="px-2 py-3">
        <div className="font-medium text-slate-900">{booking.guestName}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <PlatformIcon source={booking.source} className="w-3.5 h-3.5 text-slate-400" />
          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${booking.source === 'AIRBNB' ? 'bg-[#FF5A5F]/10 text-[#FF5A5F]' :
            booking.source === 'BOOKING_COM' ? 'bg-[#003580]/10 text-[#003580]' :
              'bg-slate-100 text-slate-500'
            }`}>
            {booking.source}
          </span>
        </div>
      </td>
      <td className="px-2 py-3 font-bold">{roomNumber}</td>
      <td className="px-2 py-3">{booking.checkInDate}</td>
      <td className="px-2 py-3">{booking.checkOutDate}</td>

      <td className="px-2 py-2">
        <select
          value={booking.status}
          onChange={(e) => onUpdateStatus(booking.id, e.target.value as BookingStatus)}
          className="border-none bg-transparent font-medium text-sm focus:ring-0 cursor-pointer"
        >
          {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-2 py-2">
        {balance > 0 ? (
          <div className="flex flex-col items-start gap-1">
            <span className="text-red-600 font-bold text-xs">₹{balance.toLocaleString()}</span>
            <button
              className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100 uppercase tracking-wide hover:bg-red-100 transition-colors"
              onClick={(e) => { e.stopPropagation(); onAddPayment(booking); }}
              title="Add Payment"
            >
              Pay
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
            <CheckCircle size={14} />
            <span>Paid</span>
          </div>
        )}
      </td>
      <td className="px-2 pr-16 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onEditBooking(booking); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center justify-center" title="Update Booking"><Pencil size={18} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteBooking(booking.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center" title="Delete Booking"><Trash2 size={18} /></button>
        </div>
      </td>
    </tr>
  );
};

export default BookingRow;
