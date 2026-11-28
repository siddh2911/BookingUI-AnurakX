import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bell,
  LogIn,
  LogOut,
  Phone,
  CreditCard,
  MessageCircle,
  Sparkles,
  Droplets,
  CheckCircle2,
  RotateCcw,
  Clock,
  Users,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Booking, BookingStatus, Room, HousekeepingTask } from '../../types';
import PlatformIcon from '../common/PlatformIcon';
import { useTheme } from '../../hooks/useTheme';

interface TodayBoardProps {
  isAdmin?: boolean;
  bookings: Booking[];
  upcomingArrivals: Booking[];
  upcomingDepartures: Booking[];
  rooms: Room[];
  housekeepingTasks: HousekeepingTask[];
  today: string;
  onEditBooking: (booking: Booking, isViewOnly?: boolean) => void;
  onUpdateStatus?: (bookingId: string, status: BookingStatus) => Promise<void> | void;
  onAddPayment?: (booking: Booking) => Promise<void> | void;
  onSendReviewRequest?: (booking: Booking) => void;
  onMarkRoomClean?: (room: Room) => Promise<void> | void;
}

type BoardTab = 'arrivals' | 'departures' | 'inhouse';

interface PendingAction {
  bookingId: string;
  guestName: string;
  roomNumber: string;
  previousStatus: BookingStatus;
  nextStatus: BookingStatus;
  timerId: ReturnType<typeof setTimeout>;
}

