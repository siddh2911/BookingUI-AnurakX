import React from 'react';
import { Room, Booking } from '../../types';
import { Phone, CheckCircle, Clock, CreditCard, ChevronRight } from 'lucide-react';

interface UpcomingArrivalsProps {
  arrivals: Booking[];
  rooms: Room[];
  onEditBooking: (booking: Booking, isViewOnly?: boolean) => void;
  today: string;
}

const UpcomingArrivals: React.FC<UpcomingArrivalsProps> = ({ arrivals, rooms, onEditBooking, today }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Upcoming Arrivals</h3>
          <p className="text-xs text-slate-400 mt-1">Guests arriving in the next 7 days</p>
        </div>
        <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 font-medium tracking-wide">
          Next 7 Days
        </span>
      </div>

      {/* Mobile View (Cards) */}
      <div className="md:hidden space-y-3">
        {arrivals.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-4">No upcoming arrivals</p>
        ) : (
          arrivals.map(booking => {
            const room = rooms.find(r => r.id === booking.roomId);
            const displayPending = booking.pendingBalance || 0;
            const checkIn = new Date(booking.checkInDate);

            return (
              <div key={booking.id}
                onClick={() => onEditBooking(booking, true)}
                className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4 relative"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 shrink-0">
                  {booking.guestName.substring(0, 2).toUpperCase()}
                </div>

                {/* Middle: Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{booking.guestName}</h4>
                    <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded text-[10px] border border-slate-100 shrink-0">
                      R{room?.number}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={10} /> {checkIn.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span className="flex items-center gap-1"><Phone size={10} /> {booking.guestPhone || '...'}</span>
                  </div>
                </div>

                {/* Right: Payment & Action (Centered) */}
                <div className="shrink-0 flex flex-col items-center justify-center gap-2 pl-3 border-l border-slate-50 min-w-[70px]">
                  {displayPending > 0 ? (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-red-500 font-bold text-[10px]">Pending</span>
                      <span className="text-red-600 font-bold text-xs">₹{displayPending}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-[10px] font-bold text-green-600">Paid</span>
                    </div>
                  )}
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left border-separate border-spacing-y-2">
          <thead className="text-slate-400 uppercase text-xs tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-2">Guest</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Room</th>
              <th className="px-4 py-2">Arrival</th>
              <th className="px-4 py-2 text-center">Payment</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {arrivals.map(booking => {
              const room = rooms.find(r => r.id === booking.roomId);
              const displayPending = booking.pendingBalance || 0;
              // Handle potential date format mismatches safely
              const checkIn = new Date(booking.checkInDate);
              const isToday = booking.checkInDate === today;

              return (
                <tr key={booking.id}
                  className="group hover:bg-slate-50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md bg-white border border-slate-100 rounded-xl"
                  onClick={() => onEditBooking(booking, true)}
                >
                  <td className="px-4 py-4 first:rounded-l-xl border-y border-l border-slate-50 group-hover:border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {booking.guestName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{booking.guestName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-y border-slate-50 group-hover:border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone size={14} className="text-slate-300" />
                      <span className="text-xs">{booking.guestPhone || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-y border-slate-50 group-hover:border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">{room?.number}</span>
                      <span className="text-xs text-slate-400">{room?.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-y border-slate-50 group-hover:border-slate-100">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">
                        {checkIn.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      {isToday ?
                        <span className="text-green-600 font-bold text-[10px] uppercase tracking-wide">Today</span> :
                        <span className="text-slate-400 text-[10px]">in {Math.ceil((checkIn.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))} days</span>
                      }
                    </div>
                  </td>
                  <td className="px-4 py-4 border-y border-slate-50 group-hover:border-slate-100 text-center">
                    {displayPending > 0 ? (
                      <div className="text-red-500 font-medium text-xs flex items-center justify-center gap-1 bg-red-50 px-2 py-1 rounded w-fit mx-auto">
                        <CreditCard size={12} /> Pending ₹{displayPending.toLocaleString()}
                      </div>
                    ) : (
                      <div className="text-green-600 font-medium text-xs flex items-center justify-center gap-1 bg-green-50 px-2 py-1 rounded w-fit mx-auto">
                        <CheckCircle size={12} /> Paid
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 last:rounded-r-xl border-y border-r border-slate-50 group-hover:border-slate-100 text-center">
                    <button className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {arrivals.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
            <Clock size={32} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">No upcoming arrivals</p>
            <p className="text-xs opacity-70">Check back later or add a new booking</p>
          </div>
        )}
      </div>
    </div >
  );
};

export default UpcomingArrivals;
