import React from 'react';
import BookingList from '../bookings/BookingList';

export default function BookingsPage({ bookingProps }: { bookingProps: any }) {
    return (
        <div className="animate-in fade-in duration-500">
            <BookingList {...bookingProps} />
        </div>
    );
}
