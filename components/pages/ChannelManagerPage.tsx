import React, { useState } from 'react';
import { Room, Booking, BookingSource } from '../../types';
import { generateICal, parseICal } from '../../services/iCalUtils';
import { Download, RefreshCw, Link, Check, AlertCircle } from 'lucide-react';

interface ChannelManagerPageProps {
    rooms: Room[];
    bookings: Booking[];
    onSyncExternalBookings: (newBookings: Booking[]) => void;
}

const ChannelManagerPage: React.FC<ChannelManagerPageProps> = ({ rooms, bookings, onSyncExternalBookings }) => {
    const [selectedRoomId, setSelectedRoomId] = useState<number>(rooms[0]?.id || 0);
    const [importUrl, setImportUrl] = useState('');
    const [importSource, setImportSource] = useState<BookingSource>(BookingSource.AIRBNB);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    const selectedRoom = rooms.find(r => r.id === selectedRoomId);

    const handleDownloadICal = () => {
        if (!selectedRoom) return;
        const roomBookings = bookings.filter(b => b.roomId === selectedRoom.id);
        const icalContent = generateICal(roomBookings, `Room ${selectedRoom.number}`);

        // Trigger download
        const element = document.createElement("a");
        const file = new Blob([icalContent], { type: 'text/calendar' });
        element.href = URL.createObjectURL(file);
        element.download = `karuna_villa_room_${selectedRoom.number}.ics`;
        document.body.appendChild(element);
        element.click();
    };

    const handleSync = async () => {
        setSyncStatus('syncing');

        // SIMULATION: In a real app, we would fetch(importUrl) here.
        // Due to CORS, we simulate a successful fetch from Airbnb/Booking.com
        // by generating a dummy iCal string with a future booking.

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            // Create a mock booking for 5 days from now
            const mockStartDate = new Date();
            mockStartDate.setDate(mockStartDate.getDate() + 5);
            const mockEndDate = new Date(mockStartDate);
            mockEndDate.setDate(mockEndDate.getDate() + 3);

            const year = mockStartDate.getFullYear();
            const month = String(mockStartDate.getMonth() + 1).padStart(2, '0');
            const day = String(mockStartDate.getDate()).padStart(2, '0');
            const startString = `${year}${month}${day}`;

            const endYear = mockEndDate.getFullYear();
            const endMonth = String(mockEndDate.getMonth() + 1).padStart(2, '0');
            const endDay = String(mockEndDate.getDate()).padStart(2, '0');
            const endString = `${endYear}${endMonth}${endDay}`;

            const mockICalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//${importSource}//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${Date.now()}@${importSource.toLowerCase()}.com
DTSTAMP:20240101T000000Z
DTSTART;VALUE=DATE:${startString}
DTEND;VALUE=DATE:${endString}
SUMMARY:${importSource} Guest (Synced)
DESCRIPTION:Imported from ${importSource}
END:VEVENT
END:VCALENDAR`;

            const parsedBookings = parseICal(mockICalContent, importSource);

            // Assign to the selected room for this demo
            const bookingsWithRoom = parsedBookings.map(b => ({
                ...b,
                roomId: selectedRoomId,
                roomName: selectedRoom?.name || 'Unknown Room'
            }));

            onSyncExternalBookings(bookingsWithRoom);

            setSyncStatus('success');
            setLastSyncTime(new Date().toLocaleTimeString());
        } catch (error) {
            console.error("Sync failed:", error);
            setSyncStatus('error');
        }
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Channel Manager</h1>
                <p className="text-slate-500">Sync your calendar with Airbnb, Booking.com, and more.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

                {/* EXPORT SECTION */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6 text-blue-600">
                        <Download size={24} />
                        <h2 className="text-xl font-bold text-slate-800">Export Calendar</h2>
                    </div>
                    <p className="text-slate-600 mb-6 text-sm min-h-[40px]">
                        Share this iCal link with OTAs (Airbnb, Vrbo) to prevent double bookings.
                        They will pull your availability from here.
                    </p>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Select Room</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedRoomId}
                                onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                            >
                                {rooms.map(room => (
                                    <option key={room.id} value={room.id}>{room.number} - {room.type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 break-all text-xs font-mono text-slate-600">
                            https://karunavilla.com/api/ical/{selectedRoomId}/calendar.ics
                        </div>
                    </div>

                    <div className="mt-auto pt-4">
                        <div className="min-h-[24px] mb-2"></div>
                        <button
                            onClick={handleDownloadICal}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
                        >
                            <Download size={16} /> Download .ics File
                        </button>
                    </div>
                </div>

                {/* IMPORT SECTION */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6 text-green-600">
                        <RefreshCw size={24} />
                        <h2 className="text-xl font-bold text-slate-800">Import Calendar</h2>
                    </div>
                    <p className="text-slate-600 mb-6 text-sm min-h-[40px]">
                        Paste the iCal export link from Airbnb/Booking.com. We will periodically fetch it to block dates here.
                    </p>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Channel Source</label>
                            <div className="flex gap-2">
                                {[BookingSource.AIRBNB, BookingSource.BOOKING_COM, BookingSource.EXPEDIA].map(src => (
                                    <button
                                        key={src}
                                        onClick={() => setImportSource(src)}
                                        className={`px-3 py-2 text-xs rounded-lg border transition-colors ${importSource === src ? 'bg-green-50 border-green-500 text-green-700 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        {src}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">iCal URL</label>
                            <input
                                type="text"
                                placeholder="https://www.airbnb.com/calendar/ical/..."
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                value={importUrl}
                                onChange={(e) => setImportUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-auto pt-4">
                        <div className="min-h-[24px] mb-2 flex flex-col justify-end">
                            {syncStatus === 'success' ? (
                                <div className="flex items-center gap-2 text-green-700 text-xs">
                                    <Check size={14} /> Synced: {lastSyncTime}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 flex items-start gap-1">
                                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                                    <span>Backend sync required.</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSync}
                            disabled={syncStatus === 'syncing'}
                            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {syncStatus === 'syncing' ? <RefreshCw className="animate-spin" size={16} /> : <Link size={16} />}
                            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChannelManagerPage;
