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
    Play,
    Square,
    Terminal,
} from 'lucide-react';

const AIRBNB_BRIDGE_URL = `${API_BASE_URL}/api/airbnb-bridge`;

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

    // Live Airbnb Local Bridge Extractor state
    const todayIso = new Date().toISOString().slice(0, 10);
    const plus90Iso = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const [bridgeOnline, setBridgeOnline] = useState<boolean>(false);
    const [extractFromDate, setExtractFromDate] = useState<string>(todayIso);
    const [extractToDate, setExtractToDate] = useState<string>(plus90Iso);
    const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'needs_phone' | 'needs_otp' | 'waiting_login' | 'scanning' | 'done' | 'error'>('idle');
    const [bridgeProgress, setBridgeProgress] = useState<string>('');
    const [bridgeLogs, setBridgeLogs] = useState<string[]>([]);
    const [bridgeError, setBridgeError] = useState<string>('');
    const [airbnbPhone, setAirbnbPhone] = useState<string>('');
    const [airbnbOtp, setAirbnbOtp] = useState<string>('');
    const [copiedBridgeCmd, setCopiedBridgeCmd] = useState<boolean>(false);
    const handledDoneRef = useRef<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const selectedRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
    const activePlatform = BOOKING_PLATFORMS.find(p => p.id === importSource) || BOOKING_PLATFORMS[0];
    const exportIcalUrl = selectedRoom
        ? `${API_BASE_URL}/api/ical/${encodeURIComponent(selectedRoom.number)}/calendar.ics`
        : '';

    const checkBridgeHealth = async () => {
        try {
            const res = await fetch(`${AIRBNB_BRIDGE_URL}/health`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.ok) {
                    setBridgeOnline(true);
                    return true;
                }
            }
        } catch { /* offline */ }
        setBridgeOnline(false);
        return false;
    };

    useEffect(() => {
        checkBridgeHealth();
    }, []);

    // Poll server bridge while waiting for phone, OTP, login, or scanning
    useEffect(() => {
        if (bridgeStatus !== 'waiting_login' && bridgeStatus !== 'needs_phone' && bridgeStatus !== 'needs_otp' && bridgeStatus !== 'scanning') return;
        const id = window.setInterval(async () => {
            try {
                const res = await fetch(`${AIRBNB_BRIDGE_URL}/status`, { credentials: 'include' });
                if (!res.ok) return;
                const data = await res.json();
                setBridgeStatus(data.status || 'idle');
                setBridgeProgress(data.progressText || '');
                setBridgeLogs(Array.isArray(data.logs) ? data.logs : []);
                if (data.error) setBridgeError(data.error);

                if (data.status === 'done' && !handledDoneRef.current) {
                    handledDoneRef.current = true;
                    const extracted: StructuredReservationInput[] = Array.isArray(data.reservations) ? data.reservations : [];
                    if (extracted.length > 0 && selectedRoom) {
                        setImportSource(BookingSource.AIRBNB);
                        setUploadedReservations(extracted);
                        setUploadedIcsContent('');
                        setUploadedIcsName(`Airbnb Extractor (${extracted.length} bookings)`);
                        setSyncStatus('checking');
                        setErrorMessage('');
                        try {
                            const previewRes = await previewStructuredReservations(selectedRoom.number, {
                                source: BookingSource.AIRBNB,
                                reservations: extracted,
                            });
                            if (previewRes.conflicts.length > 0) {
                                setPreview(previewRes);
                                setSelectedOverrideUids(new Set());
                                setSyncStatus('confirm_override');
                            } else {
                                const importRes = await confirmStructuredReservations(selectedRoom.number, {
                                    source: BookingSource.AIRBNB,
                                    reservations: extracted,
                                    overrideUids: [],
                                });
                                setLastResult(importRes);
                                setSyncStatus('success');
                                await onRefreshBookings();
                            }
                        } catch (err: any) {
                            setErrorMessage(err?.message || 'Extracted bookings, but preview failed.');
                            setSyncStatus('error');
                        }
                    }
                }
            } catch {
                setBridgeOnline(false);
            }
        }, 1200);
        return () => window.clearInterval(id);
    }, [bridgeStatus, selectedRoom, onRefreshBookings]);

    const handleStartAirbnbExtractor = async () => {
        setBridgeError('');
        const ok = await checkBridgeHealth();
        if (!ok) {
            setBridgeError('Server Airbnb extractor service is offline. Make sure airbnb-bridge is running on srv1225912.');
            return;
        }
        handledDoneRef.current = false;
        setAirbnbOtp('');
        try {
            const res = await fetch(`${AIRBNB_BRIDGE_URL}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ fromDate: extractFromDate, toDate: extractToDate }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Could not start extractor');
            setBridgeStatus('scanning');
            setBridgeProgress('Checking Airbnb session on server...');
            setBridgeLogs([]);
        } catch (err: any) {
            setBridgeError(err?.message || 'Failed to start Airbnb extractor.');
        }
    };

    const handleSubmitAirbnbPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!airbnbPhone.trim()) return;
        setBridgeError('');
        try {
            const res = await fetch(`${AIRBNB_BRIDGE_URL}/submit-phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phoneNumber: airbnbPhone.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to submit phone number');
            setBridgeProgress('Sending phone number to Airbnb — waiting for SMS OTP...');
        } catch (err: any) {
            setBridgeError(err?.message || 'Failed to submit phone number.');
        }
    };

    const handleSubmitAirbnbOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!airbnbOtp.trim()) return;
        setBridgeError('');
        try {
            const res = await fetch(`${AIRBNB_BRIDGE_URL}/submit-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ otp: airbnbOtp.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to submit OTP');
            setAirbnbOtp('');
            setBridgeProgress('Verifying OTP with Airbnb...');
        } catch (err: any) {
            setBridgeError(err?.message || 'Failed to submit OTP.');
        }
    };

    const handleContinueAirbnbScan = async () => {
        try {
            await fetch(`${AIRBNB_BRIDGE_URL}/continue`, { method: 'POST', credentials: 'include' });
            setBridgeStatus('scanning');
        } catch {
            setBridgeError('Lost connection to extractor service.');
        }
    };

    const handleStopAirbnbExtractor = async () => {
        try {
            await fetch(`${AIRBNB_BRIDGE_URL}/stop`, { method: 'POST', credentials: 'include' });
        } catch { /* ignore */ }
        setBridgeStatus('idle');
        setBridgeProgress('');
    };

    useEffect(() => {
        if (!selectedRoomId && rooms.length > 0) {
            setSelectedRoomId(rooms[0].id);
        }
    }, [rooms, selectedRoomId]);

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

            {/* LIVE AIRBNB CALENDAR EXTRACTOR TRIGGER CARD */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A5F]" />
                            Airbnb Live Calendar Extractor (Works on Mobile &amp; Desktop)
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Runs on your server — if your Airbnb session is saved it extracts automatically; if login is needed, enter Phone &amp; SMS OTP right here.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                bridgeOnline
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${bridgeOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {bridgeOnline ? 'Extractor Service Ready' : 'Extractor Service Offline'}
                        </span>
                        <button
                            type="button"
                            onClick={checkBridgeHealth}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                            title="Re-check server extractor service"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>

                {!bridgeOnline && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-semibold text-slate-800">
                                <Terminal size={14} className="text-slate-600 shrink-0" />
                                <span>Start <code>airbnb-bridge</code> on <code>srv1225912</code> (port 4321) to enable one-click extraction:</span>
                            </div>
                            <button
                                type="button"
                                onClick={checkBridgeHealth}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold"
                            >
                                <RefreshCw size={12} />
                                Re-check Now
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900 text-emerald-300 rounded-lg p-2.5 font-mono text-[11px]">
                            <code className="flex-1 overflow-x-auto whitespace-nowrap">
                                nohup HEADLESS=true node /opt/myapp/airbnb-bridge/bridge-server.mjs &gt; /opt/myapp/airbnb-bridge.log 2&gt;&amp;1 &amp;
                            </code>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText('nohup HEADLESS=true node /opt/myapp/airbnb-bridge/bridge-server.mjs > /opt/myapp/airbnb-bridge.log 2>&1 &');
                                    setCopiedBridgeCmd(true);
                                    setTimeout(() => setCopiedBridgeCmd(false), 2000);
                                }}
                                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans text-[11px]"
                            >
                                {copiedBridgeCmd ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                {copiedBridgeCmd ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <details className="text-[11px] text-slate-600">
                            <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
                                First-time setup on srv1225912 (if /opt/myapp/airbnb-bridge is not installed yet)
                            </summary>
                            <pre className="mt-2 p-2.5 rounded-lg bg-slate-900 text-slate-200 overflow-x-auto leading-relaxed">
{`cd /opt/myapp/airbnb-bridge
npm install
npx playwright-core install chromium
npx playwright-core install-deps chromium
nohup HEADLESS=true node /opt/myapp/airbnb-bridge/bridge-server.mjs > /opt/myapp/airbnb-bridge.log 2>&1 &
curl -s http://127.0.0.1:4321/health`}
                            </pre>
                        </details>
                    </div>
                )}

                {/* In-UI Phone Number Prompt (when server Airbnb session needs login) */}
                {bridgeStatus === 'needs_phone' && (
                    <form onSubmit={handleSubmitAirbnbPhone} className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                        <div className="text-xs font-bold text-amber-900">
                            Step 1: Enter your Airbnb Host Phone Number (India +91) to receive SMS OTP
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="tel"
                                value={airbnbPhone}
                                onChange={(e) => setAirbnbPhone(e.target.value)}
                                placeholder="e.g. 9818570858"
                                className="flex-1 p-2.5 rounded-lg border border-amber-300 bg-white text-sm font-semibold"
                                required
                            />
                            <button
                                type="submit"
                                className="px-4 py-2.5 rounded-lg bg-[#FF5A5F] hover:bg-[#e0484d] text-white text-xs font-bold"
                            >
                                Send SMS OTP
                            </button>
                            <button
                                type="button"
                                onClick={handleStopAirbnbExtractor}
                                className="px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* In-UI 6-Digit SMS OTP Prompt */}
                {bridgeStatus === 'needs_otp' && (
                    <form onSubmit={handleSubmitAirbnbOtp} className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                        <div className="text-xs font-bold text-emerald-900">
                            Step 2: Enter the 6-digit SMS OTP sent by Airbnb
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={airbnbOtp}
                                onChange={(e) => setAirbnbOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="6-digit OTP"
                                className="flex-1 p-2.5 rounded-lg border border-emerald-300 bg-white text-sm font-mono tracking-widest font-bold"
                                required
                            />
                            <button
                                type="submit"
                                className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                            >
                                Verify OTP &amp; Scan
                            </button>
                            <button
                                type="button"
                                onClick={handleStopAirbnbExtractor}
                                className="px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-3">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Target Room</label>
                        <select
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-semibold text-slate-800"
                            value={selectedRoom?.id || 0}
                            onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                        >
                            {rooms.map(room => (
                                <option key={room.id} value={room.id}>
                                    Room {room.number} — {room.type}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:col-span-3">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">From Date</label>
                        <input
                            type="date"
                            value={extractFromDate}
                            onChange={(e) => setExtractFromDate(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                        />
                    </div>
                    <div className="sm:col-span-3">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">To Date</label>
                        <input
                            type="date"
                            value={extractToDate}
                            onChange={(e) => setExtractToDate(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                        />
                    </div>
                    <div className="sm:col-span-3 flex gap-2">
                        {bridgeStatus === 'waiting_login' ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleContinueAirbnbScan}
                                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <Play size={14} /> I&apos;m Logged In — Scan
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStopAirbnbExtractor}
                                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                                    title="Stop"
                                >
                                    <Square size={14} />
                                </button>
                            </>
                        ) : bridgeStatus === 'scanning' ? (
                            <button
                                type="button"
                                onClick={handleStopAirbnbExtractor}
                                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                            >
                                <Square size={14} /> Stop Scanning
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleStartAirbnbExtractor}
                                className="w-full py-2.5 px-4 bg-[#FF5A5F] hover:bg-[#e0484d] text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Play size={15} /> Fetch from Airbnb
                            </button>
                        )}
                    </div>
                </div>

                {bridgeError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>{bridgeError}</span>
                    </div>
                )}

                {(bridgeProgress || bridgeLogs.length > 0) && (
                    <div className="rounded-xl bg-slate-900 text-slate-100 p-3.5 text-xs font-mono space-y-1.5">
                        {bridgeProgress && (
                            <div className="text-amber-300 font-semibold flex items-center gap-2">
                                {bridgeStatus === 'scanning' && <RefreshCw size={13} className="animate-spin" />}
                                <span>{bridgeProgress}</span>
                            </div>
                        )}
                        {bridgeLogs.length > 0 && (
                            <div className="max-h-40 overflow-y-auto space-y-0.5 text-[11px] text-slate-300 pt-1 border-t border-slate-700">
                                {bridgeLogs.slice(-12).map((line, i) => (
                                    <div key={i}>{line}</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
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
