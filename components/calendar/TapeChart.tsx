import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search } from 'lucide-react';
import { Room, Booking, RoomStatus } from '../../types';

interface TapeChartProps {
    rooms: Room[];
    bookings: Booking[];
    onBookingClick?: (booking: Booking) => void;
}

export default function TapeChart({ rooms, bookings, onBookingClick }: TapeChartProps) {
    const [startDate, setStartDate] = useState(new Date());
    const [daysToShow, setDaysToShow] = useState(14);

    // Normalize start date to beginning of day
    useEffect(() => {
        const d = new Date(startDate);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() !== startDate.getTime()) {
            setStartDate(d);
        }
    }, [startDate]);

    const dates = useMemo(() => {
        return Array.from({ length: daysToShow }, (_, i) => {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [startDate, daysToShow]);

    const handlePrev = () => {
        const newDate = new Date(startDate);
        newDate.setDate(newDate.getDate() - 7);
        setStartDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(startDate);
        newDate.setDate(newDate.getDate() + 7);
        setStartDate(newDate);
    };

    const getBookingStyle = (booking: Booking, roomIndex: number) => {
        const checkIn = new Date(booking.checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(booking.checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        const chartStart = new Date(dates[0]);
        const chartEnd = new Date(dates[dates.length - 1]);

        // If booking is outside current view
        if (checkOut <= chartStart || checkIn > chartEnd) return null;

        const visibleStart = checkIn < chartStart ? chartStart : checkIn;
        const visibleEnd = checkOut > chartEnd ? new Date(chartEnd.getTime() + 86400000) : checkOut; // Add 1 day to end for inclusive rendering

        const duration = (visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60 * 60 * 24);
        const offset = (visibleStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24);

        return {
            left: `${(offset / daysToShow) * 100}%`,
            width: `${(duration / daysToShow) * 100}%`,
        };
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-140px)]">
            {/* Controls */}
            {/* Controls */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <button onClick={handlePrev} className="p-1.5 hover:bg-white rounded-md transition duration-200 hover:shadow-sm text-slate-600">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setStartDate(new Date())} className="px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-white rounded-md transition duration-200 whitespace-nowrap">
                            Today
                        </button>
                        <button onClick={handleNext} className="p-1.5 hover:bg-white rounded-md transition duration-200 hover:shadow-sm text-slate-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarIcon size={18} className="text-slate-400" />
                        <span className="font-bold text-slate-700 text-sm md:text-lg whitespace-nowrap">
                            {startDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                    <div className="flex items-center gap-2 text-[10px] md:text-xs font-medium text-slate-500 mr-4 whitespace-nowrap">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 md:w-3 md:h-3 bg-blue-500 rounded-sm"></div> Confirmed</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-sm"></div> In</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 md:w-3 md:h-3 bg-slate-400 rounded-sm"></div> Out</span>
                    </div>
                    <div className="relative hidden md:block">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 w-32 md:w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto relative custom-scrollbar bg-slate-50/50">
                <div className="min-w-[800px] md:min-w-[1200px]">
                    {/* Header Row */}
                    <div className="flex sticky top-0 z-20 bg-white shadow-sm border-b border-slate-200">
                        <div className="w-20 md:w-48 flex-shrink-0 p-2 md:p-4 font-bold text-slate-700 border-r border-slate-200 bg-slate-50 flex items-center justify-center md:justify-start sticky left-0 z-30 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                            <span className="hidden md:inline">Room</span>
                            <span className="md:hidden">Rm</span>
                        </div>
                        <div className="flex-1 flex">
                            {dates.map(date => (
                                <div
                                    key={date.toISOString()}
                                    className={`flex-shrink-0 p-2 text-center border-r border-slate-100 ${isToday(date) ? 'bg-blue-50' : ''}`}
                                    style={{ width: `${100 / daysToShow}%` }}
                                >
                                    <div className={`text-[10px] md:text-xs uppercase font-bold mb-1 ${isToday(date) ? 'text-blue-600' : 'text-slate-400'}`}>
                                        {date.toLocaleDateString(undefined, { weekday: 'short' }).charAt(0)}
                                    </div>
                                    <div className={`text-sm md:text-lg font-bold w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full mx-auto ${isToday(date) ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700'}`}>
                                        {date.getDate()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Room Rows */}
                    {rooms.map(room => (
                        <div key={room.id} className="flex border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors h-20 group">
                            <div className="w-20 md:w-48 flex-shrink-0 p-2 md:p-3 border-r border-slate-200 flex flex-col justify-center sticky left-0 z-10 bg-white group-hover:bg-slate-50 text-center md:text-left shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                                <div className="flex flex-col md:flex-row items-center md:justify-between">
                                    <span className="font-bold text-slate-800 text-sm md:text-lg">{room.number}</span>
                                    <span className={`text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded font-bold uppercase hidden md:inline-block ${room.status === RoomStatus.AVAILABLE ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {room.status}
                                    </span>
                                </div>
                                <span className="text-[10px] md:text-xs text-slate-400 hidden md:block">{room.type}</span>
                            </div>

                            <div className="flex-1 relative">
                                {/* Grid Lines */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                    {dates.map(date => (
                                        <div
                                            key={date.toISOString()}
                                            className={`flex-shrink-0 border-r border-slate-100 ${isToday(date) ? 'bg-blue-50/30' : ''}`}
                                            style={{ width: `${100 / daysToShow}%` }}
                                        ></div>
                                    ))}
                                </div>

                                {/* Bookings */}
                                {bookings.filter(b => b.roomId === room.id).map(booking => {
                                    const style = getBookingStyle(booking, room.id);
                                    if (!style) return null;

                                    return (
                                        <div
                                            key={booking.id}
                                            className="absolute top-2 bottom-2 rounded-lg shadow-sm border border-white/20 text-white px-2 py-1 text-xs overflow-hidden cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all z-10"
                                            style={{
                                                ...style,
                                                backgroundColor: booking.status === 'Confirmed' ? '#3b82f6' :
                                                    booking.status === 'Checked In' ? '#22c55e' : '#94a3b8'
                                            }}
                                            onClick={() => onBookingClick && onBookingClick(booking)}
                                            title={`${booking.guestName} (${booking.checkInDate} - ${booking.checkOutDate})`}
                                        >
                                            <div className="font-bold truncate">{booking.guestName}</div>
                                            <div className="truncate opacity-80 text-[10px]">
                                                {booking.source === 'Booking.com' ? 'Booking.com' : booking.source === 'Airbnb' ? 'Airbnb' : 'Direct'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
