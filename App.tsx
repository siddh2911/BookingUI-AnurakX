import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAvailabilityForecast, API_BASE_URL } from './services/api';
import { Room, Booking, AuditLog, User, RoomStatus, BookingStatus, BookingSource, PaymentMethod, PaymentType, Payment, HousekeepingTask, HousekeepingStatus, MaintenanceTicket } from './types';
import { LanguageProvider } from './contexts/LanguageContext';
import { INITIAL_ROOMS, INITIAL_BOOKINGS, MOCK_USER, INITIAL_HOUSEKEEPING_TASKS, INITIAL_MAINTENANCE_TICKETS } from './constants';

import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './components/pages/DashboardPage';
import BookingsPage from './components/pages/BookingsPage';
import CalendarPage from './components/pages/CalendarPage';
import RoomsPage from './components/pages/RoomsPage';
import GuestsPage from './components/pages/GuestsPage';
import FinancePage from './components/pages/FinancePage';
import FoodPage from './components/pages/FoodPage';
import ChannelManagerPage from './components/pages/ChannelManagerPage';
import LoginPage from './components/pages/LoginPage';

import NewBookingModal from './components/modals/NewBookingModal';
import BookingDetailsModal from './components/modals/BookingDetailsModal';
import DayDetailsModal from './components/modals/DayDetailsModal';
import PaymentModal from './components/modals/PaymentModal';
import SecurityModal from './components/modals/SecurityModal';
import DeleteConfirmationModal from './components/modals/DeleteConfirmationModal';

