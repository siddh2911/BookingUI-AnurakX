import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../ui/Modal';
import { Room, BookingSource, PaymentMethod, RoomStatus, Booking } from '../../types';
import { Users, CalendarDays, CreditCard } from 'lucide-react';
import { getAvailableRooms } from "../../services/api";

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBookingId: string | null;
  newBookingData: any;
  setNewBookingData: (data: any) => void;
  handleSaveBooking: (e: React.FormEvent<HTMLFormElement>, selectedRoom: Room | undefined) => void;
  rooms: Room[];
  bookings: Booking[]; // Add bookings prop
  bookingNights: number;
  bookingTotal: number;
  paidAmount: number;
  bookingPending: number;
  readOnly?: boolean; // New prop for view-only mode
}

const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  onClose,
  editingBookingId,
  newBookingData,
  setNewBookingData,
  handleSaveBooking,
  rooms,
  bookings, // Destructure bookings
  bookingNights,
  bookingTotal,
  paidAmount,
  bookingPending,
  readOnly = false, // Default to false if not provided
}) => {
  const [apiAvailableRooms, setApiAvailableRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(false);
  const [roomFetchError, setRoomFetchError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null); // New state for date validation

  console.log('Rooms in modal:', rooms);

  // Effect for date validation
  useEffect(() => {
    if (newBookingData.checkIn && newBookingData.checkOut) {
      const checkInDate = new Date(newBookingData.checkIn);
      const checkOutDate = new Date(newBookingData.checkOut);

      if (checkOutDate <= checkInDate) {
        setDateError('Check-out date must be after check-in date.');
      } else {
        setDateError(null);
      }
    } else {
      setDateError(null); // Clear error if dates are not fully selected
    }
  }, [newBookingData.checkIn, newBookingData.checkOut]);


  // Effect to fetch available rooms from API
  useEffect(() => {
    if (!isOpen || !newBookingData.checkIn || !newBookingData.checkOut) {
      setApiAvailableRooms([]);
      return;
    }

    const fetchAvailableRooms = async () => {
      setIsLoadingRooms(true);
      setRoomFetchError(null);
      try {
        const fetchedRooms = await getAvailableRooms({
          startDate: newBookingData.checkIn,
          endDate: newBookingData.checkOut,
        });
        setApiAvailableRooms(fetchedRooms);

        // If the currently selected room is no longer available, clear it
        const currentSelectedRoomExists = fetchedRooms.some(
          (room) => room.id === newBookingData.roomId
        );
        if (!currentSelectedRoomExists && newBookingData.roomId) {
          setNewBookingData((prev: any) => ({
            ...prev,
            roomId: '',
            roomRate: 0,
          }));
        } else if (!newBookingData.roomId && fetchedRooms.length > 0) {
          // If no room is selected, and there are available rooms, pre-select the first one
          setNewBookingData((prev: any) => ({
            ...prev,
            roomId: fetchedRooms[0].id,
            roomRate: fetchedRooms[0].pricePerNight,
          }));
        }
      } catch (error: any) {
        console.error('Error fetching available rooms:', error);
        setRoomFetchError(error.message || 'Failed to fetch available rooms');
        setApiAvailableRooms([]);
      } finally {
        console.log('fetchAvailableRooms: finally block executed, setting isLoadingRooms to false');
        setIsLoadingRooms(false);
      }
    };

    fetchAvailableRooms();
  }, [isOpen, newBookingData.checkIn, newBookingData.checkOut, setNewBookingData]);

  const modalTitle = readOnly
    ? "View Booking"
    : editingBookingId
      ? "Edit Booking"
      : "New Booking";


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
       <form onSubmit={(e) => {
          e.preventDefault(); // Prevent default form submission to handle it manually
          console.log('--- Form Submission Debug ---');
          console.log('apiAvailableRooms:', apiAvailableRooms);
          console.log('newBookingData.roomId:', newBookingData.roomId, ' (type: ', typeof newBookingData.roomId, ')');
          const selectedRoom = apiAvailableRooms.find(r => {
            console.log('  Comparing: r.id=', r.id, ' (type: ', typeof r.id, ') with newBookingData.roomId=', newBookingData.roomId);
            return Number(r.id) === Number(newBookingData.roomId);
          });
          console.log('selectedRoom found:', selectedRoom);
          handleSaveBooking(e, selectedRoom);
       }} className="space-y-6">
          
          {/* Guest Details */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Users size={16}/> Guest Information</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                   <input 
                      name="guestName" 
                      required 
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-10 bg-slate-50 border-slate-200" 
                      placeholder="John Doe" 
                      value={newBookingData.guestName}
                      onChange={(e) => setNewBookingData({...newBookingData, guestName: e.target.value})}
                      disabled={readOnly}
                   />
                </div>
                <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                   <input 
                      name="guestEmail" 
                      type="email" 
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-10 bg-slate-50 border-slate-200" 
                      placeholder="john@example.com"
                      value={newBookingData.guestEmail}
                      onChange={(e) => setNewBookingData({...newBookingData, guestEmail: e.target.value})}
                      disabled={readOnly}
                   />
                </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">Mobile Number</label>
                   <input 
                      name="guestPhone" 
                      required
                      pattern="^(?:\+91)?[0-9]{10}$"
                      title="Please enter a valid 10-digit Indian mobile number, optionally starting with +91"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-10 bg-slate-50 border-slate-200" 
                      placeholder="+91 98765 43210"
                      value={newBookingData.guestPhone}
                      onChange={(e) => setNewBookingData({...newBookingData, guestPhone: e.target.value})}
                      disabled={readOnly}
                   />
                </div>
             </div>
          </div>

          {/* Stay Details */}
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><CalendarDays size={16}/> Stay Details</h3>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Check In</label>
                    <input 
                       name="checkIn" 
                       type="date" 
                       required 
                       className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-10 bg-slate-50 border-slate-200" 
                       value={newBookingData.checkIn}
                       onChange={(e) => setNewBookingData({...newBookingData, checkIn: e.target.value})}
                       disabled={readOnly}
                    />
                 </div>
                                  <div>
                                     <label className="block text-xs font-medium text-slate-500 mb-1">Check Out</label>
                                     <input
                                        name="checkOut"
                                        type="date"
                                        required
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-10 bg-slate-50 border-slate-200"
                                        value={newBookingData.checkOut}
                                        onChange={(e) => setNewBookingData({...newBookingData, checkOut: e.target.value})}
                                        disabled={readOnly}
                                     />
                                     {dateError && <p className="text-red-500 text-xs mt-1">{dateError}</p>}
                                  </div>                                  <div>
                                     <label className="block text-xs font-medium text-slate-500 mb-1">{readOnly ? "Room Number" : "Select Room"}</label>
                                     {readOnly ? (
                                        <input
                                           type="text"
                                           className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 border-slate-200 cursor-not-allowed h-10"
                                           value={rooms.find(r => r.id === newBookingData.roomId)?.roomNumber || 'N/A'}
                                           disabled
                                        />
                                     ) : (
                                        <select
                                           name="roomId"
                                           required={!readOnly}
                                           className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-10 bg-slate-50 border-slate-200"
                                           value={newBookingData.roomId}
                                           onChange={(e) => {
                                               const selectedId = Number(e.target.value); // Convert to number
                                               const r = apiAvailableRooms.find(room => room.id === selectedId);
                                               console.log('Selected room pricePerNight:', r ? r.pricePerNight : 0); // Debug log
                                               setNewBookingData({
                                                   ...newBookingData,
                                                   roomId: selectedId, // Store as number
                                                   roomRate: r ? r.pricePerNight : 0
                                               });
                                           }}
                                           disabled={readOnly || isLoadingRooms}
                                        >
                                           <option value="">{isLoadingRooms ? "Loading rooms..." : (readOnly ? "Room not selected" : "Select a Room")}</option>
                                           {apiAvailableRooms.map(r => (
                                              <option key={r.id} value={r.id}>{r.roomNumber} - {r.type} (₹{r.pricePerNight}/night)</option>
                                           ))}
                                           {newBookingData.roomId && !apiAvailableRooms.find(r => r.id === newBookingData.roomId) && rooms.find(r => r.id === newBookingData.roomId) && (
                                             <option key={newBookingData.roomId} value={newBookingData.roomId}>
                                               {rooms.find(r => r.id === newBookingData.roomId)?.roomNumber} (Currently Selected - Not Available for dates)
                                             </option>
                                           )}
                                        </select>
                                     )}
                                     {roomFetchError && <p className="text-red-500 text-xs mt-1">{roomFetchError}</p>}
                                     {isLoadingRooms && <p className="text-blue-500 text-xs mt-1">Fetching available rooms...</p>}
                                  </div>                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{readOnly ? "Total Amount" : "Nightly Rate (₹)"}</label>
                                       <input 
                                          name="roomRate" 
                                          type="number" 
                                          required 
                                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-10 bg-slate-50 border-slate-200" 
                                          value={newBookingData.roomRate}
                                          onChange={(e) => setNewBookingData({...newBookingData, roomRate: parseFloat(e.target.value) || 0})}
                                          disabled={readOnly}
                                       />
                                    </div>
                                </div>
                                <div className="mt-4">
                                   <label className="block text-xs font-medium text-slate-500 mb-1">Booking Source</label>
                                   <select 
                                      name="source" 
                                      required 
                                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-10 bg-slate-50 border-slate-200"
                                      value={newBookingData.source}
                                      onChange={(e) => setNewBookingData({...newBookingData, source: e.target.value as BookingSource})}
                                      disabled={readOnly}
                                   >
                                      {Object.values(BookingSource).map(s => <option key={s} value={s}>{s}</option>)}
                                   </select>
                                </div>
                             </div>
                    
                             {/* Payment & Summary */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Payment Input (Hidden in Edit Mode) */}
                                {!editingBookingId && !readOnly && ( // Only show if not editing AND not readOnly
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                       <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><CreditCard size={16}/> Initial Payment</h3>
                                       <div className="space-y-4">
                                          <div>
                                             <label className="block text-xs font-medium text-slate-500 mb-1">Advance Amount (₹)</label>
                                             <input 
                                                name="advanceAmount" 
                                                type="number" 
                                                min="0"
                                                step="0.01"
                                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none h-10 bg-slate-50 border-slate-200" 
                                                placeholder="0.00"
                                                value={newBookingData.advance}
                                                onChange={(e) => setNewBookingData({...newBookingData, advance: parseFloat(e.target.value) || 0})}
                                                disabled={readOnly}
                                             />                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Payment Method</label>
                          <select 
                             name="paymentMethod" 
                             className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none h-10 bg-slate-50 border-slate-200"
                             value={newBookingData.paymentMethod}
                             onChange={(e) => setNewBookingData({...newBookingData, paymentMethod: e.target.value as PaymentMethod})}
                             disabled={readOnly}
                          >
                             {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                       </div>
                    </div>
                 </div>
             )}

             {/* Live Summary */}
             <div className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between ${editingBookingId || readOnly ? 'col-span-2' : ''}`}>
                 <h3 className="text-sm font-bold text-blue-800 mb-4">Booking Summary</h3>
                 <div className="space-y-3 text-sm">
                     <div className="flex justify-between">
                        <span className="text-slate-500">{editingBookingId ? 'Original Room Rate' : 'Room Rate'}</span>
                        <span className="font-medium text-slate-800">₹{newBookingData.roomRate} x {bookingNights} nights</span>
                     </div>
                     <div className="flex justify-between border-t border-slate-100 pt-3">
                        <span className="font-bold text-slate-800">Total Cost</span>
                        <span className="font-bold text-slate-800">₹{(editingBookingId && newBookingData.totalAmount !== undefined ? newBookingData.totalAmount : bookingTotal).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-green-700">
                        <span>{editingBookingId ? 'Previously Paid' : 'Advance Paid'}</span>
                        <span>-₹{paidAmount.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between border-t border-slate-100 pt-3 mt-1">
                        <span className="font-bold text-red-600">Pending Balance</span>
                        <span className="font-bold text-red-600">₹{bookingPending.toLocaleString()}</span>
                     </div>
                 </div>
             </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <label className="block text-xs font-medium text-slate-500 mb-2">Internal Notes</label>
             <textarea 
                 name="notes" 
                 className="w-full border rounded-lg p-3 text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 border-slate-200" 
                 placeholder="Special requests, housekeeping notes, etc..."
                 value={newBookingData.notes}
                 onChange={(e) => setNewBookingData({...newBookingData, notes: e.target.value})}
                 disabled={readOnly}
             ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
             <button type="button" onClick={onClose} className="px-6 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors">Cancel</button>
             {!readOnly && ( // Only show save button if not in read-only mode
               <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm transition-colors"
                       disabled={!!dateError || isLoadingRooms}>
                   {editingBookingId ? "Update Booking" : "Confirm Booking"}
               </button>
             )}
          </div>
       </form>
    </Modal>
  );
};

export default NewBookingModal;
