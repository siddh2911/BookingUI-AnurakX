import React from 'react';
import { Room, Booking, BookingStatus } from '../../types';
import { Phone, CheckCircle } from 'lucide-react';

interface UpcomingArrivalsProps {
  arrivals: Booking[];
  rooms: Room[];
  onEditBooking: (booking: Booking) => void;
  today: string;
}

const UpcomingArrivals: React.FC<UpcomingArrivalsProps> = ({ arrivals, rooms, onEditBooking, today }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">Upcoming Arrivals</h3>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Next 7 Days</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Arrival</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {arrivals.map(booking => {
                  const room = rooms.find(r => r.id === booking.roomId);
                                    // const paid = (booking.payments || []).reduce((sum, p) => sum + p.amount, 0); // Not available from /allBooking
                                    const displayPending = booking.pendingBalance || 0; // Use pendingBalance from API directly
                                    // const pending = booking.totalAmount - paid; // Not available from /allBooking
                                    const isToday = booking.checkInDate === today; // This line was inadvertently removed
                                    
                                    return (
                                      <tr key={booking.id} 
                                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                                          onClick={() => onEditBooking(booking, true)}
                                          title="Click to view booking"
                                      ><td className="px-4 py-3 font-medium text-slate-900">{booking.guestName}</td><td className="px-4 py-3 text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <Phone size={14} className="text-slate-400"/> {booking.guestPhone || 'N/A'}
                                            </div>
                                          </td><td className="px-4 py-3">
                                            <span className="font-bold text-slate-700">{room?.number}</span>
                                            <span className="text-xs text-slate-500 block">{room?.type}</span>
                                          </td><td className="px-4 py-3">
                                            <div>{new Date(booking.checkInDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                                            {isToday ? 
                                                <span className="text-green-600 font-bold text-xs">Today</span> :
                                                <span className="text-slate-400 text-xs">in {Math.ceil((new Date(booking.checkInDate).getTime() - new Date().setHours(0,0,0,0))/(1000*60*60*24))} days</span>
                                            }
                                          </td><td className="px-4 py-3">
                                            {displayPending > 0 ? (
                                                <div className="text-red-600 font-medium">
                                                  Pending ₹{displayPending.toLocaleString()}
                                                </div>
                                            ) : (
                                                <div className="text-green-600 font-medium flex items-center gap-1">
                                                  <CheckCircle size={14}/> Paid
                                                </div>
                                            )}
                                            {/* Total amount is not available from /allBooking API, so removed or shown as balance */}
                                            {displayPending > 0 && (
                                              <div className="text-xs text-slate-400">Balance: ₹{displayPending.toLocaleString()}</div>
                                            )}
                                          </td><td className="px-4 py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Confirmed</span>
                        </td>
                    </tr>
                  )
              })}
            </tbody>
        </table>
        {arrivals.length === 0 && (
            <div className="p-8 text-center text-slate-500">No upcoming arrivals in the next 7 days.</div>
        )}
      </div>
    </div>
  );
};

export default UpcomingArrivals;
