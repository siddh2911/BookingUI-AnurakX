import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getAvailabilityForecast, API_BASE_URL } from './services/api';
import { Room, Booking, AuditLog, User, RoomStatus, BookingStatus, BookingSource, PaymentMethod, PaymentType, Payment, HousekeepingTask, HousekeepingStatus, MaintenanceTicket } from './types';
import axios from 'axios';
import { parseVoiceCommand } from './services/voiceParser';

axios.defaults.withCredentials = true;

// GLOBAL AUTH INTERCEPTOR
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 302)) {
      const isHandlingAuth = window.location.pathname.startsWith('/login') || 
                             window.location.pathname.startsWith('/unauthorized');
      if (!isHandlingAuth) {
        window.location.href = 'https://admin.karunavillas.com/login?error=unauthorized';
      }
    }
    return Promise.reject(error);
  }
);

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
import UnauthorizedPage from './components/pages/UnauthorizedPage';

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
  const roomsRef = React.useRef(rooms);
  useEffect(() => { roomsRef.current = rooms; }, [rooms]);

  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [currentUser, setCurrentUser] = useState<User>({ id: 'u_1', name: 'Mock User', role: 'View' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRoleVerified, setIsRoleVerified] = useState(false);
  const checkSession = useCallback(async () => {
      try {
        const response = await axios.get('https://api.karunavillas.com/api/user', {
          timeout: 10000 // Increased timeout for slower resolutions
        });
        
        const data = response.data;
        
        const isActuallyAuthenticated = 
          data && 
          typeof data === 'object' && 
          data.authenticated !== false &&
          data.name && 
          data.name !== 'anonymousUser' && 
          data.principal !== 'anonymousUser' &&
          (data.email || data.id || (data.sub && data.sub !== 'anonymousUser'));

        if (isActuallyAuthenticated) {
          // PHASE 2: CAPABILITY CHECK
          try {
             const capResponse = await fetch(`${API_BASE_URL}/allBooking?limit=1&t=${Date.now()}`, {
               redirect: 'manual',
               credentials: 'include'
             });
             
             if (capResponse.status === 200) {
                setIsAuthenticated(true);
                setIsUnauthorized(false);
                setLoginError(null);
                
                // Update current user from backend data
                if (data) {
                  // SECURE BY DEFAULT: Only upgrade to Administrator if we see an explicit Admin/Manager role
                  let parsedRole = 'View';
                  const roleRaw = (data.role || '').toUpperCase();
                  const authorities = (data.authorities || []).map((a: any) => 
                    typeof a === 'string' ? a.toUpperCase() : (a.authority || '').toUpperCase()
                  );

                  // Only grant admin if we find an EXACT match for Admin roles
                  const hasAdminPower = 
                    roleRaw === 'ROLE_ADMIN' || 
                    roleRaw === 'ADMIN' || 
                    roleRaw === 'ADMINISTRATOR' ||
                    roleRaw === 'MANAGER' ||
                    authorities.some(a => a === 'ROLE_ADMIN' || a === 'ADMIN' || a === 'ADMINISTRATOR' || a === 'MANAGER');

                  if (hasAdminPower) {
                    parsedRole = 'Administrator';
                  }
                  
                  console.log("[AUTH] Role Decided:", parsedRole, "| Raw Role:", roleRaw, "| Authorities:", authorities);

                  setCurrentUser({
                    id: data.id || data.sub || 'user',
                    name: data.name || data.email || 'Admin',
                    email: data.email || '',
                    role: parsedRole as any,
                    avatar: ''
                  });
                  setIsRoleVerified(true);
                }
              } else {
               // Initial auth failure should just drop to the login page, not force unauthorized UI
               setIsAuthenticated(false);
               setIsUnauthorized(false);
               setLoginError(null);
             }
          } catch (capErr) {
             setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error: any) {
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }
  }, []);

  const handleLogin = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      await checkSession();
      setIsAuthenticated(true);
      setIsUnauthorized(false);
    } catch (err) {
      console.warn("[AUTH] Backend sync failed, defaulting to View role.", err);
      setCurrentUser({ id: 'u_mock', name: 'Mock User', role: 'View' });
      setIsRoleVerified(true); // Verification complete (fallback)
      setIsAuthenticated(true);
    } finally {
      setIsAuthLoading(false);
    }
  }, [checkSession]);
  const handleLogout = useCallback(async () => {
    try {
      // Clear session on backend
      await axios.post(`${API_BASE_URL}/logout`, {}, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    } catch (err) {
      console.error('Backend logout failed', err);
      // Fallback: try GET if POST is not supported/configured differently
      try {
        await axios.get(`${API_BASE_URL}/logout`);
      } catch (getErr) {
        console.error('Backend logout GET fallback failed', getErr);
      }
    } finally {
      setIsAuthenticated(false);
      setIsUnauthorized(false);
      setLoginError(null);
      // Force reload to clear any sensitive memory/state and ensure a fresh start
      window.location.href = 'https://admin.karunavillas.com/login';
    }
  }, []);



  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasError = params.has('error');
    const urlError = params.get('error');
    
    if (hasError) {
      // If ?error is present (even if empty), trigger the full Access Restricted UI
      setLoginError(urlError === 'true' || urlError === '' ? 'unauthorized' : urlError);
    }
    
    checkSession();
  }, [checkSession]);

  const location = useLocation();
  const navigate = useNavigate();

  // Sync isUnauthorized state with URL redirects
  useEffect(() => {
    const isAtLogin = location.pathname.startsWith('/login');
    const isAtUnauthorized = location.pathname.startsWith('/unauthorized');
    
    if (isAtLogin && !location.search.includes('error')) {
      // ONLY reset the state if the user manually navigated to /login 
      // AND there is no error parameter in the current URL.
      setIsUnauthorized(false);
      setLoginError(null);
      // Hard reset user role on login page to prevent memory leaks from previous sessions
      setCurrentUser({ id: 'u_1', name: 'Mock User', role: 'View' });
      setIsRoleVerified(false);
    } else if ((loginError === 'unauthorized' || isUnauthorized) && !isAtUnauthorized) {
      navigate('/unauthorized', { replace: true });
    }
  }, [loginError, isUnauthorized, location.pathname, navigate]);


  // Polling logic for role verification in case of backend propagation delay
  const [authRetryCount, setAuthRetryCount] = useState(0);
  useEffect(() => {
    if (isAuthenticated && !isRoleVerified && authRetryCount < 6) {
      console.log(`[AUTH] Polling for role... Attempt ${authRetryCount + 1}`);
      const timer = setTimeout(() => {
        checkSession();
        setAuthRetryCount(prev => prev + 1);
      }, 3000); // Check every 3 seconds for 18 seconds total
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isRoleVerified, authRetryCount, checkSession]);

  // Auto-refresh logic to ensure backend session cookies are fully recognized by the browser
  useEffect(() => {
    if (isAuthenticated && !sessionStorage.getItem('initial_refresh_done')) {
      console.log("[AUTH] Triggering one-time quick refresh for session sync...");
      sessionStorage.setItem('initial_refresh_done', 'true');
      window.location.reload();
    }
    if (!isAuthenticated) {
      sessionStorage.removeItem('initial_refresh_done');
    }
  }, [isAuthenticated]);

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

  const isAdmin = isRoleVerified && currentUser.role === 'Administrator';

  useEffect(() => {
     console.log("[DEBUG] Auth State Updated:", { 
       role: currentUser.role, 
       isRoleVerified, 
       isAdmin, 
       isAuthenticated 
     });
  }, [currentUser.role, isRoleVerified, isAdmin, isAuthenticated]);

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
    if (isAuthenticated) {
      import('./services/api').then(api => {
        api.fetchMaintenanceTickets().then(setMaintenanceTickets).catch(err => {
          if (err.message !== 'AUTH_EXPIRED') console.error(err);
        });
      });
    }
  }, [isAuthenticated]);
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
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/payments`, {
        redirect: 'manual',
        credentials: 'include'
      });
      
      if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

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
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
        redirect: 'manual',
        credentials: 'include'
      });
      
      if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
        setIsAuthenticated(false);
        setIsUnauthorized(true);
        return;
      }

      if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
      const data: any[] = await response.json();

      const transformedBookings: Booking[] = data.map(b => {
        const room = roomsRef.current.find(r => String(r.number) === String(b.room));
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
          totalPaid: b.totalPaid, totalAmount: b.totalAmount, pendingBalance: b.balance,
        };
      });


      transformedBookings.sort((a, b) => {
        return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
      });

      setBookings(transformedBookings);

      // Map cleanStatus from allBooking response onto rooms & housekeeping
      const cleanStatusMap = new Map<number, string>();
      data.forEach((b: any) => {
        const room = roomsRef.current.find(r => String(r.number) === String(b.room));
        if (room && b.cleanStatus) {
          cleanStatusMap.set(room.id, b.cleanStatus);
        }
      });

      if (cleanStatusMap.size > 0) {
        setRooms(prev => {
          const hasChanged = prev.some(r => {
            const cs = cleanStatusMap.get(r.id);
            return cs && r.cleanStatus !== cs;
          });
          if (!hasChanged) return prev;
          return prev.map(r => {
            const cs = cleanStatusMap.get(r.id);
            return cs ? { ...r, cleanStatus: cs as any } : r;
          });
        });

        setHousekeepingTasks(prev => {
          let hasChanged = false;
          const updated = prev.map(t => {
            const cs = cleanStatusMap.get(t.roomId);
            const newStatus: HousekeepingStatus = cs === 'DIRTY' ? 'Dirty' : 'Clean';
            if (cs && t.status !== newStatus) {
              hasChanged = true;
              return { ...t, status: newStatus, priority: cs === 'DIRTY' ? 'High' : 'Low' };
            }
            return t;
          });

          cleanStatusMap.forEach((cs, roomId) => {
            if (!updated.find(t => t.roomId === roomId)) {
              hasChanged = true;
              updated.push({ id: `hk_api_${roomId}`, roomId, status: cs === 'DIRTY' ? 'Dirty' : 'Clean', priority: cs === 'DIRTY' ? 'High' : 'Low' });
            }
          });

          return hasChanged ? updated : prev;
        });
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, []); // Only fetchMaintenanceTickets and initial setup depend on this now. roomsRef handles the lookup.

  useEffect(() => { 
    if (isAuthenticated) {
      fetchBookings(); 
    }
  }, [fetchBookings, isAuthenticated]);


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
      if (isAuthenticated) {
        try {
          const forecast = await getAvailabilityForecast(rooms, bookings, forecastPage, today);
          setAvailabilityForecast(forecast);
        } catch (err: any) {
          if (err.message !== 'AUTH_EXPIRED') console.error(err);
        }
      }
    };
    fetchForecast();
  }, [bookings, rooms, forecastPage, today, isAuthenticated]);


  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
      const interval = setInterval(() => {
        fetchBookings();
      }, 30000); // Regular refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchBookings]);

  useEffect(() => {
    if (isAuthenticated && stats.totalCheckIns === 0) {
      const retryTimer = setInterval(() => {
        console.log("No check-ins found (0). Retrying fetch...");
        fetchBookings();
      }, 10000); // Check every 10 seconds if no data
      return () => clearInterval(retryTimer);
    }
  }, [isAuthenticated, stats.totalCheckIns, fetchBookings]);


  const addLog = useCallback((action: string, details: string) => {
    const newLog = { id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), action, user: currentUser.name, details };
    setLogs(prev => [newLog, ...prev]);
  }, [currentUser]);

  const handleVoiceCommand = useCallback((transcript: string) => {
    const result = parseVoiceCommand(transcript);
    
    // --- QUERY INTENT (CONVERSATIONAL ASSISTANT) ---
    if (result.intent === 'QUERY_BOOKING') {
      const qDate = result.data.checkIn; 
      const qName = result.data.guestName;
      
      let matches = bookings.filter(b => b.status !== BookingStatus.CANCELLED);
      
      // If a specific date was successfully parsed, filter for overlap
      if (qDate && qDate !== formatLocalDate(new Date())) { 
          // Note: "today" is the fallback for parseVoiceCommand if no date explicitly set,
          // so if date is different than today, it was explicitly asked for.
          // Wait, 'today' might be explicitly asked too.
        matches = matches.filter(b => b.checkInDate <= qDate && b.checkOutDate > qDate);
      } 
      
      if (qName) {
        matches = matches.filter(b => b.guestName.toLowerCase().includes(qName.toLowerCase()));
      }

      let responseText = '';
      if (matches.length > 0) {
        // STRICT FINANCIAL MASKING: Only construct phrase using Name, Dates, Room.
        const firstMatch = matches[0];
        responseText = `Yes, I found a booking for ${firstMatch.guestName}. They are checking in on ${firstMatch.checkInDate} in room ${firstMatch.roomId}.`;
        if (matches.length > 1) {
            responseText += ` There are also ${matches.length - 1} other matching bookings.`;
        }
      } else {
        responseText = "I'm sorry, I couldn't find any bookings matching that criteria.";
      }
      
      const utterance = new SpeechSynthesisUtterance(responseText);
      // Ensure the voice speaks clearly
      window.speechSynthesis.cancel(); 
      window.speechSynthesis.speak(utterance);
      return; 
    }

    // --- CREATE INTENT (NORMAL PRE-FILL MODE) ---
    if (!isAdmin) {
      alert("Access Denied: You have view-only access and cannot create bookings.");
      return;
    }
    const parsed = result.data;
    const defaultRoom = rooms.find(r => r.status === RoomStatus.AVAILABLE);
    
    setEditingBookingId(null);
    setNewBookingData({
      guestName: parsed.guestName || '', guestEmail: '', guestPhone: '',
      checkIn: parsed.checkIn || today,
      checkOut: parsed.checkOut || formatLocalDate(new Date(Date.now() + 86400000)),
      roomId: defaultRoom?.id || '', advance: 0, roomRate: defaultRoom?.pricePerNight || 0,
      source: parsed.source || BookingSource.DIRECT, 
      sources: [{ source: parsed.source || BookingSource.DIRECT, nightlyRate: defaultRoom?.pricePerNight || 0 }], 
      paymentMethod: PaymentMethod.CASH, 
      notes: parsed.notes || '',
      manualTotal: parsed.manualTotal,
      additionalCharges: [
        { category: 'Cleaning Fee', amount: 0 },
        { category: 'Guest Service Fee', amount: 0 },
        { category: 'Occupancy Taxes', amount: 0 }
      ]
    });
    setIsBookingModalOpen(true);
  }, [rooms, today, bookings, setEditingBookingId, setNewBookingData, setIsBookingModalOpen]);

  const handleOpenNewBooking = useCallback((preSelectedDate?: Date) => {
    if (!isAdmin) {
      alert("Access Denied: View-only access cannot create new bookings.");
      return;
    }
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
    setIsViewOnlyMode(!isAdmin ? true : isViewOnly);
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}`, {
        redirect: 'manual',
        credentials: 'include'
      });
      if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
        setIsAuthenticated(false);
        setIsUnauthorized(true);
        return;
      }
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
          let calculatedRate = fetchedBookingData.nightlyRate || 0;
          if (s.nightlyRate != null && s.amount != null && sNights > 0 && Math.abs(Number(s.nightlyRate) * sNights - Number(s.amount)) > 2) {
            calculatedRate = Number(s.amount) / sNights;
          } else if (s.nightlyRate != null) {
            calculatedRate = s.nightlyRate;
          } else if (s.amount != null && s.amount !== fetchedBookingData.totalAmount) {
            calculatedRate = Number(s.amount) / sNights;
          } else if (fetchedBookingData.bookingSources && fetchedBookingData.bookingSources.length === 1 && s.amount === fetchedBookingData.totalAmount && fetchedBookingData.nightlyRate) {
            calculatedRate = fetchedBookingData.nightlyRate;
          } else if (fetchedBookingData.bookingSources == null && s.amount === fetchedBookingData.totalAmount) {
            calculatedRate = fetchedBookingData.nightlyRate || (Number(s.amount) / sNights);
          } else if (s.amount != null) {
            calculatedRate = Number(s.amount) / sNights;
          }
          return { ...s, nightlyRate: calculatedRate };
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
    if (!isAdmin) {
      alert("Access Denied: You do not have permission to modify bookings.");
      return;
    }
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

      response = await fetch(url, { 
        method: method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(bookingPayload),
        redirect: 'manual',
        credentials: 'include'
      });
      if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
        setIsAuthenticated(false);
        setIsUnauthorized(true);
        return;
      }
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
    if (!isAdmin) {
      alert("Access Denied: You do not have permission to delete bookings.");
      return;
    }
    setBookingToDelete(bookingId);
  }, [isAdmin]);

  const confirmDeleteBooking = useCallback(() => {
    if (bookingToDelete) {
      const url = `${API_BASE_URL}/bookings/${bookingToDelete}`;
      fetch(url, { method: 'DELETE', redirect: 'manual', credentials: 'include' })
        .then(response => { 
          if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
            setIsAuthenticated(false);
            setIsUnauthorized(true);
            return;
          }
          if (!response.ok) throw new Error('Failed'); 
          fetchBookings(); 
        })
        .catch(error => {
          if (error.message !== 'AUTH_EXPIRED') alert(error.message);
        })
        .finally(() => setBookingToDelete(null));
    }
  }, [bookingToDelete, fetchBookings]);

  const handleAddPayment = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!selectedBooking) return;
    if (!isAdmin) {
      alert("Access Denied: You do not have permission to add payments.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const method = formData.get('method') as PaymentMethod;
    const type = formData.get('type') as PaymentType;
    const bookingSource = formData.get('bookingSource') as BookingSource || undefined;

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${selectedBooking.id}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: selectedBooking.id, amount, method, type, bookingSource, date: new Date().toISOString() }),
        redirect: 'manual',
        credentials: 'include'
      });
      if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
        setIsAuthenticated(false);
        setIsUnauthorized(true);
        return;
      }
      if (!response.ok) throw new Error('Failed to add payment');

      await fetchBookingPayments(selectedBooking.id); fetchBookings();
      setIsPaymentModalOpen(false); setSelectedBooking(null);
    } catch (error: any) { alert(error.message); }
  }, [selectedBooking, fetchBookings, fetchBookingPayments]);

  const updateBookingStatus = useCallback(async (bookingId: string, status: BookingStatus) => {
    if (!isAdmin && status !== BookingStatus.CONFIRMED && status !== BookingStatus.CHECKED_IN && status !== BookingStatus.CHECKED_OUT && status !== BookingStatus.CANCELLED) {
      // Allow nothing actually, because status updates modify
    }
    if (!isAdmin) {
      alert("Access Denied: You do not have permission to update booking statuses.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
        redirect: 'manual',
        credentials: 'include'
      });
      if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302 || response.status === 401) {
        setIsAuthenticated(false);
        setIsUnauthorized(true);
        return;
      }
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
    isAdmin, stats, upcomingArrivals, upcomingDepartures, rooms, logs, availabilityForecast, bookings, housekeepingTasks,
    forecastPage, setForecastPage, handleDashboardFilter, handleEditBooking, handleOpenNewBooking, handleOpenDayDetails,
    today, isRevenueVisible, setIsRevenueVisible: handleToggleRevenue
  };

  const bookingProps = {
    isAdmin,
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
    isAdmin,
    bookings,
    rooms,
    onEditBooking: handleEditBooking
  };

  if (isAuthLoading && window.location.pathname !== '/' && window.location.pathname !== '/login') {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[10000]">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin mb-6"></div>
        <div className="flex flex-col items-center gap-2 text-center px-6">
           <h2 className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: '"Playfair Display", serif' }}>Karuna Villa Admin</h2>
           <div className="flex items-center gap-2 text-slate-400 text-sm">
             <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
             <p className="font-medium">Verifying secure session...</p>
           </div>
        </div>
        <div className="absolute bottom-10 text-[10px] text-slate-300 uppercase tracking-widest font-semibold">Anurak Labs Security</div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <>
        <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginPage onLogin={handleLogin} isUnauthorized={isUnauthorized || loginError === 'unauthorized'} errorCode={loginError} /> : <Navigate to="/" replace />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route path="/" element={isAuthenticated ? <DashboardLayout onLogout={handleLogout} onDashboardClick={fetchBookings} onVoiceBooking={handleVoiceCommand} rooms={rooms} currentUser={currentUser} isVerifying={isAuthenticated && !isRoleVerified} /> : <Navigate to="/login" replace />}>
            <Route index element={<DashboardPage dashboardProps={dashboardProps} />} />
            <Route path="bookings" element={isAdmin ? <BookingsPage bookingProps={bookingProps} /> : <Navigate to="/unauthorized" replace />} />
            <Route path="calendar" element={<CalendarPage calendarProps={calendarProps} />} />
            <Route path="rooms" element={<RoomsPage rooms={rooms} bookings={bookings} housekeepingTasks={housekeepingTasks} setHousekeepingTasks={setHousekeepingTasks} maintenanceTickets={maintenanceTickets} setMaintenanceTickets={setMaintenanceTickets} />} />
            <Route path="guests" element={<GuestsPage />} />
            <Route path="dining" element={<FoodPage rooms={rooms} />} />
            <Route path="finance" element={isAdmin ? <FinancePage /> : <Navigate to="/unauthorized" replace />} />
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
      </>
    </LanguageProvider>
  );
}
