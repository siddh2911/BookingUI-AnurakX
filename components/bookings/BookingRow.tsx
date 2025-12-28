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
  const balance = booking.pendingBalance || 0; // Use pendingBalance from API
  const roomNumber = room?.number || 'N/A';

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-6 py-4 font-mono text-xs text-slate-500">{booking.id}</td>
      <td className="px-6 py-4">
        <div className="font-medium text-slate-900">{booking.guestName}</div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
          <PlatformIcon source={booking.source} className="w-3.5 h-3.5" />
          <span>{booking.source}</span>
        </div>
      </td>
      <td className="px-6 py-4 font-bold">{roomNumber}</td>
      <td className="px-6 py-4">{booking.checkInDate}</td>
      <td className="px-6 py-4">{booking.checkOutDate}</td>
      <td className="px-6 py-4">
        <select
          value={booking.status}
          onChange={(e) => onUpdateStatus(booking.id, e.target.value as BookingStatus)}
          className="border-none bg-transparent font-medium text-sm focus:ring-0 cursor-pointer"
        >
          {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-6 py-4">
        {balance > 0 ? <span className="text-red-600 font-bold">₹{balance.toLocaleString()}</span> : <span className="text-green-600 font-bold">Paid</span>}
      </td>
      <td className="px-6 py-4 flex items-center gap-2">
        {balance > 0 ? (
          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-md shadow-sm transition-colors cursor-default"
            title="Payment actions disabled temporarily"
          >
            <CreditCard size={14} />
            Pay ₹{balance.toLocaleString()}
          </button>
        ) : (
          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-md transition-colors cursor-default"
            title="Payment actions disabled temporarily"
          >
            <CheckCircle size={14} />
            Paid
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onEditBooking(booking); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Edit Booking"><Pencil size={18} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDeleteBooking(booking.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Delete Booking"><Trash2 size={18} /></button>
      </td>
    </tr>
  );
};

export default BookingRow;
