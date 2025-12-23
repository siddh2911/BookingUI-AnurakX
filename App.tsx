import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { getAvailabilityForecast } from './services/api';
import { Room, Booking, AuditLog, User, RoomStatus, BookingStatus, BookingSource, PaymentMethod, PaymentType } from './types';
import { INITIAL_ROOMS, INITIAL_BOOKINGS, MOCK_USER } from './constants';

import Sidebar from './components/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import BookingList from './components/bookings/BookingList';
import NewBookingModal from './components/modals/NewBookingModal';
import PaymentModal from './components/modals/PaymentModal';

export default function App() {
  // --- State ---
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [currentUser] = useState<User>(MOCK_USER);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Edit State
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  
  const [forecastPage, setForecastPage] = useState(0);
  const [currentBookingPayments, setCurrentBookingPayments] = useState<Payment[]>([]); // State for payments of the currently selected booking

  const fetchBookingPayments = useCallback(async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/payments`);
      if (!response.ok) {
        throw new Error(`Failed to fetch payments for booking ${bookingId}: ${response.statusText}`);
      }
      const data: Payment[] = await response.json();
      setCurrentBookingPayments(data);
    } catch (error) {
      console.error(`Error fetching payments for booking ${bookingId}:`, error);
      setCurrentBookingPayments([]);
    }
  }, []);

  // Filter State
  const [bookingFilter, setBookingFilter] = useState<{ 
      status?: BookingStatus; 
      date?: string; 
      type?: 'checkin' | 'checkout' | 'pending';
      label?: string;
  } | null>(null);

  // Derived State
  const today = new Date().toISOString().split('T')[0];

  const [newBookingData, setNewBookingData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: today,
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    roomId: '',
    advance: 0,
    roomRate: 0,
    source: BookingSource.DIRECT,
    paymentMethod: PaymentMethod.CASH,
    notes: ''
  });

  const fetchBookings = useCallback(async () => {
    try {
      const response = await fetch('https://booking-anurakx.onrender.com/allBooking');
      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.statusText}`);
      }
      const data: any[] = await response.json(); // Backend booking format

                              const transformedBookings: Booking[] = data.map(b => {

                                // Find roomId based on room number from backend

                                const room = rooms.find(r => r.number === b.room);

                        const roomId = room ? room.id : '';

                        console.log(`Debug fetchBookings: Backend room number "${b.room}" mapped to frontend roomId "${roomId}"`);

        return {
          id: b.id,
          roomId: roomId,
          guestName: b.guest,
          guestEmail: b.guestEmail, // Assuming this is correct for email
          guestPhone: b.contactNumber, // Map contactNumber from API to guestPhone
          checkInDate: new Date(b.checkInDate).toISOString().split('T')[0],
          checkOutDate: new Date(b.checkOutDate).toISOString().split('T')[0],
          source: b.bookingSource as BookingSource, // Ensure type compatibility
          status: b.status as BookingStatus, // Ensure type compatibility
          totalPaid: b.totalPaid, // Map totalPaid from backend
          pendingBalance: b.balance, // Map balance to pendingBalance
          // totalAmount and payments are not provided by /allBooking, so leave them undefined or default
        };
      });
      setBookings(transformedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, [rooms, setBookings]); // Added setBookings to dependencies

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const stats = useMemo(() => {
    const parseDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPaid || 0), 0);

    const revenueToday = bookings.filter(b => {
        const bookingDay = new Date(b.checkInDate);
        bookingDay.setHours(0, 0, 0, 0); // Normalize to start of day
        return bookingDay.getTime() >= startOfDay.getTime();
    }).reduce((sum, b) => sum + (b.totalPaid || 0), 0);

    const revenueWeek = bookings.filter(b => {
        const bookingDay = new Date(b.checkInDate);
        bookingDay.setHours(0, 0, 0, 0); // Normalize to start of day
        return bookingDay.getTime() >= startOfWeek.getTime();
    }).reduce((sum, b) => sum + (b.totalPaid || 0), 0);

    const revenueMonth = bookings.filter(b => {
        const bookingDay = new Date(b.checkInDate);
        bookingDay.setHours(0, 0, 0, 0); // Normalize to start of day
        return bookingDay.getTime() >= startOfMonth.getTime();
    }).reduce((sum, b) => sum + (b.totalPaid || 0), 0);

    const revenueYear = bookings.filter(b => {
        const bookingDay = new Date(b.checkInDate);
        bookingDay.setHours(0, 0, 0, 0); // Normalize to start of day
        return bookingDay.getTime() >= startOfYear.getTime();
    }).reduce((sum, b) => sum + (b.totalPaid || 0), 0);

    const checkInsToday = bookings.filter(b => b.checkInDate === today && b.status !== BookingStatus.CANCELLED).length;
    const checkInsWeek = bookings.filter(b => parseDate(b.checkInDate) >= startOfWeek && b.status !== BookingStatus.CANCELLED).length;
    const checkInsMonth = bookings.filter(b => parseDate(b.checkInDate) >= startOfMonth && b.status !== BookingStatus.CANCELLED).length;
    const checkInsYear = bookings.filter(b => parseDate(b.checkInDate) >= startOfYear && b.status !== BookingStatus.CANCELLED).length;
    const totalCheckIns = bookings.filter(b => b.status !== BookingStatus.CANCELLED).length;

    const calculateOccupancyRate = (startDate: Date, endDate: Date) => {
        const totalRooms = rooms.length;
        if (totalRooms === 0) return 0;
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysInPeriod = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        const totalAvailableRoomNights = totalRooms * daysInPeriod;
        let occupiedRoomNights = 0;
        const activeBookings = bookings.filter(b => b.status !== BookingStatus.CANCELLED);
        activeBookings.forEach(booking => {
            const bStart = parseDate(booking.checkInDate);
            const bEnd = parseDate(booking.checkOutDate);
            const start = bStart > startDate ? bStart : startDate;
            const end = bEnd < endDate ? bEnd : endDate;
            if (end > start) {
                const overlapTime = end.getTime() - start.getTime();
                occupiedRoomNights += Math.ceil(overlapTime / (1000 * 3600 * 24));
            }
        });
        return Math.round((occupiedRoomNights / totalAvailableRoomNights) * 100);
    };

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(todayStart); monthStart.setDate(monthStart.getDate() - 29);
    const yearStart = new Date(todayStart); yearStart.setDate(yearStart.getDate() - 364);
    const allDates = bookings.map(b => parseDate(b.checkInDate).getTime());
    const minDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : todayStart;

    return { 
      totalRevenue, revenueToday, revenueWeek, revenueMonth, revenueYear,
      occupancyToday: calculateOccupancyRate(todayStart, todayEnd),
      occupancyWeek: calculateOccupancyRate(weekStart, todayEnd),
      occupancyMonth: calculateOccupancyRate(monthStart, todayEnd),
      occupancyYear: calculateOccupancyRate(yearStart, todayEnd),
      occupancyAllTime: calculateOccupancyRate(minDate, todayEnd),
      checkInsToday, checkInsWeek, checkInsMonth, checkInsYear, totalCheckIns
    };
  }, [bookings, rooms, today]);

  const revenueChartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0,0,0,0);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);
        const dayRevenue = bookings
            .filter(b => {
                const checkIn = new Date(b.checkInDate);
                checkIn.setHours(0,0,0,0); // Normalize checkInDate to start of day
                return checkIn.getTime() >= d.getTime() && checkIn.getTime() < nextD.getTime();
            })
            .reduce((sum, b) => sum + (b.totalPaid || 0), 0);
        return { name: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: dayRevenue };
    }).reverse();
  }, [bookings]);
  // ... other state
  
  const [availabilityForecast, setAvailabilityForecast] = useState<{ date: Date; availableRooms: Room[] }[]>([]);

  // ... other hooks

  const upcomingArrivals = useMemo(() => {
    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    const limitDate = new Date(todayDate); limitDate.setDate(limitDate.getDate() + 7);
    return bookings.filter(b => {
       const checkIn = new Date(b.checkInDate); checkIn.setHours(0,0,0,0);
       return checkIn >= todayDate && checkIn <= limitDate && b.status !== BookingStatus.CANCELLED && b.status !== BookingStatus.CHECKED_OUT;
    }).sort((a,b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());
  }, [bookings]);

  useEffect(() => {
    const fetchForecast = async () => {
      const forecast = await getAvailabilityForecast(rooms, bookings, forecastPage, today);
      setAvailabilityForecast(forecast);
    };
    fetchForecast();
  }, [bookings, rooms, forecastPage, today]);



  const filteredBookings = useMemo(() => {
    if (!bookingFilter) return bookings;
    return bookings.filter(b => {
        if (bookingFilter.status && b.status !== bookingFilter.status) return false;
        if (bookingFilter.type === 'checkin' && bookingFilter.date && b.checkInDate !== bookingFilter.date) return false;
        if (bookingFilter.type === 'pending') {
            return (b.totalAmount - b.payments.reduce((sum, p) => sum + p.amount, 0)) > 0;
        }
        return true;
    });
  }, [bookings, bookingFilter]);

  const addLog = useCallback((action: string, details: string) => {
    const newLog = { id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), action, user: currentUser.name, details };
    setLogs(prev => [newLog, ...prev]);
  }, [currentUser]);

  const handleOpenNewBooking = useCallback((preSelectedDate?: Date) => {
    const defaultRoom = rooms.find(r => r.status === RoomStatus.AVAILABLE);
    setEditingBookingId(null);
    setNewBookingData({
      guestName: '', guestEmail: '', guestPhone: '',
      checkIn: preSelectedDate ? preSelectedDate.toISOString().split('T')[0] : today,
      checkOut: preSelectedDate ? new Date(preSelectedDate.getTime() + 86400000).toISOString().split('T')[0] : new Date(Date.now() + 86400000).toISOString().split('T')[0],
      roomId: defaultRoom?.id || '', advance: 0, roomRate: defaultRoom?.pricePerNight || 0,
      source: BookingSource.DIRECT, paymentMethod: PaymentMethod.CASH, notes: ''
    });
    setIsBookingModalOpen(true);
  }, [rooms, today, setEditingBookingId, setNewBookingData, setIsBookingModalOpen]);

  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false); // New state for view-only mode

  const handleEditBooking = useCallback(async (booking: Booking, isViewOnly = false) => {
    setEditingBookingId(booking.id);
    setIsViewOnlyMode(isViewOnly); // Set the view-only mode state
    try {
      const response = await fetch(`https://booking-anurakx.onrender.com/bookings/${booking.id}`); // Fetch specific booking
      if (!response.ok) {
        throw new Error(`Failed to fetch booking for edit: ${response.statusText}`);
      }
      const fetchedBookingData = await response.json(); // Assuming backend returns BookingDTO or similar
      
      // Map fetched data to newBookingData state format
      // Note: The fetchedBookingData might be in the BookingDTO format or similar
      // Need to adjust mapping if fields are different. Assuming here it's similar to our DTO
      setNewBookingData({
        guestName: fetchedBookingData.fullName || '', // Map to guestName
        guestEmail: fetchedBookingData.emailId || '', // Map to guestEmail
        guestPhone: fetchedBookingData.mobileNumber || '', // Map to guestPhone
        checkIn: fetchedBookingData.checkInDate || '', // YYYY-MM-DD
        checkOut: fetchedBookingData.checkOutDate || '', // YYYY-MM-DD
        roomId: rooms.find(r => r.number === fetchedBookingData.roomNo)?.id || '', // Map room number to ID
        roomRate: fetchedBookingData.nightlyRate || 0, // Map nightlyRate
        advance: fetchedBookingData.advanceAmount || 0, // Map advanceAmount
        source: fetchedBookingData.bookingSource as BookingSource || BookingSource.DIRECT, // Map bookingSource
        paymentMethod: fetchedBookingData.paymentMethod as PaymentMethod || PaymentMethod.CASH, // Map paymentMethod
        notes: fetchedBookingData.internalNotes || '' // Map internalNotes
      });
      setIsBookingModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching booking for edit:', error.message);
      alert(`Error fetching booking for edit: ${error.message}`);
      setEditingBookingId(null); // Clear editing state if fetch fails
    }
  }, [setEditingBookingId, setNewBookingData, setIsBookingModalOpen, rooms]);

  const handleSaveBooking = useCallback(async (e: React.FormEvent<HTMLFormElement>, selectedRoom: Room | undefined) => {
    e.preventDefault();
    const { checkIn, checkOut, guestName, roomRate, advance, paymentMethod, source, notes, guestEmail, guestPhone } = newBookingData;
    const room = selectedRoom;
    if (!room) {
      alert("Selected room not found.");
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      alert("Check-out date must be after check-in date.");
      return;
    }

    // Construct BookingDTO payload
    const bookingPayload = {
      fullName: guestName,
      emailId: guestEmail,
      mobileNumber: guestPhone,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      roomNo: room?.number || '', // Ensure roomNo is always a string, even if room.number is missing
      nightlyRate: roomRate,
      bookingSource: source,
      advanceAmount: advance,
      paymentMethod: paymentMethod,
      internalNotes: notes,
      totalAmount: bookingTotal, // Add totalAmount here
    };

    if (!room?.number) {
        console.warn('Booking payload being sent with missing room number. Check selectedRoom object for integrity:', room);
    }

    try {
      let response;
      let url = 'https://booking-anurakx.onrender.com/saveBooking'; // Updated for new booking API
      let method = 'POST';

      if (editingBookingId) {
        url = `https://booking-anurakx.onrender.com/bookings/${editingBookingId}`; // Updated for specific update API
        method = 'PUT';
      }

      response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let responseData: any = {};

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        // If not JSON, try to read as text for debugging
        const textResponse = await response.text();
        console.warn('API response was not JSON:', textResponse);
        // If the server returns a non-JSON error, we'll use a generic message
        if (!response.ok) {
            throw new Error(textResponse || `Server error during ${method} booking`);
        }
        // If it's a successful but non-JSON response (e.g., 204 No Content),
        // we might not expect data, so just proceed.
      }
      
      if (!response.ok) {
        // If response.ok is false, and we got JSON, use its message.
        // Otherwise, use a generic error or the textResponse if available.
        throw new Error(responseData.message || `Failed to ${editingBookingId ? 'update' : 'save'} booking. Status: ${response.status}`);
      }

      console.log(`Booking ${editingBookingId ? 'updated' : 'saved'} successfully:`, responseData);
      addLog(editingBookingId ? 'Update Booking' : 'Create Booking', `${editingBookingId ? 'Updated' : 'Created'} booking for ${guestName} in Room ${room.number}.`);
      
      setIsBookingModalOpen(false);
      setEditingBookingId(null);
      setNewBookingData({
        guestName: '', guestEmail: '', guestPhone: '',
        checkIn: today,
        checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        roomId: '', advance: 0, roomRate: 0,
        source: BookingSource.DIRECT, paymentMethod: PaymentMethod.CASH, notes: ''
      });
      fetchBookings(); // Refresh the list after save/update
      
    } catch (error: any) {
      console.error(`Error ${editingBookingId ? 'updating' : 'saving'} booking:`, error.message);
      alert(`Error ${editingBookingId ? 'updating' : 'saving'} booking: ${error.message}`);
    }
  }, [newBookingData, rooms, editingBookingId, addLog, setIsBookingModalOpen, setNewBookingData, today, fetchBookings]);

  const handleDeleteBooking = useCallback((bookingId: string) => {
    if (window.confirm("Are you sure you want to delete this booking? This action cannot be undone.")) {
      // Assuming a DELETE API endpoint for bookings
      const url = `https://booking-anurakx.onrender.com/bookings/${bookingId}`; // Updated for specific delete API
      fetch(url, {
        method: 'DELETE',
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to delete booking: ${response.statusText}`);
        }
        const bookingToDelete = bookings.find(b => b.id === bookingId);
        if (bookingToDelete) {
          addLog('Delete Booking', `Deleted booking for ${bookingToDelete.guestName} (ID: ${bookingId}).`);
        }
        fetchBookings(); // Refresh the list after successful deletion
      })
      .catch(error => {
        console.error('Error deleting booking:', error);
        alert(`Error deleting booking: ${error.message}`);
      });
    }
  }, [addLog, bookings, fetchBookings]);

  const handleAddPayment = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBooking) return;
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const method = formData.get('method') as PaymentMethod;
    const type = formData.get('type') as PaymentType;

    // Assuming a POST API endpoint for adding payments to a booking
    // This API should handle associating the payment with the selectedBooking.id
    try {
      const response = await fetch(`/api/bookings/${selectedBooking.id}/payments`, { // Placeholder API endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          amount,
          method,
          type,
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add payment');
      }

      addLog('Add Payment', `Received ${amount} from ${selectedBooking.guestName}`);
      
      // Refresh current booking payments and all bookings after successful payment
      await fetchBookingPayments(selectedBooking.id); 
      fetchBookings(); 
      
      setIsPaymentModalOpen(false);
      setSelectedBooking(null);

    } catch (error: any) {
      console.error('Error adding payment:', error.message);
      alert(`Error adding payment: ${error.message}`);
    }
  }, [selectedBooking, addLog, setIsPaymentModalOpen, setSelectedBooking, fetchBookings, fetchBookingPayments]);

  const updateBookingStatus = useCallback(async (bookingId: string, status: BookingStatus) => {
    try {
      // Assuming a PUT API endpoint for updating booking status
      const response = await fetch(`/api/bookings/${bookingId}/status`, { // Placeholder API endpoint
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update booking status for ${bookingId}`);
      }

      addLog('Status Update', `Booking ${bookingId} status changed to ${status}`);
      fetchBookings(); // Refresh the list after successful status update

    } catch (error: any) {
      console.error('Error updating booking status:', error.message);
      alert(`Error updating booking status: ${error.message}`);
    }
  }, [addLog, fetchBookings]);

  const handleDashboardFilter = useCallback((filter: any) => {
    setBookingFilter(filter);
    setActiveTab('bookings');
  }, [setBookingFilter, setActiveTab]);

  const bookingNights = Math.max(1, Math.ceil((new Date(newBookingData.checkOut).getTime() - new Date(newBookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
  const bookingTotal = (newBookingData.roomRate || 0) * bookingNights;

  let paidAmount = newBookingData.advance; // Default for new booking
  let bookingPending = bookingTotal - paidAmount; // Default for new booking

  if (editingBookingId) {
    const originalBooking = bookings.find(b => b.id === editingBookingId);
    if (originalBooking) {
      // For edited bookings, use the pendingBalance from the fetched original booking
      // and derive paidAmount based on the current bookingTotal
      bookingPending = originalBooking.pendingBalance || 0;
      paidAmount = bookingTotal - bookingPending;
    }
  }

  // Ensure paidAmount and bookingPending are not negative
  paidAmount = Math.max(0, paidAmount);
  bookingPending = Math.max(0, bookingPending);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setBookingFilter={setBookingFilter}
        currentUser={currentUser}
        isSidebarOpen={isSidebarOpen}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
         <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white shadow-md z-20">
            <span className="font-bold text-xl text-blue-400">Karuna Villa</span>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
               {isSidebarOpen ? <X size={24}/> : <Menu size={24}/>}
            </button>
         </div>

         <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           {activeTab === 'dashboard' && (
             <Dashboard 
               stats={stats}
               revenueChartData={revenueChartData}
               upcomingArrivals={upcomingArrivals}
               rooms={rooms}
               logs={logs}
               availabilityForecast={availabilityForecast}
               forecastPage={forecastPage}
               setForecastPage={setForecastPage}
               handleDashboardFilter={handleDashboardFilter}
               handleEditBooking={handleEditBooking}
               handleOpenNewBooking={handleOpenNewBooking}
               today={today}
             />
           )}
           {activeTab === 'bookings' && (
             <BookingList 
               bookings={filteredBookings}
               rooms={rooms}
               bookingFilter={bookingFilter}
               setBookingFilter={setBookingFilter}
               onOpenNewBooking={handleOpenNewBooking}
               onUpdateStatus={updateBookingStatus}
               onEditBooking={handleEditBooking}
               onAddPayment={async (booking) => { setSelectedBooking(booking);     await fetchBookingPayments(booking.id); // Fetch payments before opening modal
    setIsPaymentModalOpen(true); }}
               onDeleteBooking={handleDeleteBooking}
             />
           )}
         </main>
      </div>

      <NewBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => { setIsBookingModalOpen(false); setIsViewOnlyMode(false); }} // Reset view-only mode on close
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
        readOnly={isViewOnlyMode} // Pass the state to the modal
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedBooking={selectedBooking}
        handleAddPayment={handleAddPayment}
        payments={currentBookingPayments} // Pass current booking payments
      />
    </div>
  );
}
