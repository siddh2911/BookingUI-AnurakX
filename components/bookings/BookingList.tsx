import React from 'react';
import { Booking, Room, BookingStatus } from '../../types';
import BookingRow from './BookingRow';
import { Plus, X, Search, Filter, ArrowUp, ArrowDown } from 'lucide-react';

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
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof Booking | 'roomNumber' | 'balance'; direction: 'asc' | 'desc' } | null>({ key: 'checkInDate', direction: 'desc' });

  const filteredAndSortedBookings = React.useMemo(() => {
    let result = [...bookings];

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Booking];
        let bValue: any = b[sortConfig.key as keyof Booking];

        if (sortConfig.key === 'roomNumber') {
          aValue = rooms.find(r => r.id === a.roomId)?.number || '';
          bValue = rooms.find(r => r.id === b.roomId)?.number || '';
        } else if (sortConfig.key === 'balance') {
          aValue = a.pendingBalance || 0;
          bValue = b.pendingBalance || 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;

        
        return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
      });
    }

    return result;
  }, [bookings, sortConfig, rooms]);

  const requestSort = (key: any) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <div className="w-3 h-3" />; 
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Bookings</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">

          <button
            onClick={() => onOpenNewBooking()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition justify-center shrink-0"
          >
            <Plus size={20} /> <span className="hidden sm:inline">New Booking</span> <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {bookingFilter && (
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg flex items-center justify-between text-sm">
          <span>Showing results for: <strong>{bookingFilter.label}</strong></span>
          <button onClick={() => setBookingFilter(null)} className="hover:text-blue-900"><X size={16} /></button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b">
              <tr>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('id')}>
                  <div className="flex items-center gap-1">ID <SortIcon column="id" /></div>
                </th>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('guestName')}>
                  <div className="flex items-center gap-1">Guest <SortIcon column="guestName" /></div>
                </th>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('roomNumber')}>
                  <div className="flex items-center gap-1">Room <SortIcon column="roomNumber" /></div>
                </th>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('checkInDate')}>
                  <div className="flex items-center gap-1">Check In <SortIcon column="checkInDate" /></div>
                </th>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('checkOutDate')}>
                  <div className="flex items-center gap-1">Check Out <SortIcon column="checkOutDate" /></div>
                </th>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('status')}>
                  <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                </th>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('balance')}>
                  <div className="flex items-center gap-1">Balance <SortIcon column="balance" /></div>
                </th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="text-slate-300" />
                      <p>No bookings found matching your search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedBookings.map(booking => (
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
      <div className="text-xs text-slate-400 text-right px-2">
        Showing {filteredAndSortedBookings.length} of {bookings.length} bookings
      </div>
    </div>
  );
};

export default BookingList;
