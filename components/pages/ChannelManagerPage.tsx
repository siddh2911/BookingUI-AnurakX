import React, { useState, useEffect, useRef } from 'react';
import { Room, Booking, BookingSource } from '../../types';
import { generateICal } from '../../services/iCalUtils';
import { API_BASE_URL } from '../../constants/api';
import {
    previewRoomIcalImport,
    confirmRoomIcalImport,
    previewStructuredReservations,
    confirmStructuredReservations,
    StructuredReservationInput,
    IcalPreviewResponse,
    IcalImportResult,
} from '../../services/api';
import {
    Download,
    RefreshCw,
    Link,
    Check,
    AlertCircle,
    AlertTriangle,
    Upload,
    Copy,
    Calendar,
    ShieldAlert,
    CheckCircle2,
    X,
} from 'lucide-react';

interface ChannelManagerPageProps {
    rooms: Room[];
    bookings: Booking[];
    onRefreshBookings: () => Promise<void> | void;
}

const BOOKING_PLATFORMS: { id: string; label: string; placeholder: string }[] = [
    { id: BookingSource.AIRBNB, label: 'Airbnb', placeholder: 'https://www.airbnb.com/calendar/ical/...' },
    { id: BookingSource.BOOKING_COM, label: 'Booking.com', placeholder: 'https://admin.booking.com/hotel/hoteladmin/ical.html?t=...' },
    { id: BookingSource.MAKE_MY_TRIP, label: 'MakeMyTrip', placeholder: 'https://in.goibibo.com/... or MakeMyTrip iCal link' },
    { id: BookingSource.GOIBIBO, label: 'Goibibo', placeholder: 'https://in.goibibo.com/... iCal export link' },
    { id: BookingSource.AGODA, label: 'Agoda', placeholder: 'https://ycs.agoda.com/... iCal link' },
    { id: BookingSource.EXPEDIA, label: 'Expedia', placeholder: 'https://www.expediapartnercentral.com/... iCal link' },
    { id: 'Vrbo', label: 'Vrbo', placeholder: 'https://www.vrbo.com/icalendar/...' },
    { id: 'Google Calendar', label: 'Google Calendar', placeholder: 'https://calendar.google.com/calendar/ical/.../basic.ics' },
    { id: 'Other iCal', label: 'Other / Custom', placeholder: 'https://... (.ics calendar URL)' },
];