const TodayBoard: React.FC<TodayBoardProps> = ({
  isAdmin = true,
  bookings,
  upcomingArrivals,
  upcomingDepartures,
  rooms,
  housekeepingTasks,
  today,
  onEditBooking,
  onUpdateStatus,
  onAddPayment,
  onSendReviewRequest,
  onMarkRoomClean,
}) => {
  const { theme } = useTheme();
  const night = theme === 'night';

  const [activeTab, setActiveTab] = useState<BoardTab>('arrivals');
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, BookingStatus>>({});
  const [cleaningRoomId, setCleaningRoomId] = useState<number | null>(null);
  const [pendingToast, setPendingToast] = useState<{
    bookingId: string;
    label: string;
    nextStatus: BookingStatus;
  } | null>(null);

  const pendingActionRef = useRef<PendingAction | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const updateScrollButtons = () => {
    const el = carouselRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    const firstCard = el.firstElementChild as HTMLElement | null;
    if (firstCard && firstCard.offsetWidth > 0) {
      const idx = Math.round(el.scrollLeft / (firstCard.offsetWidth + 16));
      setActiveCardIndex(Math.max(0, idx));
    }
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    const el = carouselRef.current;
    if (!el) return;
    const delta = Math.max(320, el.clientWidth * 0.8);
    el.scrollBy({ left: direction === 'right' ? delta : -delta, behavior: 'smooth' });
  };

  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [today]);

  // Flush any pending optimistic action on unmount so changes aren't silently dropped
  useEffect(() => {
    return () => {
      if (pendingActionRef.current) {
        clearTimeout(pendingActionRef.current.timerId);
        const { bookingId, nextStatus } = pendingActionRef.current;
        pendingActionRef.current = null;
        onUpdateStatus?.(bookingId, nextStatus);
      }
    };
  }, [onUpdateStatus]);

  const getEffectiveStatus = (b: Booking): BookingStatus =>
    optimisticStatuses[String(b.id)] ?? b.status;

  const getRoomForBooking = (b: Booking): Room | undefined =>
    rooms.find(r => String(r.id) === String(b.roomId));

  const isRoomDirty = (room?: Room): boolean => {
    if (!room) return false;
    const task = housekeepingTasks.find(t => String(t.roomId) === String(room.id));
    if (task) {
      return task.status === 'Dirty' || task.status === 'Cleaning in Progress';
    }
    return String(room.cleanStatus || '').toUpperCase() === 'DIRTY';
  };

  const getPendingBalance = (b: Booking): number => {
    if (typeof b.pendingBalance === 'number') return Math.max(0, b.pendingBalance);
    const total = b.totalAmount ?? 0;
    const paid = b.totalPaid ?? b.advanceAmount ?? 0;
    return Math.max(0, total - paid);
  };

  // Build Arrivals, Departures, and In-House lists with optimistic status applied
  const { arrivalsList, departuresList, inHouseList } = useMemo(() => {
    const isActive = (s: BookingStatus) =>
      s !== BookingStatus.CANCELLED && s !== BookingStatus.NO_SHOW;

    const arrivalMap = new Map<string, Booking>();
    [...upcomingArrivals, ...bookings].forEach(b => {
      const eff = getEffectiveStatus(b);
      if (!isActive(eff) || eff === BookingStatus.CHECKED_OUT) return;
      if (b.checkInDate >= today) {
        arrivalMap.set(String(b.id), b);
      }
    });
    const arrivals = Array.from(arrivalMap.values()).sort((a, b) =>
      a.checkInDate.localeCompare(b.checkInDate)
    );

    const depMap = new Map<string, Booking>();
    [...upcomingDepartures, ...bookings].forEach(b => {
      const eff = getEffectiveStatus(b);
      if (!isActive(eff)) return;
      if (b.checkOutDate === today) {
        depMap.set(String(b.id), b);
      }
    });
    const departures = Array.from(depMap.values()).sort((a, b) => {
      const aOut = getEffectiveStatus(a) === BookingStatus.CHECKED_OUT ? 1 : 0;
      const bOut = getEffectiveStatus(b) === BookingStatus.CHECKED_OUT ? 1 : 0;
      return aOut - bOut;
    });

    const inhouse = bookings
      .filter(b => {
        const eff = getEffectiveStatus(b);
        if (!isActive(eff) || eff === BookingStatus.CHECKED_OUT) return false;
        if (eff === BookingStatus.CHECKED_IN) return true;
        return b.checkInDate <= today && b.checkOutDate > today;
      })
      .sort((a, b) => a.checkOutDate.localeCompare(b.checkOutDate));

    return {
      arrivalsList: arrivals,
      departuresList: departures,
      inHouseList: inhouse,
    };
  }, [bookings, upcomingArrivals, upcomingDepartures, today, optimisticStatuses]);

  const commitPendingActionNow = async () => {
    const pending = pendingActionRef.current;
    if (!pending) return;
    clearTimeout(pending.timerId);
    pendingActionRef.current = null;
    setPendingToast(null);
    try {
      await onUpdateStatus?.(pending.bookingId, pending.nextStatus);
    } finally {
      setOptimisticStatuses(prev => {
        const copy = { ...prev };
        delete copy[pending.bookingId];
        return copy;
      });
    }
  };

  const triggerOptimisticStatus = (booking: Booking, nextStatus: BookingStatus) => {
    if (!isAdmin || !onUpdateStatus) return;

    if (pendingActionRef.current) {
      void commitPendingActionNow();
    }

    const bookingId = String(booking.id);
    const previousStatus = getEffectiveStatus(booking);
    const room = getRoomForBooking(booking);
    const roomNumber = room?.number || String(booking.roomId);

    setOptimisticStatuses(prev => ({ ...prev, [bookingId]: nextStatus }));

    const verb = nextStatus === BookingStatus.CHECKED_IN ? 'Checked in' : 'Checked out';
    setPendingToast({
      bookingId,
      label: `${verb} ${booking.guestName} (Room ${roomNumber})`,
      nextStatus,
    });

    const timerId = setTimeout(async () => {
      pendingActionRef.current = null;
      setPendingToast(null);
      try {
        await onUpdateStatus(bookingId, nextStatus);
      } finally {
        setOptimisticStatuses(prev => {
          const copy = { ...prev };
          delete copy[bookingId];
          return copy;
        });
      }
    }, 5000);

    pendingActionRef.current = {
      bookingId,
      guestName: booking.guestName,
      roomNumber,
      previousStatus,
      nextStatus,
      timerId,
    };
  };

  const handleUndo = () => {
    const pending = pendingActionRef.current;
    if (!pending) return;
    clearTimeout(pending.timerId);
    pendingActionRef.current = null;
    setPendingToast(null);
    setOptimisticStatuses(prev => {
      const copy = { ...prev };
      delete copy[pending.bookingId];
      return copy;
    });
  };

  const handleQuickClean = async (room: Room) => {
    if (!onMarkRoomClean) return;
    setCleaningRoomId(room.id);
    try {
      await onMarkRoomClean(room);
    } finally {
      setCleaningRoomId(null);
    }
  };

  const activeRows =
    activeTab === 'arrivals'
      ? arrivalsList
      : activeTab === 'departures'
      ? departuresList
      : inHouseList;

  useEffect(() => {
    const el = carouselRef.current;
    if (el) el.scrollLeft = 0;
    setActiveCardIndex(0);
    const id = requestAnimationFrame(updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [activeTab, activeRows.length]);

  const todayArrivalsCount = arrivalsList.filter(b => b.checkInDate === today).length;

  return (
    <>
      <div
        className={`backdrop-blur-xl rounded-2xl shadow-sm border p-4 sm:p-6 md:p-8 relative overflow-hidden transition-colors duration-700 ${
          night
            ? 'bg-slate-900/80 border-slate-800'
            : 'bg-white/70 border-white/20'
        }`}
      >
        {/* Ambient Glass Glows (matching UrgentArrivals card look) */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Header + Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 md:mb-7 relative z-10 gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                night
                  ? 'bg-blue-500/15 border-blue-500/30'
                  : 'bg-blue-50 border-blue-100'
              }`}
            >
              <Bell className={`w-4 h-4 md:w-5 md:h-5 ${night ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${night ? 'text-white' : 'text-slate-900'}`}>
                Today Board
              </h2>
              <p className={`text-xs md:text-sm ${night ? 'text-slate-400' : 'text-slate-500'}`}>
                One-tap check-in, check-out &amp; payment desk ({today})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
            <div
              className={`grid grid-cols-3 sm:inline-flex w-full sm:w-auto p-1 rounded-xl border ${
                night
                  ? 'bg-slate-800/90 border-slate-700'
                  : 'bg-slate-100/90 border-slate-200/80'
              }`}
            >
            <button
              type="button"
              onClick={() => setActiveTab('arrivals')}
              className={`min-h-[40px] px-2 sm:px-3.5 py-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                activeTab === 'arrivals'
                  ? night
                    ? 'bg-slate-950 text-white shadow'
                    : 'bg-white text-slate-900 shadow-sm'
                  : night
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn size={13} className="hidden sm:block" />
              Arrivals
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  todayArrivalsCount > 0
                    ? 'bg-blue-600 text-white'
                    : night
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {arrivalsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('departures')}
              className={`min-h-[40px] px-2 sm:px-3.5 py-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                activeTab === 'departures'
                  ? night
                    ? 'bg-slate-950 text-white shadow'
                    : 'bg-white text-slate-900 shadow-sm'
                  : night
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogOut size={13} className="hidden sm:block" />
              Departures
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  departuresList.length > 0
                    ? 'bg-amber-500 text-white'
                    : night
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {departuresList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inhouse')}
              className={`min-h-[40px] px-2 sm:px-3.5 py-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                activeTab === 'inhouse'
                  ? night
                    ? 'bg-slate-950 text-white shadow'
                    : 'bg-white text-slate-900 shadow-sm'
                  : night
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={13} className="hidden sm:block" />
              In-house
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  inHouseList.length > 0
                    ? 'bg-emerald-600 text-white'
                    : night
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {inHouseList.length}
              </span>
            </button>
            </div>

            {activeRows.length > 1 && (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollCarousel('left')}
                  disabled={!canScrollLeft}
                  aria-label="Scroll cards left"
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition ${
                    night
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 disabled:opacity-30'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30'
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel('right')}
                  disabled={!canScrollRight}
                  aria-label="Scroll cards right"
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition ${
                    night
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 disabled:opacity-30'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30'
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Swipeable Horizontal Card Carousel */}
        {activeRows.length === 0 ? (
          <div
            className={`relative z-10 py-12 flex flex-col items-center justify-center rounded-xl border border-dashed ${
              night
                ? 'text-slate-400 bg-slate-800/40 border-slate-700'
                : 'text-slate-500 bg-white/50 border-slate-200'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                night ? 'bg-slate-800' : 'bg-slate-100'
              }`}
            >
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium">
              {activeTab === 'arrivals'
                ? 'No upcoming arrivals scheduled'
                : activeTab === 'departures'
                ? 'No departures scheduled for today'
                : 'No guests currently in-house'}
            </p>
          </div>
        ) : (
          <>
            <div
              ref={carouselRef}
              onScroll={updateScrollButtons}
              className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain pb-2 -mx-1 px-1 relative z-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
            {activeRows.map(booking => {
              const effStatus = getEffectiveStatus(booking);
              const room = getRoomForBooking(booking);
              const roomNum = room?.number || String(booking.roomId);
              const dirty = isRoomDirty(room);
              const balance = getPendingBalance(booking);
              const isTodayArrival = booking.checkInDate === today;
              const isTomorrowArrival = booking.checkInDate === tomorrow;

              const blockReasons: string[] = [];
              if (dirty) blockReasons.push('Room dirty');
              if (balance > 0) blockReasons.push(`₹${balance.toLocaleString()} due`);
              const checkInBlocked = blockReasons.length > 0;

              const badgeLabel =
                effStatus === BookingStatus.CHECKED_IN
                  ? 'In-House'
                  : effStatus === BookingStatus.CHECKED_OUT
                  ? 'Checked Out'
                  : activeTab === 'departures'
                  ? 'Departing Today'
                  : isTodayArrival
                  ? 'Today'
                  : isTomorrowArrival
                  ? 'Tomorrow'
                  : booking.checkInDate;

              const badgeClass =
                effStatus === BookingStatus.CHECKED_IN
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : effStatus === BookingStatus.CHECKED_OUT
                  ? 'bg-slate-200 text-slate-700 border-slate-300'
                  : activeTab === 'departures' || isTodayArrival
                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-blue-100 text-blue-700 border-blue-200';

              return (
                <div
                  key={booking.id}
                  onClick={() => onEditBooking(booking, !isAdmin)}
                  className={`w-[calc(100%-1.25rem)] max-w-[340px] sm:w-[330px] lg:w-[340px] shrink-0 snap-start backdrop-blur-md rounded-xl p-4 sm:p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-sm group/card border ${
                    night
                      ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 hover:border-blue-500/50'
                      : 'bg-white/60 hover:bg-white/95 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {/* Top Section */}
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${badgeClass}`}
                      >
                        {badgeLabel}
                      </span>

                      <div className="flex items-center gap-1.5 -mr-1 -mt-1">
                        <div className="flex -space-x-2">
                          {(booking.sources?.length ? booking.sources : [{ source: 'Direct' }]).map(
                            (s: any, idx: number) => (
                              <div
                                key={idx}
                                className={`w-8 h-8 rounded-full border flex items-center justify-center relative ${
                                  night
                                    ? 'bg-slate-900 border-slate-700 text-slate-300'
                                    : 'bg-slate-100 border-slate-200 text-slate-500'
                                }`}
                                style={{ zIndex: 10 - idx }}
                                title={`Source: ${s.source || 'Direct'}`}
                              >
                                <PlatformIcon source={s.source || 'Direct'} className="w-4 h-4" />
                              </div>
                            )
                          )}
                        </div>

                        {booking.guestPhone && (
                          <a
                            href={`tel:${booking.guestPhone}`}
                            onClick={e => e.stopPropagation()}
                            className="w-8 h-8 rounded-full bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center justify-center transition-colors"
                            title={`Call ${booking.guestName} (${booking.guestPhone})`}
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          </a>
                        )}
                      </div>
                    </div>

                    <h3
                      className={`font-bold text-lg group-hover/card:text-blue-600 transition-colors truncate mb-0.5 ${
                        night ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {booking.guestName}
                    </h3>
                    <p className={`text-xs font-medium truncate ${night ? 'text-slate-400' : 'text-slate-500'}`}>
                      {booking.checkInDate} → {booking.checkOutDate}
                      {booking.guestPhone ? ` • ${booking.guestPhone}` : ''}
                    </p>
                  </div>

                  {/* Room & Payment Readiness Strip */}
                  <div
                    className={`mt-4 pt-3.5 border-t flex items-center justify-between gap-2 ${
                      night ? 'border-slate-700/80' : 'border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div
                        className={`px-2 py-0.5 rounded border ${
                          night
                            ? 'bg-slate-900 border-slate-700 text-slate-200'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="font-mono font-bold text-xs">R{roomNum}</span>
                      </div>

                      {dirty ? (
                        <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 font-bold inline-flex items-center">
                          <Droplets size={10} className="mr-0.5" /> Dirty
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-bold inline-flex items-center">
                          <Sparkles size={10} className="mr-0.5" /> Clean
                        </span>
                      )}
                    </div>

                    <div>
                      {balance > 0 ? (
                        <span className="text-red-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          Due: ₹{balance.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Paid
                        </span>
                      )}
                    </div>
                  </div>

                  {/* One-Tap Action Footer */}
                  <div
                    onClick={e => e.stopPropagation()}
                    className={`mt-3.5 pt-3 border-t flex flex-wrap items-center gap-2 ${
                      night ? 'border-slate-700/80' : 'border-slate-100'
                    }`}
                  >
                    {/* Quick Mark Clean */}
                    {isAdmin && dirty && room && onMarkRoomClean && effStatus !== BookingStatus.CHECKED_OUT && (
                      <button
                        type="button"
                        disabled={cleaningRoomId === room.id}
                        onClick={() => handleQuickClean(room)}
                        className="min-h-[36px] px-3 py-2 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 active:scale-95 transition disabled:opacity-50"
                      >
                        {cleaningRoomId === room.id ? 'Cleaning...' : 'Mark Clean'}
                      </button>
                    )}

                    {/* Collect Balance */}
                    {isAdmin && balance > 0 && onAddPayment && (
                      <button
                        type="button"
                        onClick={() => onAddPayment(booking)}
                        className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition shadow-sm"
                      >
                        <CreditCard size={13} />
                        Collect ₹{balance.toLocaleString()}
                      </button>
                    )}

                    {/* Check In (with dirty/balance guard + override) */}
                    {isAdmin && effStatus === BookingStatus.CONFIRMED && onUpdateStatus && (
                      checkInBlocked ? (
                        <>
                          <button
                            type="button"
                            disabled
                            title={`Blocked: ${blockReasons.join(' & ')}`}
                            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-200 text-slate-500 cursor-not-allowed"
                          >
                            <LogIn size={13} />
                            Check in
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerOptimisticStatus(booking, BookingStatus.CHECKED_IN)}
                            title={`Override (${blockReasons.join(', ')}) and check in anyway`}
                            className="min-h-[36px] inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 active:scale-95 transition"
                          >
                            <ShieldAlert size={12} />
                            Override
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerOptimisticStatus(booking, BookingStatus.CHECKED_IN)}
                          className="min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition shadow-sm"
                        >
                          <LogIn size={13} />
                          Check in
                        </button>
                      )
                    )}

                    {/* Check Out */}
                    {isAdmin &&
                      (effStatus === BookingStatus.CHECKED_IN ||
                        (activeTab === 'departures' && effStatus === BookingStatus.CONFIRMED)) &&
                      onUpdateStatus && (
                        <button
                          type="button"
                          onClick={() => triggerOptimisticStatus(booking, BookingStatus.CHECKED_OUT)}
                          className="min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition shadow-sm"
                        >
                          <LogOut size={13} />
                          Check out
                        </button>
                      )}

                    {/* Review Request */}
                    {onSendReviewRequest &&
                      (activeTab === 'departures' || effStatus === BookingStatus.CHECKED_OUT) && (
                        <button
                          type="button"
                          onClick={() => onSendReviewRequest(booking)}
                          className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition"
                        >
                          <MessageCircle size={13} />
                          Review
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
            </div>

            {/* Mobile Swipe Pagination Dots */}
            {activeRows.length > 1 && (
              <div className="sm:hidden flex items-center justify-center gap-1.5 mt-3 relative z-10">
                {activeRows.slice(0, 8).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === Math.min(activeCardIndex, 7)
                        ? 'w-5 bg-blue-600'
                        : night
                        ? 'w-1.5 bg-slate-700'
                        : 'w-1.5 bg-slate-300'
                    }`}
                  />
                ))}
                <span className={`ml-2 text-[10px] font-semibold ${night ? 'text-slate-400' : 'text-slate-400'}`}>
                  Swipe →
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Optimistic Undo Toast (mobile-safe positioning above bottom nav) */}
      {pendingToast && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center justify-between sm:justify-start gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold truncate">{pendingToast.label}</span>
          </div>
          <button
            type="button"
            onClick={handleUndo}
            className="min-h-[34px] shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold transition"
          >
            <RotateCcw size={12} />
            Undo
          </button>
        </div>
      )}
    </>
  );
};

export default TodayBoard;