export default function App() {

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


  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [currentUser] = useState<User>(MOCK_USER);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const handleLogin = useCallback(() => setIsAuthenticated(true), []);
  const handleLogout = useCallback(() => setIsAuthenticated(false), []);


  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      if (isAuthenticated) {

        timeout = setTimeout(() => {
          handleLogout();
        }, 15 * 60 * 1000);
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    if (isAuthenticated) {
      events.forEach(event => window.addEventListener(event, resetTimer));
      resetTimer();
    }

    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated, handleLogout]);


  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);


  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  const [forecastPage, setForecastPage] = useState(0);
  const [currentBookingPayments, setCurrentBookingPayments] = useState<Payment[]>([]);
  const [isRevenueVisible, setIsRevenueVisible] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [dayDetailsDate, setDayDetailsDate] = useState<Date | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [housekeepingTasks, setHousekeepingTasks] = useState<HousekeepingTask[]>([]);
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>([]);

  useEffect(() => {
    import('./services/api').then(api => {
      api.fetchMaintenanceTickets().then(setMaintenanceTickets).catch(console.error);
    });
  }, []);
  const handleToggleRevenue = (visible: boolean) => {
    if (visible) {

      setIsSecurityModalOpen(true);
    } else {

      setIsRevenueVisible(false);
    }
  };


  const [bookingFilter, setBookingFilter] = useState<{
    status?: BookingStatus;
    date?: string;
    type?: 'checkin' | 'checkout' | 'pending';
    label?: string;
  } | null>(null);


  const today = formatLocalDate(new Date());

  const [newBookingData, setNewBookingData] = useState({
    guestName: '', guestEmail: '', guestPhone: '',
    checkIn: today,
    checkOut: formatLocalDate(new Date(Date.now() + 86400000)),
    roomId: '', advance: 0, roomRate: 0,
    source: BookingSource.DIRECT, sources: [{ source: BookingSource.DIRECT, nightlyRate: 0 }], paymentMethod: PaymentMethod.CASH, notes: '',
    manualTotal: undefined as number | undefined | null,
    additionalCharges: [
      { category: 'Cleaning Fee', amount: 0 },
      { category: 'Guest Service Fee', amount: 0 },
      { category: 'Occupancy Taxes', amount: 0 }
    ]
  });


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
      const response = await fetch(`${API_BASE_URL}/allBooking?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
      const data: any[] = await response.json();

      const transformedBookings: Booking[] = data.map(b => {

        const room = rooms.find(r => String(r.number) === String(b.room));
        const roomId = room ? room.id : -1;


        if (roomId === -1) console.warn(`Could not map API room '${b.room}' to local rooms.`);

        return {
          id: b.id, roomId: roomId, guestName: b.guest, guestEmail: b.guestEmail,
          guestPhone: b.contactNumber, checkInDate: normalizeDateString(b.checkInDate),
          checkOutDate: normalizeDateString(b.checkOutDate),
          sources: (b.bookingSources || [{ source: b.bookingSource as BookingSource, amount: b.totalAmount || b.totalPaid || 0, startDate: b.checkInDate, endDate: b.checkOutDate }]).map((s: any) => {
            const sStart = s.startDate || b.checkInDate;
            const sEnd = s.endDate || b.checkOutDate;
            const sNights = (sStart && sEnd) ? Math.max(1, Math.ceil((new Date(sEnd).getTime() - new Date(sStart).getTime()) / (1000 * 60 * 60 * 24))) : 1;
            return { ...s, nightlyRate: s.nightlyRate != null ? s.nightlyRate : ((Number(s.amount) || 0) / sNights) };
          }),
          status: b.status as BookingStatus,
          totalPaid: b.totalPaid, pendingBalance: b.balance,
        };
      });


      transformedBookings.sort((a, b) => {
        return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
      });

      setBookings(transformedBookings);

      // Map cleanStatus from allBooking response onto rooms & housekeeping
      const cleanStatusMap = new Map<number, string>();
      data.forEach((b: any) => {
        const room = rooms.find(r => String(r.number) === String(b.room));
        if (room && b.cleanStatus) {
          cleanStatusMap.set(room.id, b.cleanStatus);
        }
      });

      if (cleanStatusMap.size > 0) {
        setRooms(prev => prev.map(r => {
          const cs = cleanStatusMap.get(r.id);
          return cs ? { ...r, cleanStatus: cs as any } : r;
        }));
        setHousekeepingTasks(prev => {
          const updated = [...prev];
          cleanStatusMap.forEach((cs, roomId) => {
            const existing = updated.find(t => t.roomId === roomId);
            const newStatus: HousekeepingStatus = cs === 'DIRTY' ? 'Dirty' : 'Clean';
            if (existing) {
              existing.status = newStatus;
              existing.priority = cs === 'DIRTY' ? 'High' : 'Low';
            } else {
              updated.push({ id: `hk_api_${roomId}`, roomId, status: newStatus, priority: cs === 'DIRTY' ? 'High' : 'Low' });
            }
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, [rooms]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);


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


    const calculateOccupancy = (startDate: Date, endDate: Date) => {
      if (rooms.length === 0) return 0;
      const totalRoomNights = rooms.length * Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      let occupiedRoomNights = 0;
      bookings.forEach(booking => {
        if (booking.status === BookingStatus.CANCELLED) return;
        const bCheckIn = parseDate(booking.checkInDate);
        const bCheckOut = parseDate(booking.checkOutDate);


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



    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    const occupancyToday = calculateOccupancy(startOfDay, endOfDay);
    const occupancyWeek = calculateOccupancy(startOfWeek, endOfWeek);
    const occupancyMonth = calculateOccupancy(startOfMonth, endOfMonth);
    const occupancyYear = calculateOccupancy(startOfYear, endOfYear);


    let occupancyAllTime = 0;
    const validBookings = bookings.filter(b => b.status !== BookingStatus.CANCELLED);
    if (validBookings.length > 0) {

      const dates = validBookings.flatMap(b => [parseDate(b.checkInDate).getTime(), parseDate(b.checkOutDate).getTime()]);
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));


      occupancyAllTime = calculateOccupancy(minDate, maxDate);
    }


    const calculateRevenue = (startDate: Date, endDate: Date) => {
      let revenue = 0;
      const validBookings = bookings.filter(b => b.status !== BookingStatus.CANCELLED);

      validBookings.forEach(booking => {
        const bCheckIn = parseDate(booking.checkInDate);
        const bCheckOut = parseDate(booking.checkOutDate);




        let dailyRate = 0;
        const totalNights = Math.max(1, (bCheckOut.getTime() - bCheckIn.getTime()) / (1000 * 60 * 60 * 24));

        if (booking.totalAmount || booking.totalPaid) {
          dailyRate = (booking.totalAmount || booking.totalPaid || 0) / totalNights;
        } else {

          const room = rooms.find(r => r.id === booking.roomId);
          dailyRate = room ? room.pricePerNight : 0;
        }


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


    const countCheckIns = (startDate: Date, endDate: Date) => {
      return bookings.filter(b => {
        if (b.status === BookingStatus.CANCELLED) return false;
        const checkIn = parseDate(b.checkInDate);
        return checkIn >= startDate && checkIn < endDate;
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



  const [availabilityForecast, setAvailabilityForecast] = useState<{ date: Date; availableRooms: Room[] }[]>([]);
  const upcomingArrivals = useMemo(() => {
    const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
    const limitDate = new Date(todayDate); limitDate.setDate(limitDate.getDate() + 7);
    return bookings.filter(b => {
      const checkIn = new Date(b.checkInDate); checkIn.setHours(0, 0, 0, 0);
      return checkIn >= todayDate && checkIn <= limitDate && b.status !== BookingStatus.CANCELLED && b.status !== BookingStatus.CHECKED_OUT;
    }).sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());
  }, [bookings]);

  const upcomingDepartures = useMemo(() => {
    const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
    const limitDate = new Date(todayDate); limitDate.setDate(limitDate.getDate() + 7);
    return bookings.filter(b => {
      const checkOut = new Date(b.checkOutDate); checkOut.setHours(0, 0, 0, 0);
      return checkOut >= todayDate && checkOut <= limitDate && b.status !== BookingStatus.CANCELLED && b.status !== BookingStatus.CHECKED_OUT;
    }).sort((a, b) => new Date(a.checkOutDate).getTime() - new Date(b.checkOutDate).getTime());
  }, [bookings]);

  useEffect(() => {
    const fetchForecast = async () => {
      const forecast = await getAvailabilityForecast(rooms, bookings, forecastPage, today);
      setAvailabilityForecast(forecast);
    };
    fetchForecast();
  }, [bookings, rooms, forecastPage, today]);


  useEffect(() => {
    if (isAuthenticated) {

      fetchBookings();
      const t = setTimeout(() => fetchBookings(), 2000);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, fetchBookings]);

  useEffect(() => {

    if (isAuthenticated && stats.totalCheckIns === 0) {
      const retryTimer = setTimeout(() => {
        console.log("No check-ins found (0). Retrying fetch...");
        fetchBookings();
      }, 5000);
      return () => clearTimeout(retryTimer);
    }
  }, [isAuthenticated, stats.totalCheckIns, fetchBookings]);


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
      source: BookingSource.DIRECT, sources: [{ source: BookingSource.DIRECT, nightlyRate: defaultRoom?.pricePerNight || 0 }], paymentMethod: PaymentMethod.CASH, notes: '',
      manualTotal: undefined,
      additionalCharges: [
        { category: 'Cleaning Fee', amount: 0 },
        { category: 'Guest Service Fee', amount: 0 },
        { category: 'Occupancy Taxes', amount: 0 }
      ]
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
        sources: ((fetchedBookingData.bookingSources || booking.sources || [{ source: fetchedBookingData.bookingSource as BookingSource || BookingSource.DIRECT, amount: fetchedBookingData.totalAmount || 0, startDate: fetchedBookingData.checkInDate, endDate: fetchedBookingData.checkOutDate }]) as any[]).map((s: any) => {
          const sStart = s.startDate || fetchedBookingData.checkInDate;
          const sEnd = s.endDate || fetchedBookingData.checkOutDate;
          const sNights = (sStart && sEnd) ? Math.max(1, Math.ceil((new Date(sEnd).getTime() - new Date(sStart).getTime()) / (1000 * 60 * 60 * 24))) : 1;
          return { ...s, nightlyRate: s.nightlyRate != null ? s.nightlyRate : ((Number(s.amount) || 0) / sNights) };
        }),
        paymentMethod: fetchedBookingData.paymentMethod as PaymentMethod || PaymentMethod.CASH,
        notes: fetchedBookingData.internalNotes || '',
        manualTotal: fetchedBookingData.totalAmount,
        additionalCharges: fetchedBookingData.additionalCharges || []
      });
      setIsBookingModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching booking for edit:', error.message);
      setEditingBookingId(null);
    }
  }, [setEditingBookingId, setNewBookingData, setIsBookingModalOpen, rooms]);

  const handleSaveBooking = useCallback(async (e: React.FormEvent<HTMLFormElement>, selectedRoom: Room | undefined) => {
    e.preventDefault();
    const { checkIn, checkOut, guestName, roomRate, advance, paymentMethod, sources, notes, guestEmail, guestPhone, additionalCharges } = newBookingData;
    const room = selectedRoom;
    if (!room) { alert("Selected room not found."); return; }
    if (new Date(checkOut) <= new Date(checkIn)) { alert("Check-out date must be after check-in date."); return; }

    const bookingNights = Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
    const roomTotal = (roomRate || 0) * bookingNights;
    const additionalTotal = additionalCharges?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

    const formattedSources = sources?.map((s: any) => {
      const srcStart = s.startDate || checkIn;
      const srcEnd = s.endDate || checkOut;
      const srcNights = (srcStart && srcEnd) ? Math.max(1, Math.ceil((new Date(srcEnd).getTime() - new Date(srcStart).getTime()) / (1000 * 60 * 60 * 24))) : bookingNights;
      const amt = s.nightlyRate != null ? (Number(s.nightlyRate) * srcNights) : (Number(s.amount) || 0);
      return { ...s, amount: amt };
    });

    const sourcesSum = formattedSources?.length ? formattedSources.reduce((sum, src) => sum + src.amount, 0) : roomTotal;
    const bookingTotal = newBookingData.manualTotal !== undefined ? newBookingData.manualTotal : (sourcesSum + additionalTotal);

    const bookingPayload = {
      fullName: guestName, emailId: guestEmail, mobileNumber: guestPhone, checkInDate: checkIn, checkOutDate: checkOut,
      roomNo: room?.number || '', nightlyRate: roomRate, bookingSources: formattedSources, advanceAmount: advance,
      paymentMethod: paymentMethod, internalNotes: notes, totalAmount: bookingTotal, additionalCharges
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
    setBookingToDelete(bookingId);
  }, []);

  const confirmDeleteBooking = useCallback(() => {
    if (bookingToDelete) {
      const url = `${API_BASE_URL}/bookings/${bookingToDelete}`;
      fetch(url, { method: 'DELETE' })
        .then(response => { if (!response.ok) throw new Error('Failed'); fetchBookings(); })
        .catch(error => alert(error.message))
        .finally(() => setBookingToDelete(null));
    }
  }, [bookingToDelete, fetchBookings]);

  const handleAddPayment = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!selectedBooking) return;
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const method = formData.get('method') as PaymentMethod;
    const type = formData.get('type') as PaymentType;
    const bookingSource = formData.get('bookingSource') as BookingSource || undefined;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${selectedBooking.id}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: selectedBooking.id, amount, method, type, bookingSource, date: new Date().toISOString() }),
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

      if (status === BookingStatus.CHECKED_OUT) {
        setBookings(prev => {
          const b = prev.find(bk => bk.id.toString() === bookingId.toString());
          if (b) {
            setHousekeepingTasks(hTasks => {
              const existing = hTasks.find(t => t.roomId === b.roomId);
              if (existing) return hTasks.map(t => t.roomId === b.roomId ? { ...t, status: 'Dirty' } : t);
              return [...hTasks, { id: `hk_auto_${Date.now()}`, roomId: b.roomId, status: 'Dirty', priority: 'High' }];
            });

            const actualRoom = rooms.find(r => r.id === b.roomId);
            if (actualRoom) {
              import('./services/api').then(api => {
                api.updateRoomCleanStatus(actualRoom.number, 'DIRTY').catch(console.error);
              });
            }
          }
          return prev;
        });
      }

      fetchBookings();
    } catch (error: any) { alert(error.message); }
  }, [fetchBookings]);

  const handleDashboardFilter = useCallback((filter: any) => { setBookingFilter(filter); }, [setBookingFilter]);


  const bookingNights = Math.max(1, Math.ceil((new Date(newBookingData.checkOut).getTime() - new Date(newBookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
  const roomTotal = (newBookingData.roomRate || 0) * bookingNights;
  const additionalTotal = newBookingData.additionalCharges?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
  const sourcesSum = newBookingData.sources?.length ? newBookingData.sources.reduce((sum: number, src: any) => {
    const srcStart = src.startDate || newBookingData.checkIn;
    const srcEnd = src.endDate || newBookingData.checkOut;
    const srcNights = (srcStart && srcEnd) ? Math.max(1, Math.ceil((new Date(srcEnd).getTime() - new Date(srcStart).getTime()) / (1000 * 60 * 60 * 24))) : bookingNights;
    return sum + (src.nightlyRate != null ? (Number(src.nightlyRate) * srcNights) : (Number(src.amount) || 0));
  }, 0) : roomTotal;
  const bookingTotal = newBookingData.manualTotal !== undefined ? newBookingData.manualTotal : (sourcesSum + additionalTotal);

  let paidAmount = newBookingData.advance;
  let bookingPending = bookingTotal - paidAmount;

  paidAmount = Math.max(0, paidAmount); bookingPending = Math.max(0, bookingPending);

  const handleOpenDayDetails = (date: Date) => setDayDetailsDate(date);

  const dashboardProps = {
    stats, upcomingArrivals, upcomingDepartures, rooms, logs, availabilityForecast, bookings, housekeepingTasks,
    forecastPage, setForecastPage, handleDashboardFilter, handleEditBooking, handleOpenNewBooking, handleOpenDayDetails,
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
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" replace />} />

          <Route path="/" element={isAuthenticated ? <DashboardLayout onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
            <Route index element={<DashboardPage dashboardProps={dashboardProps} />} />
            <Route path="bookings" element={<BookingsPage bookingProps={bookingProps} />} />
            <Route path="calendar" element={<CalendarPage calendarProps={calendarProps} />} />
            <Route path="rooms" element={<RoomsPage rooms={rooms} bookings={bookings} housekeepingTasks={housekeepingTasks} setHousekeepingTasks={setHousekeepingTasks} maintenanceTickets={maintenanceTickets} setMaintenanceTickets={setMaintenanceTickets} />} />
            <Route path="guests" element={<GuestsPage />} />
            <Route path="dining" element={<FoodPage rooms={rooms} />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="channels" element={<ChannelManagerPage rooms={rooms} bookings={bookings} onSyncExternalBookings={(newBookings) => {
              setBookings(prev => {
                // 1. Filter out duplicates by ID
                const existingIds = new Set(prev.map(b => b.id));
                const uniqueNew = newBookings.filter(b => !existingIds.has(b.id));

                if (uniqueNew.length === 0) {
                  alert("No new bookings found or all bookings already exist.");
                  return prev;
                }

                // 2. Conflict Detection (Basic)
                const nonConflicting = uniqueNew.filter(newB => {
                  const conflict = prev.find(existingB =>
                    existingB.roomId === newB.roomId &&
                    existingB.status !== BookingStatus.CANCELLED &&
                    (
                      (newB.checkInDate < existingB.checkOutDate && newB.checkOutDate > existingB.checkInDate)
                    )
                  );
                  if (conflict) {
                    console.warn(`Skipping conflicting booking from external source for room ${newB.roomId} on ${newB.checkInDate}`);
                    return false;
                  }
                  return true;
                });

                if (nonConflicting.length > 0) {
                  alert(`Successfully synced ${nonConflicting.length} new bookings from external channels!`);
                  return [...prev, ...nonConflicting];
                } else {
                  alert("Sync complete, but all imported bookings overlapped with existing reservations.");
                  return prev;
                }
              });
            }} />} />
          </Route>
          { }
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <NewBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => { setIsBookingModalOpen(false); setIsViewOnlyMode(false); }}
          editingBookingId={editingBookingId}
          newBookingData={newBookingData}
          setNewBookingData={setNewBookingData}
          handleSaveBooking={(e, r) => handleSaveBooking(e, r)}
          rooms={rooms}
          bookings={bookings}
          bookingNights={bookingNights}
          bookingTotal={bookingTotal}
          paidAmount={paidAmount}
          bookingPending={bookingPending}
          readOnly={isViewOnlyMode}
        />

        {selectedBooking && (
          <BookingDetailsModal
            isOpen={!!selectedBooking}
            onClose={() => setSelectedBooking(null)}
            booking={selectedBooking}
            onAddPayment={() => { setIsPaymentModalOpen(true); }}
          />
        )}

        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          booking={selectedBooking}
          onProcessPayment={handleAddPayment}
        />

        <SecurityModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          onAuthenticated={() => {
            setIsRevenueVisible(true);
            setIsSecurityModalOpen(false);
          }}
        />
        <DayDetailsModal
          isOpen={!!dayDetailsDate}
          onClose={() => setDayDetailsDate(null)}
          date={dayDetailsDate}
          rooms={rooms}
          bookings={bookings}
          onEditBooking={handleEditBooking}
          onNewBooking={(date, roomId) => {
            handleOpenNewBooking(date);
            if (roomId) setNewBookingData((prev: any) => ({ ...prev, roomId }));
          }}
        />

        <DeleteConfirmationModal
          isOpen={!!bookingToDelete}
          onClose={() => setBookingToDelete(null)}
          onConfirm={confirmDeleteBooking}
          bookingId={bookingToDelete}
        />
      </Router>
    </LanguageProvider>
  );
}
