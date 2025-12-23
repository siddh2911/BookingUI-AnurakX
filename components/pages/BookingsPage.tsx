import React from 'react';
import BookingList from '../bookings/BookingList';

export default function BookingsPage({ bookingProps }: { bookingProps: any }) {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Bookings</h1>
                    <p className="text-slate-500">Manage reservations and check-ins.</p>
                </div>
            </div>
            <BookingList {...bookingProps} />
        </div>
    );
}
