import React from 'react';
import { Booking, Room, BookingStatus } from '../../types';
import BookingRow from './BookingRow';
import { Plus, X } from 'lucide-react';

interface BookingListProps {
  bookings: Booking[];
  rooms: Room[];
  bookingFilter: { label?: string } | null;
  setBookingFilter: (filter: any) => void;
  onOpenNewBooking: () => void;
  onUpdateStatus: (bookingId: string, status: BookingStatus) => void;
  onEditBooking: (booking: Booking) => void;
  onAddPayment: (booking: Booking) => void;
  onDeleteBooking: (bookingId: string) => void;
}

const BookingList: React.FC<BookingListProps> = ({
  bookings,
  rooms,
  bookingFilter,
  setBookingFilter,
  onOpenNewBooking,
  onUpdateStatus,
  onEditBooking,
  onAddPayment,
  onDeleteBooking
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-slate-800">Bookings</h2>
         <div className="flex gap-2">
           {bookingFilter && (
             <button 
               onClick={() => setBookingFilter(null)}
               className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition"
             >
               <X size={16} /> Clear: {bookingFilter.label || 'Filter'}
             </button>
           )}
           <button 
             onClick={() => onOpenNewBooking()}
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
           >
             <Plus size={20} /> New Booking
           </button>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Guest</th>
                <th className="px-6 py-3">Room</th>
                <th className="px-6 py-3">Check In</th>
                <th className="px-6 py-3">Check Out</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Balance</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.length === 0 ? (
                 <tr>
                     <td colSpan={8} className="text-center py-8 text-slate-500">No bookings found matching filters.</td>
                 </tr>
              ) : (
                bookings.map(booking => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    room={rooms.find(r => r.id === booking.roomId)}
                    onUpdateStatus={onUpdateStatus}
                    onEditBooking={onEditBooking}
                    onAddPayment={onAddPayment}
                    onDeleteBooking={onDeleteBooking}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BookingList;
