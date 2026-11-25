import React, { useState, useEffect, useCallback } from 'react';
import { Room } from '../../types';
import { Tv, Link2, RefreshCw, Unlink, CheckCircle2, AlertCircle, Wifi, Clock, User, Sparkles, Shield, Save, ExternalLink, Music, Volume2 } from 'lucide-react';
import {
    listLinkedTvs,
    linkRoomTv,
    unlinkRoomTv,
    syncRoomTv,
    getTvSettings,
    saveTvSettings,
    LinkedTv,
    TvSettings
} from '../../services/api';
import { DEFAULT_HOTEL_ID } from '../../constants/api';

interface RoomTvManagerProps {
    rooms: Room[];
}

const toLines = (arr?: string[]) => (arr && arr.length ? arr.join('\n') : '');
const fromLines = (text: string) => text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

const RoomTvManager: React.FC<RoomTvManagerProps> = ({ rooms }) => {
    const [tvs, setTvs] = useState<LinkedTv[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<string>(rooms[0]?.number || '');
    const [pairCode, setPairCode] = useState('');
    const [tvName, setTvName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [syncingRoom, setSyncingRoom] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // TV Display Settings state
    const [settingsScope, setSettingsScope] = useState<string>(''); // '' = All Rooms (Hotel Defaults), or roomNumber
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [form, setForm] = useState({
        area: '',
        tagline: '',
        template: 'villa',
        propertyNameOverride: '',
        guestNameOverride: '',
        welcomeMessage: '',
        checkoutMessage: '',
        betweenStaysMessage: '',
        wifiName: '',
        wifiPassword: '',
        wifiSecurity: 'WPA',
        checkInTime: '14:00',
        checkoutTime: '11:00',
        quietHoursFrom: '22:00',
        quietHoursTo: '08:00',
        hostFirstName: '',
        whatsapp: '',
        contactNote: '',
        amenitiesText: '',
        houseRulesText: '',
        checkoutStepsText: '',
        musicUrl: '',
        musicEnabled: false,
        musicVolume: 35,
    });

    useEffect(() => {
        if (!selectedRoom && rooms.length > 0) {
            setSelectedRoom(rooms[0].number);
        }
    }, [rooms, selectedRoom]);

    const loadTvs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listLinkedTvs();
            setTvs(data);
        } catch (err: any) {
            console.warn('Could not load linked TVs:', err?.message || err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadSettings = useCallback(async (scope: string) => {
        setLoadingSettings(true);
        setSettingsFeedback(null);
        try {
            const data: TvSettings = await getTvSettings(scope || undefined);
            setForm({
                area: data.area || '',
                tagline: data.tagline || '',
                template: data.template || 'villa',
                propertyNameOverride: data.propertyNameOverride || '',
                guestNameOverride: data.guestNameOverride || '',
                welcomeMessage: data.welcomeMessage || '',
                checkoutMessage: data.checkoutMessage || '',
                betweenStaysMessage: data.betweenStaysMessage || '',
                wifiName: data.wifiName || '',
                wifiPassword: data.wifiPassword || '',
                wifiSecurity: data.wifiSecurity || 'WPA',
                checkInTime: data.checkInTime || '14:00',
                checkoutTime: data.checkoutTime || '11:00',
                quietHoursFrom: data.quietHoursFrom || '22:00',
                quietHoursTo: data.quietHoursTo || '08:00',
                hostFirstName: data.hostFirstName || '',
                whatsapp: data.whatsapp || '',
                contactNote: data.contactNote || '',
                amenitiesText: toLines(data.amenities),
                houseRulesText: toLines(data.houseRules),
                checkoutStepsText: toLines(data.checkoutSteps),
                musicUrl: data.musicUrl || '',
                musicEnabled: Boolean(data.musicEnabled),
                musicVolume: typeof data.musicVolume === 'number' ? data.musicVolume : 35,
            });
        } catch (err: any) {
            setSettingsFeedback({ type: 'error', text: err?.message || 'Failed to load TV settings.' });
        } finally {
            setLoadingSettings(false);
        }
    }, []);

    useEffect(() => {
        loadTvs();
    }, [loadTvs]);

    useEffect(() => {
        loadSettings(settingsScope);
    }, [settingsScope, loadSettings]);

    const handlePair = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoom || pairCode.trim().length < 6) {
            setFeedback({ type: 'error', text: 'Select a room and enter the 6-character code shown on the TV.' });
            return;
        }
        setSubmitting(true);
        setFeedback(null);
        try {
            const linked = await linkRoomTv(selectedRoom, pairCode, tvName || `Room ${selectedRoom} TV`);
            setPairCode('');
            setTvName('');
            setFeedback({ type: 'success', text: `Paired "${linked.name}" to Room ${linked.roomNumber}. It will now auto-update for every booking.` });
            await loadTvs();
        } catch (err: any) {
            setFeedback({ type: 'error', text: err?.message || 'Failed to pair TV.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSync = async (roomNumber: string) => {
        setSyncingRoom(roomNumber);
        setFeedback(null);
        try {
            const room = rooms.find(r => r.number === roomNumber);
            await syncRoomTv({ roomNumber, hotelId: room?.hotelId ?? DEFAULT_HOTEL_ID });
            setFeedback({ type: 'success', text: `Synced Room ${roomNumber} TV with the latest booking schedule.` });
        } catch (err: any) {
            setFeedback({ type: 'error', text: err?.message || `Failed to sync Room ${roomNumber} TV.` });
        } finally {
            setSyncingRoom(null);
        }
    };

    const handleUnlink = async (tv: LinkedTv) => {
        if (!window.confirm(`Unlink "${tv.name}" from Room ${tv.roomNumber}? The TV will return to its setup code screen.`)) return;
        setFeedback(null);
        try {
            await unlinkRoomTv(tv.id);
            setFeedback({ type: 'success', text: `Unlinked "${tv.name}" from Room ${tv.roomNumber}. It will switch back to setup mode within ~5 seconds.` });
            await loadTvs();
        } catch (err: any) {
            setFeedback({ type: 'error', text: err?.message || 'Failed to unlink TV.' });
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingSettings(true);
        setSettingsFeedback(null);
        try {
            await saveTvSettings({
                area: form.area,
                tagline: form.tagline,
                template: form.template,
                propertyNameOverride: form.propertyNameOverride,
                guestNameOverride: form.guestNameOverride,
                welcomeMessage: form.welcomeMessage,
                checkoutMessage: form.checkoutMessage,
                betweenStaysMessage: form.betweenStaysMessage,
                wifiName: form.wifiName,
                wifiPassword: form.wifiPassword,
                wifiSecurity: form.wifiSecurity,
                checkInTime: form.checkInTime,
                checkoutTime: form.checkoutTime,
                quietHoursFrom: form.quietHoursFrom,
                quietHoursTo: form.quietHoursTo,
                hostFirstName: form.hostFirstName,
                whatsapp: form.whatsapp,
                contactNote: form.contactNote,
                amenities: fromLines(form.amenitiesText),
                houseRules: fromLines(form.houseRulesText),
                checkoutSteps: fromLines(form.checkoutStepsText),
                musicUrl: form.musicUrl,
                musicEnabled: form.musicEnabled,
                musicVolume: form.musicVolume,
            }, settingsScope || undefined);
            setSettingsFeedback({
                type: 'success',
                text: `Saved TV display settings for ${settingsScope ? `Room ${settingsScope}` : 'all rooms'}. Paired TVs will update automatically within 5 seconds.`
            });
        } catch (err: any) {
            setSettingsFeedback({ type: 'error', text: err?.message || 'Failed to save TV settings.' });
        } finally {
            setSavingSettings(false);
        }
    };

    const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
    const labelCls = 'block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* One-Time First-Setup Pair Form */}
                <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                            <Tv size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Pair a Room TV</h3>
                            <p className="text-xs text-slate-500">One-time setup on a fresh TV app install</p>
                        </div>
                    </div>

                    <p className="text-sm text-slate-600 mt-3 mb-5">
                        Enter the 6-character code shown on the TV screen and assign it to a room. Once paired, the TV stays linked and updates automatically for every booking.
                    </p>

                    <form onSubmit={handlePair} className="space-y-4">
                        <div>
                            <label className={labelCls}>Room</label>
                            <select
                                value={selectedRoom}
                                onChange={(e) => setSelectedRoom(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {rooms.map(r => (
                                    <option key={r.id} value={r.number}>
                                        Room {r.number}{r.type ? ` — ${r.type}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelCls}>6-Character Pair Code</label>
                            <input
                                type="text"
                                maxLength={6}
                                value={pairCode}
                                onChange={(e) => setPairCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                placeholder="e.g. K7P2QX"
                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono text-lg tracking-[0.25em] uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className={labelCls}>TV Label (Optional)</label>
                            <input
                                type="text"
                                value={tvName}
                                onChange={(e) => setTvName(e.target.value)}
                                placeholder={selectedRoom ? `Room ${selectedRoom} TV` : 'Living room TV'}
                                className={inputCls}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !selectedRoom || pairCode.trim().length < 6}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                            <Link2 size={16} />
                            {submitting ? 'Pairing TV…' : 'Pair TV to Room'}
                        </button>
                    </form>

                    {feedback && (
                        <div className={`mt-4 p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {feedback.type === 'success' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
                            <span>{feedback.text}</span>
                        </div>
                    )}
                </div>

                {/* Paired Room TVs List */}
                <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Linked Room TVs</h3>
                            <p className="text-xs text-slate-500">TVs automatically refresh every 5 seconds with live check-in &amp; check-out dates</p>
                        </div>
                        <button
                            onClick={loadTvs}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {tvs.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                            <Tv size={32} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-sm font-semibold text-slate-700">No TVs paired yet</p>
                            <p className="text-xs text-slate-500 mt-1">Enter a TV&apos;s 6-character code on the left to link it to a room.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tvs.map((tv) => (
                                <div key={tv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center shrink-0">
                                            <Tv size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-sm">{tv.name}</span>
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                                                    Room {tv.roomNumber}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {tv.deviceName || 'Android TV'}{tv.linkedAt ? ` · Paired ${new Date(tv.linkedAt).toLocaleDateString()}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`/tv?room=${encodeURIComponent(tv.roomNumber)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                                        >
                                            <ExternalLink size={13} />
                                            Open TV
                                        </a>
                                        <button
                                            onClick={() => handleSync(tv.roomNumber)}
                                            disabled={syncingRoom === tv.roomNumber}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                        >
                                            <RefreshCw size={13} className={syncingRoom === tv.roomNumber ? 'animate-spin' : ''} />
                                            Sync Now
                                        </button>
                                        <button
                                            onClick={() => handleUnlink(tv)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-100"
                                        >
                                            <Unlink size={13} />
                                            Unlink
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* TV Display Settings Editor */}
            <form onSubmit={handleSaveSettings} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">TV Screen Content &amp; Settings</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Customize greeting text, Wi-Fi QR credentials, check-in/out times, amenities, house rules, and host details. Guest stay dates update automatically from Bookings.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={settingsScope}
                            onChange={(e) => setSettingsScope(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Rooms (Default)</option>
                            {rooms.map(r => (
                                <option key={r.id} value={r.number}>Room {r.number} Override</option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            disabled={savingSettings || loadingSettings}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <Save size={15} />
                            {savingSettings ? 'Saving…' : 'Save & Push to TV'}
                        </button>
                    </div>
                </div>

                {settingsFeedback && (
                    <div className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${settingsFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {settingsFeedback.type === 'success' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
                        <span>{settingsFeedback.text}</span>
                    </div>
                )}

                {loadingSettings ? (
                    <div className="py-10 text-center text-sm text-slate-500">Loading TV settings…</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Greeting & Property Info */}
                        <div className="space-y-4 p-5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles size={15} className="text-amber-500" /> Greeting &amp; Property
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className={labelCls}>Property Name Override</label>
                                    <input
                                        type="text"
                                        value={form.propertyNameOverride}
                                        onChange={(e) => setForm({ ...form, propertyNameOverride: e.target.value })}
                                        placeholder="Auto from Hotel & Room (or type custom)"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Guest Name Override</label>
                                    <input
                                        type="text"
                                        value={form.guestNameOverride}
                                        onChange={(e) => setForm({ ...form, guestNameOverride: e.target.value })}
                                        placeholder="Auto from active booking (or type custom)"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Welcome Greeting
                                    </label>
                                    <span className="text-[11px] text-slate-500">
                                        Use <code className="px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-800 font-mono font-semibold">{'{name}'}</code> for guest name
                                    </span>
                                </div>
                                <textarea
                                    rows={3}
                                    value={form.welcomeMessage}
                                    onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
                                    placeholder={'Welcome, {name}!\nWe are delighted to host you.'}
                                    className={`${inputCls} leading-relaxed resize-y`}
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    First line shows as the large headline; second line shows as the message below it.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className={labelCls}>Tagline</label>
                                    <input type="text" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Peaceful mountain retreat surrounded by nature" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Location / Area</label>
                                    <input type="text" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Rishikesh, India" className={inputCls} />
                                </div>
                            </div>
                            <div className="space-y-3 pt-1">
                                <div>
                                    <label className={labelCls}>Checkout Morning Greeting</label>
                                    <textarea rows={2} value={form.checkoutMessage} onChange={(e) => setForm({ ...form, checkoutMessage: e.target.value })} className={`${inputCls} leading-relaxed resize-y`} />
                                </div>
                                <div>
                                    <label className={labelCls}>Between-Stays Greeting</label>
                                    <textarea rows={2} value={form.betweenStaysMessage} onChange={(e) => setForm({ ...form, betweenStaysMessage: e.target.value })} className={`${inputCls} leading-relaxed resize-y`} />
                                </div>
                            </div>
                        </div>

                        {/* Wi-Fi + Timings */}
                        <div className="space-y-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Wifi size={15} className="text-blue-500" /> Wi-Fi &amp; Check-in / Checkout Times
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className={labelCls}>Wi-Fi Name</label>
                                    <input type="text" value={form.wifiName} onChange={(e) => setForm({ ...form, wifiName: e.target.value })} placeholder="KarunaVilla-5G" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Wi-Fi Password</label>
                                    <input type="text" value={form.wifiPassword} onChange={(e) => setForm({ ...form, wifiPassword: e.target.value })} placeholder="karuna2026" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Security</label>
                                    <select value={form.wifiSecurity} onChange={(e) => setForm({ ...form, wifiSecurity: e.target.value })} className={inputCls}>
                                        <option value="WPA">WPA / WPA2 / WPA3</option>
                                        <option value="WEP">WEP</option>
                                        <option value="nopass">Open (No Password)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200/70">
                                <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                                    <Clock size={13} className="text-slate-500" /> Timings &amp; Background Theme
                                </h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelCls}>Check-in Time</label>
                                        <input type="time" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Checkout Time</label>
                                        <input type="time" value={form.checkoutTime} onChange={(e) => setForm({ ...form, checkoutTime: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Quiet From</label>
                                        <input type="time" value={form.quietHoursFrom} onChange={(e) => setForm({ ...form, quietHoursFrom: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Quiet To</label>
                                        <input type="time" value={form.quietHoursTo} onChange={(e) => setForm({ ...form, quietHoursTo: e.target.value })} className={inputCls} />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className={labelCls}>Background Photo Theme</label>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {[
                                            { id: 'villa', label: 'Villa', sub: 'Coastal Pool', img: '/tv-bg/bg_villa_stay.jpg' },
                                            { id: 'room', label: 'Hotel Suite', sub: 'Oak & Linen', img: '/tv-bg/bg_room_stay.jpg' },
                                            { id: 'apartment', label: 'Apartment', sub: 'Boutique Loft', img: '/tv-bg/bg_apartment_stay.jpg' },
                                        ].map((opt) => {
                                            const active = form.template === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, template: opt.id })}
                                                    className={`relative rounded-xl overflow-hidden border-2 text-left transition-all ${active ? 'border-blue-600 ring-2 ring-blue-500/30 shadow-md' : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <img src={opt.img} alt={opt.label} className="w-full h-16 object-cover" />
                                                    <div className="p-2 bg-white">
                                                        <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                                                            <span>{opt.label}</span>
                                                            {active && <CheckCircle2 size={13} className="text-blue-600" />}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500">{opt.sub}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Your Host */}
                        <div className="space-y-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <User size={15} className="text-emerald-600" /> Your Host Details
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Host Name</label>
                                    <input type="text" value={form.hostFirstName} onChange={(e) => setForm({ ...form, hostFirstName: e.target.value })} placeholder="Siddhant" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Host WhatsApp / Number</label>
                                    <input type="text" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+91 98765 43210" className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Host Description / Contact Note</label>
                                <textarea
                                    rows={3}
                                    value={form.contactNote}
                                    onChange={(e) => setForm({ ...form, contactNote: e.target.value })}
                                    placeholder="Message me on WhatsApp any time if you need assistance."
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Amenities & House Rules */}
                        <div className="space-y-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Shield size={15} className="text-indigo-500" /> Amenities, House Rules &amp; Checkout Steps
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Amenities (one per line)</label>
                                    <textarea
                                        rows={4}
                                        value={form.amenitiesText}
                                        onChange={(e) => setForm({ ...form, amenitiesText: e.target.value })}
                                        placeholder={'Fast Wi-Fi\nSmart TV\nAir conditioning'}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>House Rules (one per line)</label>
                                    <textarea
                                        rows={4}
                                        value={form.houseRulesText}
                                        onChange={(e) => setForm({ ...form, houseRulesText: e.target.value })}
                                        placeholder={'No smoking inside\nNo parties or events'}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Checkout Morning Checklist (one per line)</label>
                                <textarea
                                    rows={2}
                                    value={form.checkoutStepsText}
                                    onChange={(e) => setForm({ ...form, checkoutStepsText: e.target.value })}
                                    placeholder={'Turn off lights and AC\nLeave keys at reception'}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Ambient Room Music (YouTube) */}
                        <div className="lg:col-span-2 space-y-4 p-5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Music size={15} className="text-rose-500" /> Ambient Room Music (YouTube)
                                </h4>
                                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={form.musicEnabled}
                                        onChange={(e) => setForm({ ...form, musicEnabled: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-slate-700">
                                        {form.musicEnabled ? 'Playing on Room TV' : 'Music Paused / Off'}
                                    </span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-7">
                                    <label className={labelCls}>YouTube Video or Playlist Link</label>
                                    <input
                                        type="url"
                                        value={form.musicUrl}
                                        onChange={(e) => setForm({ ...form, musicUrl: e.target.value })}
                                        placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                                        className={inputCls}
                                    />
                                </div>
                                <div className="md:col-span-5">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                            <Volume2 size={13} className="text-slate-500" /> Volume
                                        </label>
                                        <span className="text-xs font-bold text-blue-600 tabular-nums">{form.musicVolume}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={5}
                                            value={form.musicVolume}
                                            onChange={(e) => setForm({ ...form, musicVolume: Number(e.target.value) })}
                                            className="w-full accent-blue-600 cursor-pointer"
                                        />
                                        <div className="flex gap-1 shrink-0">
                                            {[0, 30, 60].map((v) => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, musicVolume: v })}
                                                    className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                                                        form.musicVolume === v
                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {v === 0 ? 'Mute' : `${v}%`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Tip: Pick a specific room from the dropdown above (e.g. <b>Room 101 Override</b>) to control music and volume for that individual room, or use <b>All Rooms</b>.
                            </p>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default RoomTvManager;
