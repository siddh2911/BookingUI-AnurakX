import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Room, BookingSource, PaymentMethod, Booking } from '../../types';
import { User, Calendar, CreditCard, ChevronDown, Sparkles, MapPin } from 'lucide-react';
import { getAvailableRooms } from "../../services/api";

interface NewBookingModalProps {
   isOpen: boolean;
   onClose: () => void;
   editingBookingId: string | null;
   newBookingData: any;
   setNewBookingData: (data: any) => void;
   handleSaveBooking: (e: React.FormEvent<HTMLFormElement>, selectedRoom: Room | undefined) => void;
   rooms: Room[];
   bookings: Booking[];
   bookingNights: number;
   bookingTotal: number;
   paidAmount: number;
   bookingPending: number;
   readOnly?: boolean;
}

const NewBookingModal: React.FC<NewBookingModalProps> = ({
   isOpen,
   onClose,
   editingBookingId,
   newBookingData,
   setNewBookingData,
   handleSaveBooking,
   rooms,
   bookingNights,
   bookingTotal,
   paidAmount,
   bookingPending,
   readOnly = false,
}) => {
   const [apiAvailableRooms, setApiAvailableRooms] = useState<Room[]>([]);
   const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(false);
   const [roomFetchError, setRoomFetchError] = useState<string | null>(null);
   const [dateError, setDateError] = useState<string | null>(null);

   useEffect(() => {
      if (newBookingData.checkIn && newBookingData.checkOut) {
         if (new Date(newBookingData.checkOut) <= new Date(newBookingData.checkIn)) {
            setDateError('Check-out must be after check-in.');
         } else {
            setDateError(null);
         }
      }
   }, [newBookingData.checkIn, newBookingData.checkOut]);

   useEffect(() => {
      if (readOnly || !isOpen || !newBookingData.checkIn || !newBookingData.checkOut) {
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

            if (!newBookingData.roomId && fetchedRooms.length > 0) {
               setNewBookingData((prev: any) => ({
                  ...prev,
                  roomId: fetchedRooms[0].id,
                  roomRate: fetchedRooms[0].pricePerNight,
               }));
            }
         } catch (error: any) {
            setRoomFetchError(error.message || 'Failed to fetch rooms');
         } finally {
            setIsLoadingRooms(false);
         }
      };

      fetchAvailableRooms();
   }, [isOpen, newBookingData.checkIn, newBookingData.checkOut, readOnly]);

   const modalTitle = readOnly ? "Reservation Details" : editingBookingId ? "Modify Reservation" : "New Reservation";

   // Luxury Styles
   const sectionHeader = "text-lg md:text-xl text-slate-900 mb-4 md:mb-6 flex items-center gap-3 font-medium";
   const elegantInput = "w-full bg-slate-50/50 border-b border-slate-200 focus:border-slate-800 text-slate-800 px-0 py-2 md:py-3 text-sm md:text-base transition-all outline-none placeholder:text-slate-300 hover:bg-slate-50 focus:bg-transparent";
   const elegantLabel = "text-xs font-bold text-slate-400 uppercase tracking-widest";
   const floatingGroup = "relative";

   return (
      <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
         <form onSubmit={(e) => {
            e.preventDefault();
            const selectedRoom = apiAvailableRooms.find(r => Number(r.id) === Number(newBookingData.roomId)) || rooms.find(r => Number(r.id) === Number(newBookingData.roomId));
            handleSaveBooking(e, selectedRoom);
         }} className="min-h-[500px]">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">

               {/* LEFT: INPUTS (7 Cols) */}
               <div className="lg:col-span-7 space-y-6 lg:space-y-10 py-2">

                  {/* GUEST SECTION */}
                  <div className="space-y-6">
                     <h3 className={sectionHeader} style={{ fontFamily: '"Playfair Display", serif' }}>
                        <User size={22} className="text-slate-300" strokeWidth={1.5} /> Guest Information
                     </h3>
                     <div className="grid grid-cols-1 gap-6">
                        <div className={floatingGroup}>
                           <label className={elegantLabel}>Full Name</label>
                           <input name="guestName" required className={elegantInput} placeholder="Enter guest name" value={newBookingData.guestName} onChange={(e) => setNewBookingData({ ...newBookingData, guestName: e.target.value })} disabled={readOnly} />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                           <div className={floatingGroup}>
                              <label className={elegantLabel}>Contact Number</label>
                              <input name="guestPhone" required pattern="^(?:\+91)?[0-9]{10}$" className={elegantInput} placeholder="+91..." value={newBookingData.guestPhone} onChange={(e) => setNewBookingData({ ...newBookingData, guestPhone: e.target.value })} disabled={readOnly} />
                           </div>
                           <div className={floatingGroup}>
                              <label className={elegantLabel}>Email Address</label>
                              <input name="guestEmail" type="email" className={elegantInput} placeholder="email@example.com" value={newBookingData.guestEmail} onChange={(e) => setNewBookingData({ ...newBookingData, guestEmail: e.target.value })} disabled={readOnly} />
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* STAY SECTION */}
                  <div className="space-y-6">
                     <h3 className={sectionHeader} style={{ fontFamily: '"Playfair Display", serif' }}>
                        <Calendar size={22} className="text-slate-300" strokeWidth={1.5} /> Stay Details
                     </h3>
                     <div className="grid grid-cols-2 gap-6">
                        <div className={floatingGroup}>
                           <label className={elegantLabel}>Check-In</label>
                           <input type="date" name="checkIn" required className={elegantInput} value={newBookingData.checkIn} onChange={(e) => setNewBookingData({ ...newBookingData, checkIn: e.target.value })} disabled={readOnly} />
                        </div>
                        <div className={floatingGroup}>
                           <label className={elegantLabel}>Check-Out</label>
                           <input type="date" name="checkOut" required className={elegantInput} value={newBookingData.checkOut} onChange={(e) => setNewBookingData({ ...newBookingData, checkOut: e.target.value })} disabled={readOnly} />
                        </div>
                     </div>
                     {dateError && <p className="text-red-500 text-sm mt-2">{dateError}</p>}
                  </div>

                  {/* ROOM SECTION */}
                  <div className="space-y-6">
                     <h3 className={sectionHeader} style={{ fontFamily: '"Playfair Display", serif' }}>
                        <MapPin size={22} className="text-slate-300" strokeWidth={1.5} /> Room Selection
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={floatingGroup}>
                           <label className={elegantLabel}>{isLoadingRooms ? "Finding Rooms..." : "Select Room"}</label>
                           {readOnly ? (
                              <input className={elegantInput} value={`Room ${rooms.find(r => r.id === newBookingData.roomId)?.number || 'N/A'}`} disabled />
                           ) : (
                              <div className="relative">
                                 <select
                                    name="roomId"
                                    className={`${elegantInput} appearance-none cursor-pointer`}
                                    value={newBookingData.roomId}
                                    onChange={(e) => {
                                       const r = apiAvailableRooms.find(room => room.id === Number(e.target.value));
                                       setNewBookingData({ ...newBookingData, roomId: Number(e.target.value), roomRate: r ? r.pricePerNight : 0 });
                                    }}
                                    disabled={isLoadingRooms}
                                 >
                                    <option value="">Choose available room...</option>
                                    {apiAvailableRooms.map(r => <option key={r.id} value={r.id}>Room {r.number} — {r.type}</option>)}
                                    {newBookingData.roomId && !apiAvailableRooms.find(r => r.id === newBookingData.roomId) && (
                                       <option value={newBookingData.roomId}>Room {rooms.find(r => r.id === newBookingData.roomId)?.number} (Current)</option>
                                    )}
                                 </select>
                                 <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                              </div>
                           )}
                        </div>
                        <div className={floatingGroup}>
                           <label className={elegantLabel}>Nightly Rate (₹)</label>
                           <input type="number" name="roomRate" required className={elegantInput} value={newBookingData.roomRate} onChange={(e) => setNewBookingData({ ...newBookingData, roomRate: parseFloat(e.target.value) })} disabled={readOnly} />
                        </div>
                     </div>
                  </div>
               </div>


               {/* RIGHT: BILLING CARD (5 Cols) */}
               <div className="lg:col-span-5">
                  <div className="bg-slate-900 rounded-2xl md:rounded-3xl p-5 md:p-8 text-white h-full flex flex-col justify-between shadow-2xl shadow-slate-900/20 relative overflow-hidden">
                     {/* Decorative gradient blob */}
                     <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                     <div className="space-y-8 relative z-10">
                        <div>
                           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                              <CreditCard size={14} /> Payment Summary
                           </h3>
                           <p className="text-3xl font-serif mt-2">₹{(newBookingData.roomRate * bookingNights).toLocaleString()}</p>
                           <p className="text-slate-400 text-sm mt-1">Total cost for {bookingNights} nights</p>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-white/10">
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-300">Room Rate</span>
                              <span>₹{newBookingData.roomRate} / night</span>
                           </div>

                           {!readOnly && (
                              <div className="flex justify-between items-center text-sm">
                                 <span className="text-slate-300">Advance Paid</span>
                                 <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1 border border-white/10">
                                    <span className="text-slate-400">₹</span>
                                    <input
                                       type="number"
                                       className="w-20 bg-transparent text-right outline-none text-white placeholder:text-white/20"
                                       placeholder="0"
                                       value={newBookingData.advance}
                                       onChange={(e) => setNewBookingData({ ...newBookingData, advance: parseFloat(e.target.value) })}
                                    />
                                 </div>
                              </div>
                           )}
                           {readOnly && paidAmount > 0 && (
                              <div className="flex justify-between items-center text-sm text-green-400">
                                 <span className="flex items-center gap-2"><Sparkles size={12} /> Paid</span>
                                 <span>- ₹{paidAmount.toLocaleString()}</span>
                              </div>
                           )}

                           <div className="flex justify-between items-center text-lg font-medium pt-4 border-t border-white/10 text-white">
                              <span>Balance Due</span>
                              <span>₹{bookingPending.toLocaleString()}</span>
                           </div>
                        </div>

                        {!readOnly && (
                           <div className="pt-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Payment Method</label>
                              <select
                                 className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-sm px-3 py-2 outline-none focus:bg-white/10 transition-colors cursor-pointer"
                                 value={newBookingData.paymentMethod}
                                 onChange={(e) => setNewBookingData({ ...newBookingData, paymentMethod: e.target.value })}
                              >
                                 {Object.values(PaymentMethod).map(m => <option key={m} value={m} className="bg-slate-800 text-white">{m}</option>)}
                              </select>
                           </div>
                        )}
                     </div>

                     <div className="mt-8 pt-6 relative z-10">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Internal Notes</label>
                        <textarea
                           className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-sm p-3 outline-none focus:bg-white/10 transition-colors h-24 resize-none placeholder:text-slate-600"
                           placeholder="Add notes..."
                           value={newBookingData.notes}
                           onChange={(e) => setNewBookingData({ ...newBookingData, notes: e.target.value })}
                           disabled={readOnly}
                        />

                        <div className="mt-6 flex gap-3">
                           <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors text-sm font-medium">
                              Cancel
                           </button>
                           {!readOnly && (
                              <button
                                 type="submit"
                                 disabled={!!dateError || isLoadingRooms}
                                 className="flex-[2] py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-50 transition-colors text-sm shadow-lg disabled:opacity-50"
                              >
                                 {editingBookingId ? "Save Changes" : "Confirm Booking"}
                              </button>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </form>
      </Modal>
   );
};

export default NewBookingModal;