const ChannelManagerPage: React.FC<ChannelManagerPageProps> = ({ rooms, bookings, onRefreshBookings }) => {
    const [selectedRoomId, setSelectedRoomId] = useState<number>(rooms[0]?.id || 0);
    const [importUrl, setImportUrl] = useState('');
    const [uploadedIcsName, setUploadedIcsName] = useState('');
    const [uploadedIcsContent, setUploadedIcsContent] = useState('');
    const [uploadedReservations, setUploadedReservations] = useState<StructuredReservationInput[] | null>(null);
    const [importSource, setImportSource] = useState<string>(BookingSource.AIRBNB);
    const [saveUrlForAutoSync, setSaveUrlForAutoSync] = useState(true);

    const [syncStatus, setSyncStatus] = useState<'idle' | 'checking' | 'confirm_override' | 'importing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [preview, setPreview] = useState<IcalPreviewResponse | null>(null);
    const [selectedOverrideUids, setSelectedOverrideUids] = useState<Set<string>>(new Set());
    const [lastResult, setLastResult] = useState<IcalImportResult | null>(null);
    const [copiedExport, setCopiedExport] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!selectedRoomId && rooms.length > 0) {
            setSelectedRoomId(rooms[0].id);
        }
    }, [rooms, selectedRoomId]);

    const selectedRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
    const activePlatform = BOOKING_PLATFORMS.find(p => p.id === importSource) || BOOKING_PLATFORMS[0];
    const exportIcalUrl = selectedRoom
        ? `${API_BASE_URL}/api/ical/${encodeURIComponent(selectedRoom.number)}/calendar.ics`
        : '';

    const handleCopyExportUrl = () => {
        if (!exportIcalUrl) return;
        navigator.clipboard?.writeText(exportIcalUrl).then(() => {
            setCopiedExport(true);
            setTimeout(() => setCopiedExport(false), 2000);
        });
    };

    const handleDownloadICal = () => {
        if (!selectedRoom) return;
        const roomBookings = bookings.filter(b => b.roomId === selectedRoom.id && b.status !== 'Cancelled');
        const icalContent = generateICal(roomBookings, `Room ${selectedRoom.number}`);

        const element = document.createElement('a');
        const file = new Blob([icalContent], { type: 'text/calendar' });
        element.href = URL.createObjectURL(file);
        element.download = `karuna_villa_room_${selectedRoom.number}.ics`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const parseCsvLine = (line: string): string[] => {
        const out: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                out.push(cur.trim());
                cur = '';
            } else {
                cur += ch;
            }
        }
        out.push(cur.trim());
        return out;
    };

    const parseDateFlex = (raw: string): string => {
        const s = (raw || '').trim();
        if (!s) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const text = typeof reader.result === 'string' ? reader.result : '';
            const lowerName = file.name.toLowerCase();
            if (lowerName.endsWith('.json')) {
                try {
                    const parsed = JSON.parse(text);
                    const list = Array.isArray(parsed) ? parsed : parsed?.reservations;
                    if (!Array.isArray(list) || list.length === 0) {
                        setErrorMessage('JSON file has no reservations array.');
                        setSyncStatus('error');
                        return;
                    }
                    setUploadedReservations(list);
                    setUploadedIcsContent('');
                    setUploadedIcsName(`${file.name} (${list.length} bookings)`);
                    setErrorMessage('');
                } catch {
                    setErrorMessage('Invalid JSON file.');
                    setSyncStatus('error');
                }
            } else if (lowerName.endsWith('.csv')) {
                const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
                if (lines.length < 2) {
                    setErrorMessage('CSV file appears empty.');
                    setSyncStatus('error');
                    return;
                }
                const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
                const idx = (...names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));
                const iCode = idx('confirmation code', 'code');
                const iStatus = idx('status');
                const iGuest = idx('guest name', 'guest');
                const iContact = idx('contact', 'phone');
                const iStart = idx('start date', 'check-in', 'checkin');
                const iEnd = idx('end date', 'check-out', 'checkout');
                const iEarnings = idx('earnings', 'payout', 'total');
                const rows: StructuredReservationInput[] = [];
                for (const line of lines.slice(1)) {
                    const cols = parseCsvLine(line);
                    if (iStatus >= 0 && /cancel/i.test(cols[iStatus] || '')) continue;
                    const checkInDate = parseDateFlex(iStart >= 0 ? cols[iStart] : '');
                    const checkOutDate = parseDateFlex(iEnd >= 0 ? cols[iEnd] : '');
                    if (!checkInDate || !checkOutDate) continue;
                    rows.push({
                        confirmationCode: iCode >= 0 ? cols[iCode] : '',
                        guestName: iGuest >= 0 ? cols[iGuest] : '',
                        phone: iContact >= 0 ? cols[iContact] : '',
                        checkInDate,
                        checkOutDate,
                        totalAmount: iEarnings >= 0 ? (Number(String(cols[iEarnings] || '0').replace(/[^0-9.]/g, '')) || 0) : 0,
                        source: importSource,
                    });
                }
                setUploadedReservations(rows);
                setUploadedIcsContent('');
                setUploadedIcsName(`${file.name} (${rows.length} bookings)`);
                setErrorMessage('');
            } else {
                setUploadedReservations(null);
                setUploadedIcsContent(text);
                setUploadedIcsName(file.name);
                setErrorMessage('');
            }
        };
        reader.readAsText(file);
    };

    const clearUploadedFile = () => {
        setUploadedIcsContent('');
        setUploadedReservations(null);
        setUploadedIcsName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const executeFinalImport = async (overrideUids: string[]) => {
        if (!selectedRoom) return;
        setSyncStatus('importing');
        setErrorMessage('');
        try {
            const res = uploadedReservations
                ? await confirmStructuredReservations(selectedRoom.number, {
                    source: importSource,
                    reservations: uploadedReservations,
                    overrideUids,
                })
                : await confirmRoomIcalImport(selectedRoom.number, {
                    url: uploadedIcsContent ? undefined : importUrl.trim(),
                    icsContent: uploadedIcsContent || undefined,
                    source: importSource,
                    overrideUids,
                    saveUrl: saveUrlForAutoSync && !uploadedIcsContent,
                });
            setLastResult(res);
            setPreview(null);
            setSelectedOverrideUids(new Set());
            setSyncStatus('success');
            await onRefreshBookings();
        } catch (err: any) {
            setErrorMessage(err?.message || 'Failed to import calendar.');
            setSyncStatus('error');
        }
    };

    const handleCheckAndSync = async () => {
        if (!selectedRoom) {
            setErrorMessage('Please select a room first.');
            setSyncStatus('error');
            return;
        }
        if (!uploadedReservations && !uploadedIcsContent && !importUrl.trim()) {
            setErrorMessage('Please paste an iCal URL or upload an .ics / Airbnb .csv / extractor .json file.');
            setSyncStatus('error');
            return;
        }

        setSyncStatus('checking');
        setErrorMessage('');
        setPreview(null);
        setLastResult(null);

        try {
            const previewRes = uploadedReservations
                ? await previewStructuredReservations(selectedRoom.number, {
                    source: importSource,
                    reservations: uploadedReservations,
                })
                : await previewRoomIcalImport(selectedRoom.number, {
                    url: uploadedIcsContent ? undefined : importUrl.trim(),
                    icsContent: uploadedIcsContent || undefined,
                    source: importSource,
                });

            if (previewRes.conflicts.length > 0) {
                // Stop and ask Admin explicitly whether to override conflicting dates
                setPreview(previewRes);
                setSelectedOverrideUids(new Set());
                setSyncStatus('confirm_override');
                return;
            }

            // No conflicts — import directly
            await executeFinalImport([]);
        } catch (err: any) {
            setErrorMessage(err?.message || 'Failed to fetch or parse iCal calendar.');
            setSyncStatus('error');
        }
    };

    const toggleOverrideUid = (uid: string) => {
        setSelectedOverrideUids(prev => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    };

    const toggleAllOverrides = () => {
        if (!preview) return;
        if (selectedOverrideUids.size === preview.conflicts.length) {
            setSelectedOverrideUids(new Set());
        } else {
            setSelectedOverrideUids(new Set(preview.conflicts.map(c => c.uid)));
        }
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Channel Manager</h1>
                <p className="text-slate-500">
                    Sync calendars across Airbnb, Booking.com, MakeMyTrip, Goibibo, Agoda, Expedia, Vrbo, and Google Calendar.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* EXPORT SECTION */}
                <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4 text-blue-600">
                        <Download size={22} />
                        <h2 className="text-xl font-bold text-slate-800">Export Calendar</h2>
                    </div>
                    <p className="text-slate-600 mb-5 text-sm">
                        Share this live iCal link with any OTA (Airbnb, Booking.com, MakeMyTrip, Agoda, Vrbo) so they automatically pull blocked dates from Karuna Villa.
                    </p>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Select Room
                            </label>
                            <select
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                value={selectedRoom?.id || 0}
                                onChange={(e) => {
                                    setSelectedRoomId(Number(e.target.value));
                                    setPreview(null);
                                    setSyncStatus('idle');
                                }}
                            >
                                {rooms.map(room => (
                                    <option key={room.id} value={room.id}>
                                        Room {room.number} — {room.type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Live Export iCal URL
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 break-all text-xs font-mono text-slate-600">
                                    {exportIcalUrl || 'Select a room'}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyExportUrl}
                                    className="px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                                    title="Copy URL"
                                >
                                    {copiedExport ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                    {copiedExport ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleDownloadICal}
                            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm flex items-center justify-center gap-2"
                        >
                            <Download size={16} /> Download .ics File
                        </button>
                    </div>
                </div>

                {/* IMPORT SECTION */}
                <div className="lg:col-span-7 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <RefreshCw size={22} />
                            <h2 className="text-xl font-bold text-slate-800">Import Calendar</h2>
                        </div>
                        {selectedRoom && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Room {selectedRoom.number}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-600 mb-5 text-sm">
                        Select any booking platform and paste its iCal export URL (or upload a <code>.ics</code> file). If any date already has a booking, we will ask you before overriding it.
                    </p>

                    <div className="space-y-4 flex-1">
                        {/* Room Number Selector for Import */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Syncing for Room Number
                            </label>
                            <select
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white font-semibold text-slate-800"
                                value={selectedRoom?.id || 0}
                                onChange={(e) => {
                                    setSelectedRoomId(Number(e.target.value));
                                    setPreview(null);
                                    setSyncStatus('idle');
                                }}
                            >
                                {rooms.map(room => (
                                    <option key={room.id} value={room.id}>
                                        Room {room.number} — {room.type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* All Booking Platforms */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Booking Platform
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {BOOKING_PLATFORMS.map(platform => {
                                    const active = importSource === platform.id;
                                    return (
                                        <button
                                            key={platform.id}
                                            type="button"
                                            onClick={() => {
                                                setImportSource(platform.id);
                                                setErrorMessage('');
                                            }}
                                            className={`px-3 py-1.5 text-xs rounded-lg border font-semibold transition-all ${
                                                active
                                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                            }`}
                                        >
                                            {platform.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* iCal URL Input */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                {activePlatform.label} iCal URL
                            </label>
                            <input
                                type="url"
                                placeholder={activePlatform.placeholder}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                value={importUrl}
                                onChange={(e) => {
                                    setImportUrl(e.target.value);
                                    if (uploadedIcsContent || uploadedReservations) clearUploadedFile();
                                    setErrorMessage('');
                                }}
                            />
                        </div>

                        {/* Optional .ics / .csv / .json File Upload */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".ics,.csv,.json"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700"
                                >
                                    <Upload size={13} /> Upload .ics / Airbnb .csv / Extractor .json
                                </button>
                                {uploadedIcsName && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                                        {uploadedIcsName}
                                        <button type="button" onClick={clearUploadedFile} className="hover:text-emerald-900">
                                            <X size={12} />
                                        </button>
                                    </span>
                                )}
                            </div>

                            {(importSource === BookingSource.AIRBNB || importSource === BookingSource.BOOKING_COM) && !uploadedIcsContent && (
                                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={saveUrlForAutoSync}
                                        onChange={(e) => setSaveUrlForAutoSync(e.target.checked)}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    Save link for hourly auto-sync
                                </label>
                            )}
                        </div>

                        {/* Error Banner */}
                        {syncStatus === 'error' && errorMessage && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* Success Summary Banner */}
                        {syncStatus === 'success' && lastResult && (
                            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                                <div className="font-bold flex items-center gap-1.5 text-sm">
                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                    Calendar synced for Room {lastResult.roomNumber} ({lastResult.source})
                                </div>
                                <div className="flex flex-wrap gap-3 pt-1 text-emerald-700 font-medium">
                                    <span>Imported: <b>{lastResult.importedCount}</b></span>
                                    <span>Overridden: <b>{lastResult.overriddenCount}</b></span>
                                    <span>Skipped conflicts: <b>{lastResult.skippedConflicts}</b></span>
                                    <span>Already up-to-date: <b>{lastResult.alreadySyncedCount}</b></span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleCheckAndSync}
                            disabled={syncStatus === 'checking' || syncStatus === 'importing'}
                            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {syncStatus === 'checking' || syncStatus === 'importing' ? (
                                <RefreshCw className="animate-spin" size={16} />
                            ) : (
                                <Link size={16} />
                            )}
                            {syncStatus === 'checking'
                                ? 'Fetching & Checking for Date Conflicts...'
                                : syncStatus === 'importing'
                                    ? 'Importing Calendar...'
                                    : `Import ${activePlatform.label} Calendar`}
                        </button>
                    </div>
                </div>
            </div>

            {/* EXPLICIT DATE OVERRIDE CONFIRMATION PANEL */}
            {syncStatus === 'confirm_override' && preview && (
                <div className="bg-white rounded-2xl shadow-md border-2 border-amber-300 overflow-hidden animate-in fade-in duration-300">
                    <div className="p-5 bg-amber-50/90 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                                <ShieldAlert size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Date Override Confirmation — Room {preview.roomNumber}
                                </h3>
                                <p className="text-sm text-slate-700 mt-0.5">
                                    Found <b>{preview.conflicts.length}</b> date conflict{preview.conflicts.length > 1 ? 's' : ''} that can be overridden
                                    {preview.ready.length > 0 && (
                                        <> (plus <b>{preview.ready.length}</b> non-conflicting booking{preview.ready.length > 1 ? 's' : ''} ready to import)</>
                                    )}. <b>Should I override these existing bookings?</b>
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={toggleAllOverrides}
                            className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-xs font-bold text-amber-800 shrink-0 self-start sm:self-center"
                        >
                            {selectedOverrideUids.size === preview.conflicts.length ? 'Deselect All' : 'Select All to Override'}
                        </button>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                        {preview.conflicts.map((conflict) => {
                            const checked = selectedOverrideUids.has(conflict.uid);
                            return (
                                <label
                                    key={conflict.uid}
                                    className={`p-4 flex items-start gap-4 cursor-pointer transition-colors ${
                                        checked ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleOverrideUid(conflict.uid)}
                                        className="mt-1 w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                        {/* Incoming iCal Booking */}
                                        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700">
                                                    Incoming ({conflict.source})
                                                </span>
                                                <span className="inline-flex items-center gap-1 font-bold text-emerald-900">
                                                    <Calendar size={12} /> {conflict.checkInDate} → {conflict.checkOutDate}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <div>
                                                    <div className="font-semibold text-slate-800 text-sm">{conflict.guestName}</div>
                                                    {conflict.summary && conflict.summary !== conflict.guestName && (
                                                        <div className="text-slate-500 mt-0.5">{conflict.summary}</div>
                                                    )}
                                                </div>
                                                {Number(conflict.totalAmount) > 0 && (
                                                    <span className="font-bold text-emerald-800 shrink-0 text-sm">
                                                        ₹{Number(conflict.totalAmount).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Conflicting Existing Booking(s) */}
                                        <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                                            <div className="font-bold uppercase tracking-wider text-[10px] text-rose-700 flex items-center gap-1">
                                                <AlertTriangle size={11} /> Existing Booking{conflict.existingBookings.length > 1 ? 's' : ''} (Will be cancelled if overridden)
                                            </div>
                                            {conflict.existingBookings.map((eb) => (
                                                <div key={eb.id} className="flex items-center justify-between gap-2">
                                                    <div>
                                                        <div className="font-semibold text-slate-800 text-sm">
                                                            {eb.guestName}{' '}
                                                            <span className="text-[11px] font-normal text-slate-500">({eb.bookingSource})</span>
                                                        </div>
                                                        <div className="text-rose-800 font-medium">
                                                            {eb.checkInDate} → {eb.checkOutDate} · {eb.status}
                                                        </div>
                                                    </div>
                                                    {eb.totalAmount > 0 && (
                                                        <span className="font-bold text-slate-700 shrink-0">
                                                            ₹{Number(eb.totalAmount).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setPreview(null);
                                setSelectedOverrideUids(new Set());
                                setSyncStatus('idle');
                            }}
                            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => executeFinalImport([])}
                            className="px-4 py-2.5 rounded-lg border border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-700 text-sm font-semibold"
                        >
                            No, Keep Existing ({preview.ready.length > 0 ? `Import ${preview.ready.length} Safe Only` : 'Skip All'})
                        </button>
                        <button
                            type="button"
                            disabled={selectedOverrideUids.size === 0}
                            onClick={() => executeFinalImport(Array.from(selectedOverrideUids))}
                            className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Yes, Override Selected ({selectedOverrideUids.size}) &amp; Import
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChannelManagerPage;
