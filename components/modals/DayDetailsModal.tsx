import React from 'react';
import Modal from '../ui/Modal';
import { Room, Booking, BookingStatus } from '../../types';
import { User, Calendar, CheckCircle, Plus, X } from 'lucide-react';

interface DayDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    rooms: Room[];
    bookings: Booking[];
    onEditBooking: (booking: Booking, isViewOnly?: boolean) => void;
    onNewBooking: (date: Date, roomId?: number) => void;
}

const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
    isOpen,
    onClose,
    date,
    rooms,
    bookings,
    onEditBooking,
    onNewBooking
}) => {
    if (!date) return null;

    const sortedRooms = [...rooms].sort((a, b) =>
        String(a.number).localeCompare(String(b.number), undefined, { numeric: true })
    );

    const getBookingForRoom = (roomId: number) => {
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        return bookings.find(b => {
            // Exclude cancelled/checked-out if necessary, or show them differently? 
            // Usually "who is available" means active bookings.
            if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.CHECKED_OUT) return false;

            const start = new Date(b.checkInDate); start.setHours(0, 0, 0, 0);
            const end = new Date(b.checkOutDate); end.setHours(0, 0, 0, 0);

            // Booking covers this date: start <= date < end
            // Note: Standard hotel logic usually means they stay the NIGHT of 'date'.
            return String(b.roomId) === String(roomId) && checkDate >= start && checkDate < end;
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Occupancy: ${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {sortedRooms.map(room => {
                    const booking = getBookingForRoom(room.id);
                    const isAvailable = !booking;

                    return (
                        <div key={room.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${isAvailable ? 'bg-white border-slate-100' : 'bg-blue-50/50 border-blue-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${isAvailable ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                                    {room.number}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">
                                        {booking ? booking.guestName : `${room.type} Room`}
                                    </h4>
                                    <p className="text-sm text-slate-500">
                                        {booking ? (
                                            <span className="flex items-center gap-1">
                                                <User size={12} /> Pending Check-out: {new Date(booking.checkOutDate).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span className="text-green-600 font-medium flex items-center gap-1">
                                                <CheckCircle size={12} /> Available
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div>
                                {isAvailable ? (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            onNewBooking(date, room.id);
                                        }}
                                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Book this room"
                                    >
                                        <Plus size={20} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            if (booking) onEditBooking(booking, true);
                                        }}
                                        className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors"
                                    >
                                        View
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                <button onClick={onClose} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition">
                    Close
                </button>
            </div>
        </Modal>
    );
};

export default DayDetailsModal;
