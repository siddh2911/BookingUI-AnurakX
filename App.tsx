import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAvailabilityForecast } from './services/api';
import { Room, Booking, AuditLog, User, RoomStatus, BookingStatus, BookingSource, PaymentMethod, PaymentType, Payment } from './types';
import { INITIAL_ROOMS, INITIAL_BOOKINGS, MOCK_USER } from './constants';

import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './components/pages/DashboardPage';
import BookingsPage from './components/pages/BookingsPage';
import CalendarPage from './components/pages/CalendarPage';
import RoomsPage from './components/pages/RoomsPage';
import GuestsPage from './components/pages/GuestsPage';
import FinancePage from './components/pages/FinancePage';

import NewBookingModal from './components/modals/NewBookingModal';
import PaymentModal from './components/modals/PaymentModal';
import SecurityModal from './components/modals/SecurityModal';

export default function App() {
  const API_BASE_URL = 'https://booking-anurakx.onrender.com';
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const normalizeDateString = (dateInput: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    return formatLocalDate(new Date(dateInput));
  };

  // --- State ---
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [currentUser] = useState<User>(MOCK_USER);

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Edit State
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  const [forecastPage, setForecastPage] = useState(0);
  const [currentBookingPayments, setCurrentBookingPayments] = useState<Payment[]>([]);
  const [isRevenueVisible, setIsRevenueVisible] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  const handleToggleRevenue = (visible: boolean) => {
    if (visible) {
      // User wants to see revenue -> require auth
      setIsSecurityModalOpen(true);
    } else {
      // User wants to hide revenue -> allow immediately
      setIsRevenueVisible(false);
    }
  };

  // Filter State
  const [bookingFilter, setBookingFilter] = useState<{
    status?: BookingStatus;
    date?: string;
    type?: 'checkin' | 'checkout' | 'pending';
    label?: string;
  } | null>(null);

  // Derived State
  const today = formatLocalDate(new Date());

  const [newBookingData, setNewBookingData] = useState({
    guestName: '', guestEmail: '', guestPhone: '',
    checkIn: today,
    checkOut: formatLocalDate(new Date(Date.now() + 86400000)),
    roomId: '', advance: 0, roomRate: 0,
    source: BookingSource.DIRECT, paymentMethod: PaymentMethod.CASH, notes: ''
  });

  // --- API Calls ---
  const fetchBookingPayments = useCallback(async (bookingId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/payments`);
      if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
      const data: Payment[] = await response.json();
      setCurrentBookingPayments(data);
    } catch (error) {
      console.error(`Error fetching payments:`, error);
      setCurrentBookingPayments([]);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/allBooking`);
      if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
      const data: any[] = await response.json();

      const transformedBookings: Booking[] = data.map(b => {
        // Ensure robust comparison between API room (which might be number) and local room number (string)
        const room = rooms.find(r => String(r.number) === String(b.room));
        const roomId = room ? room.id : -1;

        // Log if room mapping fails for debugging
        if (roomId === -1) console.warn(`Could not map API room '${b.room}' to local rooms.`);

        return {
          id: b.id, roomId: roomId, guestName: b.guest, guestEmail: b.guestEmail,
          guestPhone: b.contactNumber, checkInDate: normalizeDateString(b.checkInDate),
          checkOutDate: normalizeDateString(b.checkOutDate),
          source: b.bookingSource as BookingSource, status: b.status as BookingStatus,
          totalPaid: b.totalPaid, pendingBalance: b.balance,
        };
      });
      setBookings(transformedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, [rooms]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // --- Derived Stats ---
  const stats = useMemo(() => {
    const parseDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // --- Improved Stats Logic ---
    const calculateOccupancy = (startDate: Date, endDate: Date) => {
      if (rooms.length === 0) return 0;
      const totalRoomNights = rooms.length * Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      let occupiedRoomNights = 0;
      bookings.forEach(booking => {
        if (booking.status === BookingStatus.CANCELLED) return;
        const bCheckIn = parseDate(booking.checkInDate);
        const bCheckOut = parseDate(booking.checkOutDate);

        // Calculate overlap
        const overlapStart = new Date(Math.max(startDate.getTime(), bCheckIn.getTime()));
        const overlapEnd = new Date(Math.min(endDate.getTime(), bCheckOut.getTime()));

        if (overlapStart < overlapEnd) {
          const nights = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
          occupiedRoomNights += nights;
        }
      });

      return Math.min(100, Math.round((occupiedRoomNights / totalRoomNights) * 100));
    };

    const endOfDay = new Date(startOfDay); endOfDay.setDate(endOfDay.getDate() + 1);

    // Occupancy Calculations
    // Define end of periods for accurate "forecast" occupancy
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    const occupancyToday = calculateOccupancy(startOfDay, endOfDay);
    const occupancyWeek = calculateOccupancy(startOfWeek, endOfWeek);
    const occupancyMonth = calculateOccupancy(startOfMonth, endOfMonth);
    const occupancyYear = calculateOccupancy(startOfYear, endOfYear);

    // Calculate All Time Occupancy covering the entire range of bookings (past & future)
    let occupancyAllTime = 0;
    const validBookings = bookings.filter(b => b.status !== BookingStatus.CANCELLED);
    if (validBookings.length > 0) {
      // Find range of all bookings
      const dates = validBookings.flatMap(b => [parseDate(b.checkInDate).getTime(), parseDate(b.checkOutDate).getTime()]);
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      // Ensure we strictly calculate what is occupied vs total slots in that range
      occupancyAllTime = calculateOccupancy(minDate, maxDate);
    }

    // Revenue Calculation: Prorate based on nights stayed in the period
    const calculateRevenue = (startDate: Date, endDate: Date) => {
      let revenue = 0;
      const validBookings = bookings.filter(b => b.status !== BookingStatus.CANCELLED);

      validBookings.forEach(booking => {
        const bCheckIn = parseDate(booking.checkInDate);
        const bCheckOut = parseDate(booking.checkOutDate);

        // Determine booking value/night
        // Fallback to pricePerNight from room if totalAmount is missing, assuming standard rate
        // Or calculate from totalAmount / nights
        let dailyRate = 0;
        const totalNights = Math.max(1, (bCheckOut.getTime() - bCheckIn.getTime()) / (1000 * 60 * 60 * 24));

        if (booking.totalAmount || booking.totalPaid) {
          dailyRate = (booking.totalAmount || booking.totalPaid || 0) / totalNights;
        } else {
          // Fallback: This might be inaccurate if we don't have room rate history, but better than 0
          const room = rooms.find(r => r.id === booking.roomId);
          dailyRate = room ? room.pricePerNight : 0;
        }

        // Calculate overlap with period
        const overlapStart = new Date(Math.max(startDate.getTime(), bCheckIn.getTime()));
        const overlapEnd = new Date(Math.min(endDate.getTime(), bCheckOut.getTime()));

        if (overlapStart < overlapEnd) {
          const overlapNights = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
          revenue += (overlapNights * dailyRate);
        }
      });
      return Math.round(revenue);
    };

    const totalRevenue = bookings.filter(b => b.status !== BookingStatus.CANCELLED).reduce((sum, b) => sum + (b.totalAmount || b.totalPaid || 0), 0);
    const revenueToday = calculateRevenue(startOfDay, endOfDay);
    const revenueWeek = calculateRevenue(startOfWeek, endOfWeek);
    const revenueMonth = calculateRevenue(startOfMonth, endOfMonth);
    const revenueYear = calculateRevenue(startOfYear, endOfYear);

    // Check-In Counts: STRICTLY within the defined periods (Forecast)
    const countCheckIns = (startDate: Date, endDate: Date) => {
      return bookings.filter(b => {
        if (b.status === BookingStatus.CANCELLED) return false;
        const checkIn = parseDate(b.checkInDate);
        return checkIn >= startDate && checkIn < endDate; // < endDate because endDate is usually start of next period or end of day
      }).length;
    };

    const checkInsToday = countCheckIns(startOfDay, endOfDay);
    const checkInsWeek = countCheckIns(startOfWeek, endOfWeek);
    const checkInsMonth = countCheckIns(startOfMonth, endOfMonth);
    const checkInsYear = countCheckIns(startOfYear, endOfYear);
    const totalCheckIns = bookings.filter(b => b.status !== BookingStatus.CANCELLED).length;

    return {
      totalRevenue, revenueToday, revenueWeek, revenueMonth, revenueYear,
      occupancyToday, occupancyWeek, occupancyMonth, occupancyYear, occupancyAllTime,
      checkInsToday, checkInsWeek, checkInsMonth, checkInsYear, totalCheckIns
    };
  }, [bookings, rooms, today]);

  // Revenue Chart Data Helper
  const generateRevenueData = useCallback((days: number) => {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const nextD = new Date(d); nextD.setDate(nextD.getDate() + 1);

      const dayRevenue = bookings.filter(b => b.status !== BookingStatus.CANCELLED).reduce((sum, b) => {
        const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(b.checkOutDate); checkOut.setHours(0, 0, 0, 0);

        if (checkIn <= d && d < checkOut) {
          const totalNights = Math.max(1, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          const dailyValue = (b.totalAmount || b.totalPaid || 0) / totalNights;
          return sum + dailyValue;
        }
        return sum;
      }, 0);

      const name = days > 30
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) // Compact date for long ranges
        : d.toLocaleDateString('en-US', { weekday: 'short' });

      return { name, revenue: Math.round(dayRevenue), date: d }; // Store date object for grouping if needed
    }).reverse();
  }, [bookings]);

  // Year Data Generator (Grouped by Month)
  const generateYearlyRevenueData = useCallback(() => {
    const months = 12;
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0, 0, 0, 0); // Start of month
      const monthStart = new Date(d);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0); monthEnd.setHours(23, 59, 59, 999);

      const monthRevenue = bookings.filter(b => b.status !== BookingStatus.CANCELLED).reduce((sum, b) => {
        const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(b.checkOutDate); checkOut.setHours(0, 0, 0, 0);

        // If booking overlaps with this month
        const overlapStart = new Date(Math.max(monthStart.getTime(), checkIn.getTime()));
        const overlapEnd = new Date(Math.min(monthEnd.getTime(), checkOut.getTime()));

        if (overlapStart < overlapEnd) {
          const overlapNights = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
          const totalNights = Math.max(1, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          const dailyRate = (b.totalAmount || b.totalPaid || 0) / totalNights;
          return sum + (overlapNights * dailyRate);
        }
        return sum;
      }, 0);

      return { name: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), revenue: Math.round(monthRevenue) };
    }).reverse();
  }, [bookings]);

  const revenueChartData = useMemo(() => ({
    last7Days: generateRevenueData(7),
    last30Days: generateRevenueData(30),
    last1Year: generateYearlyRevenueData()
  }), [generateRevenueData, generateYearlyRevenueData]);

  const [availabilityForecast, setAvailabilityForecast] = useState<{ date: Date; availableRooms: Room[] }[]>([]);
  const upcomingArrivals = useMemo(() => {
    const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
    const limitDate = new Date(todayDate); limitDate.setDate(limitDate.getDate() + 7);
    return bookings.filter(b => {
      const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
      return checkIn >= todayDate && checkIn <= limitDate && b.status !== BookingStatus.CANCELLED && b.status !== BookingStatus.CHECKED_OUT;
    }).sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());
  }, [bookings]);

  useEffect(() => {
    const fetchForecast = async () => {
      const forecast = await getAvailabilityForecast(rooms, bookings, forecastPage, today);
      setAvailabilityForecast(forecast);
    };
    fetchForecast();
  }, [bookings, rooms, forecastPage, today]);

  // --- Handlers ---
  const addLog = useCallback((action: string, details: string) => {
    const newLog = { id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), action, user: currentUser.name, details };
    setLogs(prev => [newLog, ...prev]);
  }, [currentUser]);

  const handleOpenNewBooking = useCallback((preSelectedDate?: Date) => {
    const defaultRoom = rooms.find(r => r.status === RoomStatus.AVAILABLE);
    setEditingBookingId(null);
    setNewBookingData({
      guestName: '', guestEmail: '', guestPhone: '',
      checkIn: preSelectedDate ? formatLocalDate(preSelectedDate) : today,
      checkOut: preSelectedDate ? formatLocalDate(new Date(preSelectedDate.getTime() + 86400000)) : formatLocalDate(new Date(Date.now() + 86400000)),
      roomId: defaultRoom?.id || '', advance: 0, roomRate: defaultRoom?.pricePerNight || 0,
      source: BookingSource.DIRECT, paymentMethod: PaymentMethod.CASH, notes: ''
    });
    setIsBookingModalOpen(true);
  }, [rooms, today, setEditingBookingId, setNewBookingData, setIsBookingModalOpen]);

  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);

  const handleEditBooking = useCallback(async (booking: Booking, isViewOnly = false) => {
    setEditingBookingId(booking.id);
    setIsViewOnlyMode(isViewOnly);
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}`);
      if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
      const fetchedBookingData = await response.json();
      setNewBookingData({
        guestName: fetchedBookingData.fullName || '',
        guestEmail: fetchedBookingData.emailId || '',
        guestPhone: fetchedBookingData.mobileNumber || '',
        checkIn: fetchedBookingData.checkInDate ? normalizeDateString(fetchedBookingData.checkInDate) : '',
        checkOut: fetchedBookingData.checkOutDate ? normalizeDateString(fetchedBookingData.checkOutDate) : '',
        roomId: rooms.find(r => r.number === fetchedBookingData.roomNo)?.id || -1,
        roomRate: fetchedBookingData.nightlyRate || 0,
        advance: fetchedBookingData.advanceAmount || 0,
        source: fetchedBookingData.bookingSource as BookingSource || BookingSource.DIRECT,
        paymentMethod: fetchedBookingData.paymentMethod as PaymentMethod || PaymentMethod.CASH,
        notes: fetchedBookingData.internalNotes || ''
      });
      setIsBookingModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching booking for edit:', error.message);
      setEditingBookingId(null);
    }
  }, [setEditingBookingId, setNewBookingData, setIsBookingModalOpen, rooms]);

  const handleSaveBooking = useCallback(async (e: React.FormEvent<HTMLFormElement>, selectedRoom: Room | undefined) => {
    e.preventDefault();
    const { checkIn, checkOut, guestName, roomRate, advance, paymentMethod, source, notes, guestEmail, guestPhone } = newBookingData;
    const room = selectedRoom;
    if (!room) { alert("Selected room not found."); return; }
    if (new Date(checkOut) <= new Date(checkIn)) { alert("Check-out date must be after check-in date."); return; }

    const bookingNights = Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
    const bookingTotal = (roomRate || 0) * bookingNights;

    const bookingPayload = {
      fullName: guestName, emailId: guestEmail, mobileNumber: guestPhone, checkInDate: checkIn, checkOutDate: checkOut,
      roomNo: room?.number || '', nightlyRate: roomRate, bookingSource: source, advanceAmount: advance,
      paymentMethod: paymentMethod, internalNotes: notes, totalAmount: bookingTotal,
    };

    try {
      let response;
      let url = `${API_BASE_URL}/saveBooking`;
      let method = 'POST';
      if (editingBookingId) { url = `${API_BASE_URL}/bookings/${editingBookingId}`; method = 'PUT'; }

      response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookingPayload) });
      if (!response.ok) throw new Error(`Failed to ${editingBookingId ? 'update' : 'save'} booking.`);

      addLog(editingBookingId ? 'Update Booking' : 'Create Booking', `${editingBookingId ? 'Updated' : 'Created'} booking for ${guestName}.`);
      setIsBookingModalOpen(false); setEditingBookingId(null);
      fetchBookings();
    } catch (error: any) {
      console.error(`Error saving booking:`, error.message);
      alert(`Error saving booking: ${error.message}`);
    }
  }, [newBookingData, rooms, editingBookingId, addLog, fetchBookings]);

  const handleDeleteBooking = useCallback((bookingId: string) => {
    if (window.confirm("Are you sure?")) {
      const url = `${API_BASE_URL}/bookings/${bookingId}`;
      fetch(url, { method: 'DELETE' })
        .then(response => { if (!response.ok) throw new Error('Failed'); fetchBookings(); })
        .catch(error => alert(error.message));
    }
  }, [fetchBookings]);

  const handleAddPayment = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!selectedBooking) return;
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const method = formData.get('method') as PaymentMethod;
    const type = formData.get('type') as PaymentType;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${selectedBooking.id}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: selectedBooking.id, amount, method, type, date: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error('Failed to add payment');

      await fetchBookingPayments(selectedBooking.id); fetchBookings();
      setIsPaymentModalOpen(false); setSelectedBooking(null);
    } catch (error: any) { alert(error.message); }
  }, [selectedBooking, fetchBookings, fetchBookingPayments]);

  const updateBookingStatus = useCallback(async (bookingId: string, status: BookingStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed');
      fetchBookings();
    } catch (error: any) { alert(error.message); }
  }, [fetchBookings]);

  const handleDashboardFilter = useCallback((filter: any) => { setBookingFilter(filter); }, [setBookingFilter]);

  // Derived calculations for modal
  const bookingNights = Math.max(1, Math.ceil((new Date(newBookingData.checkOut).getTime() - new Date(newBookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
  const bookingTotal = (newBookingData.roomRate || 0) * bookingNights;
  let paidAmount = newBookingData.advance;
  let bookingPending = bookingTotal - paidAmount;
  if (editingBookingId) {
    const originalBooking = bookings.find(b => b.id === editingBookingId);
    if (originalBooking) { bookingPending = originalBooking.pendingBalance || 0; paidAmount = bookingTotal - bookingPending; }
  }
  paidAmount = Math.max(0, paidAmount); bookingPending = Math.max(0, bookingPending);

  const dashboardProps = {
    stats, revenueChartData, upcomingArrivals, rooms, logs, availabilityForecast,
    forecastPage, setForecastPage, handleDashboardFilter, handleEditBooking, handleOpenNewBooking,
    today, isRevenueVisible, setIsRevenueVisible: handleToggleRevenue
  };

  const bookingProps = {
    bookings: useMemo(() => {
      if (!bookingFilter) return bookings;
      return bookings.filter(b => {
        if (bookingFilter.status && b.status !== bookingFilter.status) return false;
        if (bookingFilter.type === 'checkin' && bookingFilter.date && b.checkInDate !== bookingFilter.date) return false;
        if (bookingFilter.type === 'pending') {
          if (b.pendingBalance !== undefined) return b.pendingBalance > 0;
          const total = b.totalAmount ?? 0;
          const paid = (b.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
          return (total - paid) > 0;
        }
        return true;
      });
    }, [bookings, bookingFilter]),
    rooms, bookingFilter, setBookingFilter, onOpenNewBooking: handleOpenNewBooking,
    onUpdateStatus: updateBookingStatus, onEditBooking: handleEditBooking,
    onAddPayment: async (booking: Booking) => { setSelectedBooking(booking); await fetchBookingPayments(booking.id); setIsPaymentModalOpen(true); },
    onDeleteBooking: handleDeleteBooking
  };

  const calendarProps = {
    bookings,
    rooms,
    onEditBooking: handleEditBooking
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardPage dashboardProps={dashboardProps} />} />
          <Route path="bookings" element={<BookingsPage bookingProps={bookingProps} />} />
          <Route path="calendar" element={<CalendarPage calendarProps={calendarProps} />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="guests" element={<GuestsPage />} />
          <Route path="finance" element={<FinancePage />} />
        </Route>
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <NewBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => { setIsBookingModalOpen(false); setIsViewOnlyMode(false); }}
        editingBookingId={editingBookingId}
        newBookingData={newBookingData}
        setNewBookingData={setNewBookingData}
        handleSaveBooking={handleSaveBooking}
        rooms={rooms}
        bookings={bookings}
        bookingNights={bookingNights}
        bookingTotal={bookingTotal}
        paidAmount={paidAmount}
        bookingPending={bookingPending}
        readOnly={isViewOnlyMode}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedBooking={selectedBooking}
        handleAddPayment={handleAddPayment}
        payments={currentBookingPayments}
      />

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        onAuthenticated={() => {
          setIsRevenueVisible(true);
          setIsSecurityModalOpen(false);
        }}
      />
    </Router>
  );
}
