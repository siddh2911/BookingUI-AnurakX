import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { API_BASE_URL } from '../../constants/api';
import { Calendar, Clock, KeyRound, MapPin, Sparkles, ShieldCheck, MessageCircle, Lock, Check, Wifi, Maximize2 } from 'lucide-react';

interface TvBooking {
  id: string;
  guestFirstName: string;
  checkIn: string;  // yyyy-MM-dd
  checkout: string; // yyyy-MM-dd
}

interface TvPayload {
  property: {
    name: string;
    area: string;
    hostFirstName: string;
    whatsapp: string;
    template: string;
    timeZone: string;
  };
  screen: {
    tagline: string;
    wifiName: string;
    wifiPassword: string;
    wifiSecurity: string;
    checkInTime: string;
    checkoutTime: string;
    quietHoursFrom: string;
    quietHoursTo: string;
    welcomeMessage: string;
    checkoutMessage: string;
    betweenStaysMessage: string;
    amenities: string[];
    houseRules: string[];
    checkoutSteps: string[];
    contactNote: string;
  };
  photos?: {
    stay?: string | null;
    checkout?: string | null;
    vacant?: string | null;
  };
  bookings: TvBooking[];
  tv?: {
    name?: string;
    roomNumber?: string;
    version?: number;
  };
}

type ScreenMode = 'stay' | 'checkout' | 'vacant';

const LS_TOKEN = 'karuna_tv_token';
const LS_CACHE = 'karuna_tv_cache';
const LS_DEVICE_ID = 'karuna_tv_device_id';

const OFFLINE_DEFAULT: TvPayload = {
  property: {
    name: 'Karuna Villa',
    area: 'Rishikesh, India',
    hostFirstName: 'Karuna Villa',
    whatsapp: '',
    template: 'villa',
    timeZone: 'Asia/Kolkata',
  },
  screen: {
    tagline: 'Peaceful mountain retreat surrounded by nature',
    wifiName: '',
    wifiPassword: '',
    wifiSecurity: 'WPA',
    checkInTime: '14:00',
    checkoutTime: '11:00',
    quietHoursFrom: '22:00',
    quietHoursTo: '08:00',
    welcomeMessage: 'Welcome, {name}!\nMake yourself at home. We hope you have a relaxing and memorable stay.',
    checkoutMessage: 'Good morning, {name}.\nThank you for staying with us. A few quick reminders before you head out:',
    betweenStaysMessage: 'Welcome!\nMake yourself at home. We hope you have a relaxing and memorable stay.',
    amenities: ['Fast Wi-Fi', 'Smart TV', 'Air conditioning', 'Private Terrace'],
    houseRules: ['No smoking inside rooms', 'Please turn off AC when stepping out'],
    checkoutSteps: ['Turn off lights and air conditioning', 'Close all windows and doors', 'Return keys to reception or lockbox'],
    contactNote: 'Please reach out to reception or your host any time if you need assistance.',
  },
  bookings: [],
};

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(LS_DEVICE_ID);
    if (existing) return existing;
    const id = 'web_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(LS_DEVICE_ID, id);
    return id;
  } catch {
    return 'web_tv';
  }
}

function formatInZone(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: timeZone || undefined }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', opts).format(date);
  }
}

function todayYmd(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year')?.value || '2026';
  const m = parts.find(p => p.type === 'month')?.value || '01';
  const d = parts.find(p => p.type === 'day')?.value || '01';
  return `${y}-${m}-${d}`;
}

function nowHm(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || undefined,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const h = parts.find(p => p.type === 'hour')?.value || '00';
  const m = parts.find(p => p.type === 'minute')?.value || '00';
  return `${h}:${m}`;
}

function formatHm12(hm: string): string {
  if (!hm || !hm.includes(':')) return hm || '';
  const [hRaw, mRaw] = hm.split(':').map(Number);
  if (isNaN(hRaw) || isNaN(mRaw)) return hm;
  const ap = hRaw >= 12 ? 'PM' : 'AM';
  const h = hRaw % 12 || 12;
  return `${h}:${String(mRaw).padStart(2, '0')} ${ap}`;
}

