import React from 'react';
import TapeChart from '../calendar/TapeChart';
import { Room, Booking } from '../../types';

interface CalendarPageProps {
    calendarProps: {
        rooms: Room[];
        bookings: Booking[];
        onEditBooking: (booking: Booking, isViewOnly?: boolean) => void;
        isAdmin?: boolean;
    }
}

export default function CalendarPage({ calendarProps }: CalendarPageProps) {
    const { rooms, bookings, onEditBooking, isAdmin = true } = calendarProps;

    return (
        <div className="h-full flex flex-col p-6 animate-in fade-in duration-500">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: '"Playfair Display", serif' }}>Calendar</h1>
                    <p className="text-slate-500 mt-1">Manage bookings timeline.</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => {  }}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
                    >
                        + New Booking
                    </button>
                )}
            </div>

            <TapeChart
                rooms={rooms}
                bookings={bookings}
                onBookingClick={(booking) => onEditBooking(booking, true)}
            />
        </div>
    );
}
