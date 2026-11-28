import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Save, Play, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../../constants/api';
import { csrfHeaders } from '../../services/csrf';

interface RoomScheduleItem {
    id: number;
    roomNumber: string;
    roomName?: string;
    type?: string;
    status?: string;
    defaultCheckInTime: string;
    defaultCheckOutTime: string;
    autoLifecycleEnabled: boolean;
}

const AutoSchedulePanel: React.FC = () => {
    const [schedules, setSchedules] = useState<RoomScheduleItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [savingRoom, setSavingRoom] = useState<string | null>(null);
    const [isRunningNow, setIsRunningNow] = useState(false);

    // Bulk apply bar state
    const [bulkCheckIn, setBulkCheckIn] = useState('14:00');
    const [bulkCheckOut, setBulkCheckOut] = useState('11:00');
    const [bulkEnabled, setBulkEnabled] = useState(true);
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    const fetchSchedules = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/auto-schedule`, { credentials: 'include' });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || `Failed to load room schedules (${res.status})`);
            }
            const data: RoomScheduleItem[] = await res.json();
            setSchedules(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err?.message || 'Unable to load auto check-in/out schedules.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchedules();
    }, [fetchSchedules]);

    const handleFieldChange = (roomNumber: string, field: keyof RoomScheduleItem, value: any) => {
        setSchedules(prev =>
            prev.map(item => (item.roomNumber === roomNumber ? { ...item, [field]: value } : item))
        );
    };

    const handleSaveRoom = async (item: RoomScheduleItem) => {
        setSavingRoom(item.roomNumber);
        setError(null);
        setFeedback(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${encodeURIComponent(item.roomNumber)}/auto-schedule`, {
                method: 'PUT',
                headers: csrfHeaders({ 'Content-Type': 'application/json' }),
                credentials: 'include',
                body: JSON.stringify({
                    checkInTime: item.defaultCheckInTime,
                    checkOutTime: item.defaultCheckOutTime,
                    autoLifecycleEnabled: item.autoLifecycleEnabled,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || `Failed to save Room ${item.roomNumber} schedule`);
            }
            const updated: RoomScheduleItem = await res.json();
            setSchedules(prev => prev.map(r => (r.roomNumber === updated.roomNumber ? updated : r)));
            setFeedback(`Saved Room ${item.roomNumber}: Auto Check-In at ${updated.defaultCheckInTime}, Check-Out at ${updated.defaultCheckOutTime}.`);
        } catch (err: any) {
            setError(err?.message || 'Failed to save schedule.');
        } finally {
            setSavingRoom(null);
        }
    };

    const handleApplyToAll = async () => {
        setIsBulkSaving(true);
        setError(null);
        setFeedback(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/auto-schedule/all`, {
                method: 'PUT',
                headers: csrfHeaders({ 'Content-Type': 'application/json' }),
                credentials: 'include',
                body: JSON.stringify({
                    checkInTime: bulkCheckIn,
                    checkOutTime: bulkCheckOut,
                    autoLifecycleEnabled: bulkEnabled,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || 'Failed to update all rooms');
            }
            const updated: RoomScheduleItem[] = await res.json();
            setSchedules(updated);
            setFeedback(`Applied ${bulkCheckIn} check-in / ${bulkCheckOut} check-out to all ${updated.length} rooms.`);
        } catch (err: any) {
            setError(err?.message || 'Failed to apply schedule to all rooms.');
        } finally {
            setIsBulkSaving(false);
        }
    };

    const handleRunNow = async () => {
        setIsRunningNow(true);
        setError(null);
        setFeedback(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/auto-schedule/run-now`, {
                method: 'POST',
                headers: csrfHeaders({ 'Content-Type': 'application/json' }),
                credentials: 'include',
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || 'Failed to trigger auto check-in/out');
            }
            const summary = await res.json();
            setFeedback(
                `Auto-lifecycle run complete: ${summary.checkedInCount ?? 0} checked in, ${summary.checkedOutCount ?? 0} checked out.`
            );
        } catch (err: any) {
            setError(err?.message || 'Failed to run automated check-in/out.');
        } finally {
            setIsRunningNow(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header + Bulk Apply Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            Automated Check-In &amp; Check-Out Schedule
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Bookings automatically transition to <strong>Checked In</strong> at each room&apos;s check-in time and <strong>Checked Out</strong> (marking the room Dirty &amp; Available) at check-out time. Runs automatically every minute in Asia/Kolkata time.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRunNow}
                        disabled={isRunningNow}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition disabled:opacity-60 shrink-0"
                    >
                        <Play size={14} />
                        {isRunningNow ? 'Running...' : 'Run Auto Check-In/Out Now'}
                    </button>
                </div>

                {/* Apply to All Rooms */}
                <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-slate-100">
                    <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">All Rooms Check-In</label>
                        <input
                            type="time"
                            value={bulkCheckIn}
                            onChange={e => setBulkCheckIn(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 bg-slate-50"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">All Rooms Check-Out</label>
                        <input
                            type="time"
                            value={bulkCheckOut}
                            onChange={e => setBulkCheckOut(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 bg-slate-50"
                        />
                    </div>
                    <label className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={bulkEnabled}
                            onChange={e => setBulkEnabled(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600"
                        />
                        Auto-Enabled
                    </label>
                    <button
                        type="button"
                        onClick={handleApplyToAll}
                        disabled={isBulkSaving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-60"
                    >
                        <Sparkles size={14} />
                        {isBulkSaving ? 'Applying...' : 'Apply to All Rooms'}
                    </button>
                </div>

                {feedback && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 size={15} />
                        <span>{feedback}</span>
                    </div>
                )}
                {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle size={15} />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Per-Room Table */}
            {isLoading ? (
                <div className="p-8 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
                    Loading room schedules...
                </div>
            ) : schedules.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    No rooms found for this hotel.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schedules.map(room => (
                        <div key={room.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-slate-900">Room {room.roomNumber}</h4>
                                    <p className="text-xs text-slate-500">{room.roomName || room.type || 'Room'}</p>
                                </div>
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={room.autoLifecycleEnabled}
                                        onChange={e => handleFieldChange(room.roomNumber, 'autoLifecycleEnabled', e.target.checked)}
                                        className="rounded border-slate-300 text-blue-600"
                                    />
                                    <span>{room.autoLifecycleEnabled ? 'Auto On' : 'Manual'}</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Check-In Time</label>
                                    <input
                                        type="time"
                                        value={room.defaultCheckInTime}
                                        onChange={e => handleFieldChange(room.roomNumber, 'defaultCheckInTime', e.target.value)}
                                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Check-Out Time</label>
                                    <input
                                        type="time"
                                        value={room.defaultCheckOutTime}
                                        onChange={e => handleFieldChange(room.roomNumber, 'defaultCheckOutTime', e.target.value)}
                                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-800"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleSaveRoom(room)}
                                disabled={savingRoom === room.roomNumber}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition disabled:opacity-60"
                            >
                                <Save size={14} />
                                {savingRoom === room.roomNumber ? 'Saving...' : `Save Room ${room.roomNumber}`}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AutoSchedulePanel;