function formatShortDate(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12));
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(dt);
}

function nightsBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.max(1, Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000));
}

function applyName(template: string, guestFirstName: string): { headline: string; body: string } {
  const name = (guestFirstName || '').trim();
  const filled = name
    ? template.replace(/\{name\}/gi, name)
    : template
        .replace(/,\s*\{name\}/gi, '')
        .replace(/\s+\{name\}/gi, '')
        .replace(/\{name\}/gi, '');
  const lines = filled.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return {
    headline: lines[0] || 'Welcome!',
    body: lines.slice(1).join(' '),
  };
}

function wifiEscape(s: string): string {
  return (s || '').replace(/([\\;,:"])/g, '\\$1');
}

function selectScreen(payload: TvPayload, now: Date): { mode: ScreenMode; booking?: TvBooking } {
  const tz = payload.property?.timeZone || 'Asia/Kolkata';
  const today = todayYmd(now, tz);
  const hm = nowHm(now, tz);
  const checkoutTime = payload.screen?.checkoutTime || '11:00';
  const bookings = payload.bookings || [];

  // Checkout morning: booking ends today and it's before checkoutTime
  const departing = bookings.find(b => b.checkout === today);
  if (departing && hm < checkoutTime) {
    return { mode: 'checkout', booking: departing };
  }
  // Active stay: checkIn <= today < checkout
  const active = bookings.find(b => b.checkIn <= today && today < b.checkout);
  if (active) {
    return { mode: 'stay', booking: active };
  }
  return { mode: 'vacant' };
}

function resolvePhotoUrl(payload: TvPayload, mode: ScreenMode): string {
  const custom = mode === 'stay'
    ? payload.photos?.stay
    : mode === 'checkout'
      ? payload.photos?.checkout
      : payload.photos?.vacant;
  if (custom && custom.trim()) {
    if (custom.startsWith('http://') || custom.startsWith('https://')) return custom;
    return `${API_BASE_URL}${custom.startsWith('/') ? '' : '/'}${custom}`;
  }
  const tpl = ['villa', 'room', 'apartment'].includes((payload.property?.template || '').toLowerCase())
    ? payload.property.template.toLowerCase()
    : 'villa';
  return `/tv-bg/bg_${tpl}_${mode}.jpg`;
}

const TvDisplayPage: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const directRoom = params.get('room') || params.get('roomNumber') || '';
  const directHotel = params.get('hotelId') || '';

  const [scale, setScale] = useState(1);
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState<'pairing' | 'welcome'>(() => {
    if (directRoom) return 'welcome';
    try {
      return localStorage.getItem(LS_TOKEN) ? 'welcome' : 'pairing';
    } catch {
      return 'pairing';
    }
  });
  const [pairCode, setPairCode] = useState<string>('');
  const [pairStatus, setPairStatus] = useState<string>('Connecting…');
  const [payload, setPayload] = useState<TvPayload>(() => {
    try {
      const cached = localStorage.getItem(LS_CACHE);
      if (cached) return JSON.parse(cached);
    } catch { /* ignore */ }
    return OFFLINE_DEFAULT;
  });
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [cursorIdle, setCursorIdle] = useState(false);

  const pairingIdRef = useRef<string | null>(null);
  const pairingExpRef = useRef<number>(0);

  // Responsive 1280x720 stage scaling for 720p / 1080p / 4K TVs
  useEffect(() => {
    const fit = () => {
      const k = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
      setScale(k > 0 ? k : 1);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Clock tick every second
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Keep TV screen awake where supported (Wake Lock API)
  useEffect(() => {
    let lock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          lock = await (navigator as any).wakeLock.request('screen');
        }
      } catch { /* unsupported or blocked */ }
    };
    requestWakeLock();
    const onVis = () => { if (document.visibilityState === 'visible') requestWakeLock(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (lock && lock.release) lock.release().catch(() => {});
    };
  }, []);

  // Auto-hide cursor on TV after 3s idle & F-key fullscreen toggle
  useEffect(() => {
    let t: number;
    const reset = () => {
      setCursorIdle(false);
      window.clearTimeout(t);
      t = window.setTimeout(() => setCursorIdle(true), 3000);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
        else document.exitFullscreen?.().catch(() => {});
      }
    };
    reset();
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Main sync loop: either pairing (first-time setup) or polling GET /api/tv/screen every 5s
  useEffect(() => {
    let cancelled = false;
    let timer: number;

    const schedule = (fn: () => void, ms: number) => {
      if (!cancelled) timer = window.setTimeout(fn, ms);
    };

    const startPairing = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/tv/pairing-codes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            deviceId: getOrCreateDeviceId(),
            deviceName: 'Hisense VIDAA TV',
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        pairingIdRef.current = data.pairingId;
        pairingExpRef.current = Date.now() + (data.expiresInSeconds || 600) * 1000;
        setPairCode(data.code || '');
        setPairStatus('Waiting for the dashboard…');
        setView('pairing');
        schedule(pollPairing, 3000);
      } catch {
        if (cancelled) return;
        // Internet issue on startup: show graceful offline default screen while retrying silently
        setView('welcome');
        schedule(startPairing, 5000);
      }
    };

    const pollPairing = async () => {
      if (cancelled || !pairingIdRef.current) return;
      if (Date.now() > pairingExpRef.current) {
        startPairing();
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/tv/pairing-codes/${encodeURIComponent(pairingIdRef.current)}`, {
          headers: { Accept: 'application/json' },
        });
        if (res.status === 404 || res.status === 410) {
          startPairing();
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.status === 'linked' && data.tvToken) {
          localStorage.setItem(LS_TOKEN, data.tvToken);
          pairingIdRef.current = null;
          setView('welcome');
          fetchScreen();
        } else if (data.status === 'expired') {
          startPairing();
        } else {
          setPairStatus('Waiting for the dashboard…');
          schedule(pollPairing, 3000);
        }
      } catch {
        schedule(pollPairing, 5000);
      }
    };

    const fetchScreen = async () => {
      if (cancelled) return;
      const token = localStorage.getItem(LS_TOKEN);
      if (!directRoom && !token) {
        startPairing();
        return;
      }
      try {
        let url = `${API_BASE_URL}/api/tv/screen`;
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (directRoom) {
          const qs = new URLSearchParams();
          qs.set('roomNumber', directRoom);
          if (directHotel) qs.set('hotelId', directHotel);
          url += `?${qs.toString()}`;
        } else if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(url, { headers, cache: 'no-store' });
        if ((res.status === 401 || res.status === 403) && !directRoom) {
          localStorage.removeItem(LS_TOKEN);
          localStorage.removeItem(LS_CACHE);
          setPayload(OFFLINE_DEFAULT);
          startPairing();
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TvPayload = await res.json();
        if (cancelled) return;
        setPayload(data);
        setView('welcome');
        try { localStorage.setItem(LS_CACHE, JSON.stringify(data)); } catch { /* ignore */ }
        schedule(fetchScreen, 5000);
      } catch {
        // Offline: keep showing cached or default welcome screen and retry silently
        setView('welcome');
        schedule(fetchScreen, 5000);
      }
    };

    if (directRoom || localStorage.getItem(LS_TOKEN)) {
      fetchScreen();
    } else {
      startPairing();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [directRoom, directHotel]);

  const selection = useMemo(() => selectScreen(payload, now), [payload, now]);
  const mode = selection.mode;
  const activeBooking = selection.booking;
  const tz = payload.property?.timeZone || 'Asia/Kolkata';

  const { headline, body } = useMemo(() => {
    const s = payload.screen;
    if (mode === 'stay') return applyName(s.welcomeMessage || 'Welcome, {name}!', activeBooking?.guestFirstName || '');
    if (mode === 'checkout') return applyName(s.checkoutMessage || 'Good morning, {name}.', activeBooking?.guestFirstName || '');
    return applyName(s.betweenStaysMessage || 'Welcome!', '');
  }, [payload, mode, activeBooking]);

  const photoUrl = useMemo(() => resolvePhotoUrl(payload, mode), [payload, mode]);

  // Generate crisp QR data URL (Wi-Fi QR on stay/vacant, WhatsApp QR on checkout)
  const qrPayload = useMemo(() => {
    if (mode === 'checkout') {
      const digits = (payload.property?.whatsapp || '').replace(/[^\d]/g, '');
      return digits ? `https://wa.me/${digits}` : '';
    }
    const net = (payload.screen?.wifiName || '').trim();
    if (!net) return '';
    const sec = payload.screen?.wifiSecurity || 'WPA';
    const pw = payload.screen?.wifiPassword || '';
    return `WIFI:T:${sec};S:${wifiEscape(net)};P:${wifiEscape(pw)};;`;
  }, [payload, mode]);

  useEffect(() => {
    let active = true;
    if (!qrPayload) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 1,
      color: { dark: '#17141f', light: '#fffdf9' },
    })
      .then(url => { if (active) setQrDataUrl(url); })
      .catch(() => { if (active) setQrDataUrl(''); });
    return () => { active = false; };
  }, [qrPayload]);

  const timeParts = useMemo(() => {
    const full = formatInZone(now, tz, { hour: 'numeric', minute: '2-digit', hour12: true });
    const match = full.match(/^([\d:]+)\s*(.*)$/);
    return { digits: match ? match[1] : full, ap: match ? match[2] : '' };
  }, [now, tz]);

  const dateText = useMemo(
    () => formatInZone(now, tz, { weekday: 'long', month: 'long', day: 'numeric' }),
    [now, tz]
  );

  const rulesList = useMemo(() => {
    const list = [...(payload.screen?.houseRules || [])];
    if (payload.screen?.quietHoursFrom && payload.screen?.quietHoursTo) {
      const q = `Quiet hours ${formatHm12(payload.screen.quietHoursFrom)} to ${formatHm12(payload.screen.quietHoursTo)}`;
      if (!list.some(r => r.toLowerCase().includes('quiet hours'))) list.push(q);
    }
    return list.slice(0, 4);
  }, [payload]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#07070b',
        overflow: 'hidden',
        cursor: cursorIdle ? 'none' : 'default',
        fontFamily: "'Manrope', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        color: '#faf7f2',
      }}
    >
      <style>{`
        @keyframes tvKenBurns {
          0% { transform: scale(1.0) translate(0%, 0%); }
          100% { transform: scale(1.075) translate(-1.6%, -0.8%); }
        }
        @keyframes tvPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.6); opacity: 0.35; }
        }
        @keyframes tvRing {
          0% { transform: scale(0.78); opacity: 0.8; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes tvFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tv-serif { font-family: 'Playfair Display', Georgia, serif; font-weight: 600; letter-spacing: -0.02em; }
        .tv-glass {
          background: linear-gradient(155deg, rgba(22,19,28,0.58), rgba(11,10,15,0.46));
          border: 1px solid rgba(255,247,235,0.15);
          box-shadow: inset 0 1px 0 rgba(255,250,242,0.18), 0 24px 50px -22px rgba(0,0,0,0.65);
          -webkit-backdrop-filter: blur(24px) saturate(145%);
          backdrop-filter: blur(24px) saturate(145%);
        }
      `}</style>

      {/* 1280x720 TV Stage scaled cleanly to any TV resolution */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1280,
          height: 720,
          marginLeft: -640,
          marginTop: -360,
          transform: `scale(${scale})`,
          transformOrigin: '50% 50%',
          overflow: 'hidden',
          background: '#09080d',
        }}
      >
        {view === 'pairing' ? (
          /* -------------------- FIRST-SETUP PAIRING SCREEN -------------------- */
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              background: 'radial-gradient(ellipse 88% 76% at 50% 34%, #1c1932 0%, #100e1c 48%, #07070c 100%)',
            }}
          >
            <div style={{ position: 'absolute', width: 720, height: 720, left: -180, top: -240, borderRadius: '50%', filter: 'blur(32px)', background: 'radial-gradient(circle, rgba(232,197,148,0.20), rgba(233,114,84,0.08) 45%, transparent 68%)' }} />
            <div style={{ position: 'absolute', width: 780, height: 780, right: -220, bottom: -300, borderRadius: '50%', filter: 'blur(32px)', background: 'radial-gradient(circle, rgba(138,146,226,0.22), transparent 68%)' }} />

            <div style={{ position: 'relative', width: 140, height: 140, display: 'grid', placeItems: 'center' }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(232,197,148,0.32)', animation: 'tvRing 3.6s ease-out infinite' }} />
              <span style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,247,235,0.14), rgba(255,247,235,0.03) 72%)', border: '1px solid rgba(255,247,235,0.16)' }} />
              <div className="tv-serif" style={{ position: 'relative', fontSize: 42, color: '#faf7f2', letterSpacing: '0.04em', textShadow: '0 4px 20px rgba(232,197,148,0.45)' }}>
                KV
              </div>
            </div>

            <div style={{ marginTop: 20, fontSize: 12, fontWeight: 800, letterSpacing: '0.26em', textTransform: 'uppercase', color: '#e8c594' }}>
              Karuna Villa
            </div>
            <h2 className="tv-serif" style={{ fontSize: 56, margin: '8px 0 10px', color: '#faf7f2' }}>
              Link this TV
            </h2>
            <p style={{ fontSize: 19, color: 'rgba(248,244,238,0.84)', maxWidth: 660, lineHeight: 1.5, margin: 0 }}>
              Open Admin → Rooms → Room TVs and enter this 6-character code once to pair this room.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 34 }}>
              {(pairCode || '------').split('').map((ch, i) => (
                <React.Fragment key={i}>
                  {i === 3 && <span style={{ display: 'block', width: 14, height: 3, borderRadius: 3, background: 'rgba(232,197,148,0.48)', margin: '0 6px' }} />}
                  <span
                    style={{
                      width: 100,
                      height: 128,
                      borderRadius: 22,
                      background: 'linear-gradient(180deg, #fffdf9 0%, #f2ebe0 100%)',
                      color: '#16131f',
                      fontWeight: 800,
                      fontSize: 66,
                      lineHeight: '122px',
                      position: 'relative',
                      boxShadow: '0 26px 46px -22px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,250,242,0.7)',
                    }}
                  >
                    {ch}
                    <span style={{ position: 'absolute', left: 26, right: 26, bottom: 14, height: 3.5, borderRadius: 4, background: 'linear-gradient(90deg, #e8c594, #e97254)' }} />
                  </span>
                </React.Fragment>
              ))}
            </div>

            <div className="tv-glass" style={{ marginTop: 32, padding: '10px 22px 10px 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 600 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e8c594', boxShadow: '0 0 12px rgba(232,197,148,0.8)', animation: 'tvPulse 1.6s ease-in-out infinite' }} />
              <span>{pairStatus}</span>
            </div>
          </div>
        ) : (
          /* -------------------- PREMIUM WELCOME SCREEN -------------------- */
          <div style={{ position: 'absolute', inset: 0, animation: 'tvFadeIn 0.7s ease-out' }}>
            {/* Background photo with smooth Ken Burns drift */}
            <img
              key={photoUrl}
              src={photoUrl}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'brightness(0.96) contrast(1.04) saturate(1.06)',
                animation: 'tvKenBurns 30s ease-in-out infinite alternate',
              }}
            />

            {/* Warm cinematic scrim */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  'radial-gradient(110% 95% at 0% 34%, rgba(9,8,13,0.86) 0%, rgba(9,8,13,0.50) 44%, rgba(9,8,13,0.04) 78%),' +
                  'linear-gradient(0deg, rgba(9,8,13,0.88) 0%, rgba(9,8,13,0.38) 28%, rgba(9,8,13,0) 54%),' +
                  'linear-gradient(180deg, rgba(9,8,13,0.56) 0%, rgba(9,8,13,0) 24%),' +
                  'linear-gradient(90deg, rgba(9,8,13,0.26) 0%, rgba(9,8,13,0.06) 60%, rgba(9,8,13,0.22) 100%)',
                boxShadow: 'inset 0 0 110px rgba(7,6,11,0.42)',
              }}
            />

            {/* Top Bar */}
            <div style={{ position: 'absolute', left: 64, right: 64, top: 36, display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span
                  className="tv-serif"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 17,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 23,
                    letterSpacing: '0.03em',
                    color: '#faf7f2',
                    background: 'linear-gradient(145deg, rgba(232,197,148,0.26), rgba(233,114,84,0.22) 60%, rgba(22,19,28,0.58))',
                    border: '1px solid rgba(255,244,226,0.30)',
                    boxShadow: '0 12px 28px -10px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,250,240,0.35)',
                    backdropFilter: 'blur(18px)',
                  }}
                >
                  KV
                </span>
                <div>
                  <div className="tv-serif" style={{ fontSize: 30, lineHeight: 1.06, color: '#faf7f2', textShadow: '0 2px 18px rgba(0,0,0,0.35)' }}>
                    {payload.property?.name || 'Karuna Villa'}
                  </div>
                  {payload.screen?.tagline && (
                    <div style={{ fontSize: 16.5, color: 'rgba(248,244,238,0.88)', marginTop: 4, fontWeight: 500 }}>
                      {payload.screen.tagline}
                    </div>
                  )}
                  {payload.property?.area && (
                    <div style={{ fontSize: 14, color: 'rgba(243,237,229,0.74)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <MapPin size={14} color="#e8c594" />
                      <span>{payload.property.area}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Clock */}
              <div className="tv-glass" style={{ marginLeft: 'auto', textAlign: 'right', padding: '12px 22px 13px 24px', borderRadius: 22 }}>
                <div className="tv-serif" style={{ fontSize: 40, lineHeight: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', fontVariantNumeric: 'tabular-nums' }}>
                  <span>{timeParts.digits}</span>
                  {timeParts.ap && (
                    <span style={{ fontFamily: 'inherit', fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', color: '#e8c594', marginLeft: 5 }}>
                      {timeParts.ap}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(243,237,229,0.74)', marginTop: 7, fontWeight: 600 }}>
                  {dateText}
                </div>
              </div>
            </div>

            {/* Hero Column */}
            <div style={{ position: 'absolute', left: 64, top: mode === 'checkout' ? 142 : 164, width: 780 }}>
              <div style={{ width: 46, height: 3, borderRadius: 3, background: 'linear-gradient(90deg, #e8c594, #e97254)', marginBottom: 18, boxShadow: '0 0 14px rgba(232,197,148,0.45)' }} />
              <h1
                className="tv-serif"
                style={{
                  fontSize: headline.length > 40 ? 44 : headline.length > 26 ? 52 : 62,
                  lineHeight: 1.03,
                  margin: 0,
                  color: '#faf7f2',
                  textShadow: '0 6px 34px rgba(0,0,0,0.42)',
                }}
              >
                {headline}
              </h1>
              {body && (
                <p style={{ fontSize: 20.5, lineHeight: 1.54, color: 'rgba(248,244,238,0.88)', margin: '16px 0 0', maxWidth: 600 }}>
                  {body}
                </p>
              )}

              {/* Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26 }}>
                {mode === 'stay' && activeBooking && (
                  <>
                    <span className="tv-glass" style={{ padding: '10px 18px 10px 14px', borderRadius: 999, fontSize: 17, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <Calendar size={18} color="#e8c594" />
                      {formatShortDate(activeBooking.checkIn)} to {formatShortDate(activeBooking.checkout)} · {nightsBetween(activeBooking.checkIn, activeBooking.checkout)} nights
                    </span>
                    <span
                      style={{
                        padding: '10px 18px 10px 14px',
                        borderRadius: 999,
                        fontSize: 17,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'linear-gradient(135deg, #f0a46b, #e46d52 62%, #cf5656)',
                        border: '1px solid rgba(255,246,232,0.34)',
                        boxShadow: '0 14px 30px -12px rgba(228,109,82,0.68)',
                      }}
                    >
                      <Clock size={18} color="#fffdf9" />
                      Checkout {formatShortDate(activeBooking.checkout).split(',')[0]} {formatHm12(payload.screen?.checkoutTime || '11:00')}
                    </span>
                  </>
                )}

                {mode === 'checkout' && (
                  <span
                    style={{
                      padding: '10px 18px 10px 14px',
                      borderRadius: 999,
                      fontSize: 17,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      background: 'linear-gradient(135deg, #f0a46b, #e46d52 62%, #cf5656)',
                      border: '1px solid rgba(255,246,232,0.34)',
                      boxShadow: '0 14px 30px -12px rgba(228,109,82,0.68)',
                    }}
                  >
                    <Clock size={18} color="#fffdf9" />
                    Checkout today by {formatHm12(payload.screen?.checkoutTime || '11:00')}
                  </span>
                )}

                {mode === 'vacant' && (
                  <>
                    <span className="tv-glass" style={{ padding: '10px 18px 10px 14px', borderRadius: 999, fontSize: 17, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <KeyRound size={18} color="#e8c594" />
                      Check-in from {formatHm12(payload.screen?.checkInTime || '14:00')}
                    </span>
                    <span className="tv-glass" style={{ padding: '10px 18px 10px 14px', borderRadius: 999, fontSize: 17, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <Clock size={18} color="#e8c594" />
                      Checkout by {formatHm12(payload.screen?.checkoutTime || '11:00')}
                    </span>
                  </>
                )}
              </div>

              {/* Checkout Checklist */}
              {mode === 'checkout' && (payload.screen?.checkoutSteps || []).length > 0 && (
                <div className="tv-glass" style={{ marginTop: 22, padding: '18px 24px', borderRadius: 24, display: 'grid', gap: 10, maxWidth: 620 }}>
                  {payload.screen.checkoutSteps.slice(0, 5).map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 19, fontWeight: 500, color: '#f6f2ec' }}>
                      <span style={{ width: 32, height: 32, borderRadius: 11, background: 'linear-gradient(145deg, rgba(232,197,148,0.24), rgba(233,114,84,0.12))', border: '1px solid rgba(232,197,148,0.48)', color: '#f3d7ad', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15, flex: 'none' }}>
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Floating Card (Wi-Fi or Checkout WhatsApp) */}
            {(mode === 'checkout' || payload.screen?.wifiName) && (
              <aside className="tv-glass" style={{ position: 'absolute', right: 64, top: 150, width: 298, borderRadius: 28, padding: '18px 22px', textAlign: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 28, right: 28, top: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(232,197,148,0.5), transparent)' }} />
                <h4 style={{ margin: '0 0 14px', fontSize: 12.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#e8c594', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,251,245,0.94)', display: 'grid', placeItems: 'center', color: '#1c1826' }}>
                    {mode === 'checkout' ? <Clock size={15} /> : <Wifi size={15} />}
                  </span>
                  {mode === 'checkout' ? 'Checkout' : 'Join the Wi-Fi'}
                </h4>

                {mode === 'checkout' && (
                  <div className="tv-serif" style={{ fontSize: 44, lineHeight: 1, marginBottom: 14, color: '#faf7f2' }}>
                    {formatHm12(payload.screen?.checkoutTime || '11:00')}
                  </div>
                )}

                {qrDataUrl && (
                  <div style={{ background: '#fffdf9', borderRadius: 18, padding: 9, display: 'inline-block', boxShadow: '0 16px 34px -16px rgba(0,0,0,0.72), 0 0 0 5px rgba(255,247,235,0.07)' }}>
                    <img src={qrDataUrl} alt="QR Code" style={{ width: mode === 'checkout' ? 124 : 144, height: mode === 'checkout' ? 124 : 144, display: 'block' }} />
                  </div>
                )}

                {mode !== 'checkout' && payload.screen?.wifiName && (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 18.5, marginTop: 13, color: '#faf7f2' }}>
                      {payload.screen.wifiName}
                    </div>
                    {payload.screen?.wifiPassword && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 14.5, fontWeight: 600, color: '#f4efe8', background: 'rgba(255,247,235,0.09)', border: '1px solid rgba(255,247,235,0.15)', padding: '6px 13px', borderRadius: 11 }}>
                        <Lock size={14} color="#e8c594" />
                        <span>Password: {payload.screen.wifiPassword}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 12.5, color: 'rgba(243,237,229,0.66)', marginTop: 9 }}>
                      Point your phone camera at the code
                    </div>
                  </>
                )}

                {mode === 'checkout' && (
                  <div style={{ fontSize: 13.5, color: 'rgba(243,237,229,0.8)', marginTop: 12, fontWeight: 600 }}>
                    {qrDataUrl ? `Scan to message ${payload.property?.hostFirstName || 'your host'} on WhatsApp` : 'Safe travels!'}
                  </div>
                )}
              </aside>
            )}

            {/* Footer Panels (Stay & Vacant modes) */}
            {mode !== 'checkout' && (
              <div style={{ position: 'absolute', left: 64, right: 64, bottom: 34, display: 'grid', gridTemplateColumns: '1.32fr 1fr 1.06fr', gap: 18 }}>
                {/* Amenities */}
                <div className="tv-glass" style={{ borderRadius: 22, padding: '15px 20px', minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 11px', fontSize: 12, color: '#e8c594', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={14} /> Amenities
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {(payload.screen?.amenities || []).slice(0, 6).map((a, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,247,235,0.08)', border: '1px solid rgba(255,247,235,0.12)', padding: '5px 11px 5px 9px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#f4efe8' }}>
                        <Check size={12} color="#9cdbb5" strokeWidth={3} />
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* House Rules */}
                <div className="tv-glass" style={{ borderRadius: 22, padding: '15px 20px', minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 11px', fontSize: 12, color: '#e8c594', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={14} /> House Rules
                  </h4>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {rulesList.map((r, i) => (
                      <li key={i} style={{ marginBottom: 6, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(248,244,238,0.9)', fontWeight: 500 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e8c594', flex: 'none' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Host */}
                <div className="tv-glass" style={{ borderRadius: 22, padding: '15px 20px', minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 11px', fontSize: 12, color: '#e8c594', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageCircle size={14} /> Your Host
                  </h4>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <span className="tv-serif" style={{ flex: 'none', width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 20, color: '#17131d', background: 'linear-gradient(145deg, #f3d9b1, #f2a66d)', boxShadow: '0 0 0 2.5px rgba(255,247,235,0.16)' }}>
                      {(payload.property?.hostFirstName || 'K').charAt(0).toUpperCase()}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ display: 'block', fontSize: 16.5, color: '#faf7f2' }}>
                        {payload.property?.hostFirstName || payload.property?.name || 'Host'}
                      </b>
                      {payload.property?.whatsapp && (
                        <span style={{ display: 'block', fontSize: 13, color: '#e8c594', fontWeight: 600, marginTop: 2 }}>
                          WhatsApp {payload.property.whatsapp}
                        </span>
                      )}
                      {payload.screen?.contactNote && (
                        <p style={{ color: 'rgba(243,237,229,0.74)', fontSize: 13.5, lineHeight: 1.4, margin: '5px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {payload.screen.contactNote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtle Fullscreen button (only visible when cursor moves) */}
      {!cursorIdle && (
        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen (F)"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            zIndex: 50,
            padding: '8px 12px',
            borderRadius: 10,
            background: 'rgba(18,16,24,0.75)',
            border: '1px solid rgba(255,247,235,0.2)',
            color: '#faf7f2',
            fontSize: 12,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
        >
          <Maximize2 size={14} /> Fullscreen
        </button>
      )}
    </div>
  );
};

export default TvDisplayPage;
