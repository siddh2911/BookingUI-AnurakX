import React from 'react';
import { Booking, Room, BookingStatus } from '../../types';
import BookingRow from './BookingRow';
import BookingMobileCard from './BookingMobileCard';
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
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof Booking | 'roomNumber' | 'balance'; direction: 'asc' | 'desc' } | null>({ key: 'checkInDate', direction: 'asc' });
  const [activeTab, setActiveTab] = React.useState<'upcoming' | 'past'>('upcoming');

  // Automatically switch sort order based on Tab context
  // Upcoming: Show closest dates first (ASC)
  // Past: Show most recent history first (DESC)
  React.useEffect(() => {
    setSortConfig({
      key: 'checkInDate',
      direction: activeTab === 'upcoming' ? 'asc' : 'desc'
    });
  }, [activeTab]);

  const filteredAndSortedBookings = React.useMemo(() => {
    // 1. Initial Filter by Search/Label
    let result = [...bookings];

    // 2. Filter by Tab (Upcoming vs Past)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    result = result.filter(booking => {
      const checkOut = new Date(booking.checkOutDate);
      checkOut.setHours(0, 0, 0, 0);

      if (activeTab === 'upcoming') {
        // Show if checkout is today or in future
        return checkOut >= today;
      } else {
        // Show if checkout was strictly in past
        return checkOut < today;
      }
    });

    // 3. Sort
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
  }, [bookings, sortConfig, rooms, activeTab]);

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
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bookings</h2>
          <p className="text-slate-500 text-sm hidden md:block">Manage reservations and guests</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          {/* Tabs - Integrated into Header */}
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'upcoming'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'past'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
            >
              Past
            </button>
          </div>

          {/* New Booking Button */}
          <button
            onClick={() => onOpenNewBooking()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition justify-center shrink-0 shadow-sm hover:shadow-md active:scale-95 w-full sm:w-auto"
          >
            <Plus size={18} /> <span className="font-semibold">New Booking</span>
          </button>
        </div>
      </div>

      {/* Mobile Sort Control */}
      <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Sort by:</span>
        {[
          { key: 'checkInDate', label: 'Date' },
          { key: 'guestName', label: 'Guest' },
          { key: 'status', label: 'Status' },
          { key: 'balance', label: 'Balance' }
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => requestSort(opt.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${sortConfig?.key === opt.key
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            {opt.label}
            {sortConfig?.key === opt.key && (
              sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
            )}
          </button>
        ))}
      </div>

      {bookingFilter && (
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg flex items-center justify-between text-sm">
          <span>Showing results for: <strong>{bookingFilter.label}</strong></span>
          <button onClick={() => setBookingFilter(null)} className="hover:text-blue-900"><X size={16} /></button>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white/70 backdrop-blur-xl rounded-xl shadow-sm border border-white/20 overflow-hidden transition-colors duration-1000">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 border-b border-white/10 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10 transition-colors duration-1000">
              <tr>
                <th className="px-2 py-3 cursor-pointer hover:bg-white/10" onClick={() => requestSort('id')}>
                  <div className="flex items-center gap-1">ID <SortIcon column="id" /></div>
                </th>
                <th className="px-2 py-3 cursor-pointer hover:bg-white/10" onClick={() => requestSort('guestName')}>
                  <div className="flex items-center gap-1">Guest <SortIcon column="guestName" /></div>
                </th>
                <th className="px-2 py-3 cursor-pointer hover:bg-white/10" onClick={() => requestSort('roomNumber')}>
                  <div className="flex items-center gap-1">Room <SortIcon column="roomNumber" /></div>
                </th>
                <th className="px-2 py-3 cursor-pointer hover:bg-white/10" onClick={() => requestSort('checkInDate')}>
                  <div className="flex items-center gap-1">Check In <SortIcon column="checkInDate" /></div>
                </th>
                <th className="px-2 py-3 cursor-pointer hover:bg-white/10" onClick={() => requestSort('checkOutDate')}>
                  <div className="flex items-center gap-1">Check Out <SortIcon column="checkOutDate" /></div>
                </th>

                <th className="px-2 py-3 cursor-pointer hover:bg-white/10" onClick={() => requestSort('status')}>
                  <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                </th>
                <th className="px-2 py-3 cursor-pointer hover:bg-white/10" onClick={() => requestSort('balance')}>
                  <div className="flex items-center gap-1">Balance <SortIcon column="balance" /></div>
                </th>
                <th className="px-2 pr-16 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAndSortedBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="text-slate-300" />
                      <p>No {activeTab} bookings found.</p>
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredAndSortedBookings.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <div className="flex flex-col items-center gap-2">
              <Search size={32} className="text-slate-300" />
              <p>No {activeTab} bookings found.</p>
            </div>
          </div>
        ) : (
          filteredAndSortedBookings.map(booking => (
            <BookingMobileCard
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
      </div>
      <div className="text-xs text-slate-400 text-right px-2">
        Showing {filteredAndSortedBookings.length} {activeTab} bookings
      </div>
    </div>
  );
};

export default BookingList;
