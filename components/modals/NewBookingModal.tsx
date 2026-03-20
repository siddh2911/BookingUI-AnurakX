import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import SecurityModal from './SecurityModal';
import { Room, BookingSource, PaymentMethod, Booking } from '../../types';
import { User, Calendar, CreditCard, ChevronDown, Sparkles, MapPin, Lock, X, Receipt, RotateCcw } from 'lucide-react';
import { getAvailableRooms, getRoomDetails } from "../../services/api";
import CustomSelect, { SelectOption } from '../ui/CustomSelect';
import PlatformIcon from '../common/PlatformIcon';
import DatePicker from '../ui/DatePicker';




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
   bookings,
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
   const [sourceDateError, setSourceDateError] = useState<string | null>(null);


   const [isFinancialsVisible, setIsFinancialsVisible] = useState(!readOnly);
   const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);


   useEffect(() => {
      setIsFinancialsVisible(!readOnly);
   }, [readOnly, isOpen]);

   useEffect(() => {
      if (!newBookingData.sources || newBookingData.sources.length < 2) {
         setSourceDateError(null);
         return;
      }

      let hasOverlap = false;
      const sources = newBookingData.sources;
      for (let i = 0; i < sources.length; i++) {
         for (let j = i + 1; j < sources.length; j++) {
            const start1 = new Date(sources[i].startDate || newBookingData.checkIn).getTime();
            const end1 = new Date(sources[i].endDate || newBookingData.checkOut).getTime();
            const start2 = new Date(sources[j].startDate || newBookingData.checkIn).getTime();
            const end2 = new Date(sources[j].endDate || newBookingData.checkOut).getTime();

            if (start1 < end2 && start2 < end1) {
               hasOverlap = true;
               break;
            }
         }
         if (hasOverlap) break;
      }

      if (hasOverlap) {
         setSourceDateError("Overlapping dates detected. Please adjust source dates or add remaining balance as an Extra Charge.");
      } else {
         setSourceDateError(null);
      }
   }, [newBookingData.sources, newBookingData.checkIn, newBookingData.checkOut]);

   const updateFromSources = (updatedSources: any[]) => {
      if (!updatedSources || updatedSources.length === 0) return;

      const sanitizedSources = updatedSources.map(s => ({
         ...s,
         startDate: s.startDate || newBookingData.checkIn,
         endDate: s.endDate || newBookingData.checkOut
      }));

      let minDate = sanitizedSources[0].startDate;
      let maxDate = sanitizedSources[0].endDate;
      let totalAmt = 0;

      sanitizedSources.forEach(s => {
         if (new Date(s.startDate) < new Date(minDate)) minDate = s.startDate;
         if (new Date(s.endDate) > new Date(maxDate)) maxDate = s.endDate;
         totalAmt += Number(s.amount) || 0;
      });

      const nights = Math.max(1, Math.ceil((new Date(maxDate).getTime() - new Date(minDate).getTime()) / (1000 * 60 * 60 * 24)));
      const newRate = totalAmt / nights;

      setNewBookingData({
         ...newBookingData,
         sources: sanitizedSources,
         checkIn: minDate,
         checkOut: maxDate,
         roomRate: parseFloat(newRate.toFixed(2)),
         manualTotal: undefined
      });
   };

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


            let roomsToFilter = fetchedRooms;
            if (fetchedRooms.length === 0 && rooms.length > 0) {
               console.warn("API returned 0 rooms. Falling back to local room list.");
               roomsToFilter = rooms;
            }


            const validRooms = roomsToFilter.filter(room => {
               const hasConflict = bookings.some(b => {
                  if (editingBookingId && b.id === editingBookingId) return false;
                  if (b.status === 'Cancelled' || b.status === 'Checked Out') return false;
                  if (String(b.roomId) !== String(room.id)) return false;

                  const bookingStart = b.checkInDate;
                  const bookingEnd = b.checkOutDate;
                  const requestStart = newBookingData.checkIn;
                  const requestEnd = newBookingData.checkOut;

                  return requestStart < bookingEnd && requestEnd > bookingStart;
               });
               return !hasConflict;
            });

            setApiAvailableRooms(validRooms);

            if (!newBookingData.roomId && validRooms.length > 0) {
               setNewBookingData((prev: any) => ({
                  ...prev,
                  roomId: validRooms[0].id,
                  roomRate: validRooms[0].pricePerNight,
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


   const sectionHeader = "text-lg md:text-xl text-slate-900 mb-4 md:mb-6 flex items-center gap-3 font-medium";
   const elegantInput = "w-full bg-white/5 backdrop-blur-sm border-b border-slate-200 focus:border-slate-800 text-slate-800 px-0 py-2 md:py-3 text-base transition-all outline-none placeholder:text-slate-500 hover:bg-white/10 focus:bg-transparent";
   const elegantLabel = "text-xs font-bold text-slate-500 uppercase tracking-widest";
   const floatingGroup = "relative";


   const roomOptions: SelectOption[] = apiAvailableRooms.length > 0
      ? apiAvailableRooms.map(r => ({
         value: r.id,
         label: `Room ${r.number}`,
         subtitle: `${r.type} — ₹${r.pricePerNight}`,
         icon: <div className={`w-2 h-2 rounded-full ${r.status === 'Available' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      }))
      : [];


   if (editingBookingId) {
      const originalBooking = bookings.find(b => b.id === editingBookingId);
      if (originalBooking && !apiAvailableRooms.find(r => r.id === originalBooking.roomId)) {
         const originalRoom = rooms.find(r => r.id === originalBooking.roomId);
         if (originalRoom) {
            roomOptions.push({
               value: originalRoom.id,
               label: `Room ${originalRoom.number} (Current)`,
               subtitle: `${originalRoom.type} — ₹${originalRoom.pricePerNight}`,
               icon: <div className="w-2 h-2 rounded-full bg-blue-500" />
            });
         }
      }
   }


   const sourceOptions: SelectOption[] = Object.values(BookingSource).map(s => ({
      value: s,
      label: s,
      icon: <PlatformIcon source={s} className="w-4 h-4" />
   }));



   return (
      <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
         <form onSubmit={(e) => {
            e.preventDefault();
            const selectedRoom = apiAvailableRooms.find(r => Number(r.id) === Number(newBookingData.roomId)) || rooms.find(r => Number(r.id) === Number(newBookingData.roomId));
            handleSaveBooking(e, selectedRoom);
         }} className="min-h-[500px] pb-24 lg:pb-0">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">

               { }
               <div className="lg:col-span-7 space-y-6 lg:space-y-10 py-2">

                  { }
                  <div className="space-y-6">
                     <h3 className={sectionHeader} style={{ fontFamily: '"Playfair Display", serif' }}>
                        <User size={22} className="text-slate-300" strokeWidth={1.5} /> Guest Information
                     </h3>
                     <div className="grid grid-cols-1 gap-6">
                        <div className={floatingGroup}>
                           <label className={elegantLabel}>Full Name</label>
                           <input name="guestName" required className={elegantInput} placeholder="Enter guest name" value={newBookingData.guestName} onChange={(e) => setNewBookingData({ ...newBookingData, guestName: e.target.value })} disabled={readOnly} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className={floatingGroup}>
                              <label className={elegantLabel}>Contact Number</label>
                              <input name="guestPhone" required pattern="^(?:\+91)?[0-9]{10}$" className={elegantInput} placeholder="+91..." value={newBookingData.guestPhone} onChange={(e) => setNewBookingData({ ...newBookingData, guestPhone: e.target.value })} disabled={readOnly} />
                           </div>
                           <div className={floatingGroup}>
                              <label className={elegantLabel}>Email Address</label>
                              <input name="guestEmail" type="email" className={elegantInput} placeholder="email@example.com" value={newBookingData.guestEmail} onChange={(e) => setNewBookingData({ ...newBookingData, guestEmail: e.target.value })} disabled={readOnly} />
                           </div>
                        </div>
                        { }
                        <div className="space-y-6">
                           <div className="flex items-center justify-between">
                              <h3 className={sectionHeader} style={{ fontFamily: '"Playfair Display", serif', marginBottom: 0 }}>
                                 <div className="w-1 h-5 bg-blue-500 rounded-full mr-1"></div> Booking Sources
                              </h3>
                              {!readOnly && (
                                 <button
                                    type="button"
                                    onClick={() => {
                                       const currentSources = newBookingData.sources || [{ source: BookingSource.WALK_IN, amount: bookingTotal, startDate: newBookingData.checkIn, endDate: newBookingData.checkOut }];
                                       const lastSource = currentSources[currentSources.length - 1];
                                       const newStart = lastSource.endDate || newBookingData.checkOut;
                                       setNewBookingData({
                                          ...newBookingData,
                                          sources: [...currentSources, { source: BookingSource.WALK_IN, amount: 0, startDate: newStart, endDate: newStart }]
                                       });
                                    }}
                                    className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition"
                                 >
                                    + Add Source
                                 </button>
                              )}
                           </div>
                           <div className="space-y-4">
                              {(newBookingData.sources || [{ source: BookingSource.WALK_IN, amount: newBookingData.manualTotal || bookingTotal, startDate: newBookingData.checkIn, endDate: newBookingData.checkOut }]).map((srcDetail: any, index: number) => (
                                 <div key={index} className="flex flex-col gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 relative group">
                                    <div className="flex gap-4 items-end">
                                       <div className={`${floatingGroup} flex-1`}>
                                          <CustomSelect
                                             label="Source"
                                             options={sourceOptions}
                                             value={srcDetail.source}
                                             onChange={(val) => {
                                                const updated = [...(newBookingData.sources || [{ source: BookingSource.WALK_IN, amount: newBookingData.manualTotal || bookingTotal, startDate: newBookingData.checkIn, endDate: newBookingData.checkOut }])];
                                                updated[index].source = val as BookingSource;
                                                updateFromSources(updated);
                                             }}
                                             disabled={readOnly}
                                          />
                                       </div>
                                       <div className={`${floatingGroup} w-1/3`}>
                                          <label className={elegantLabel}>Amount (₹)</label>
                                          <input
                                             type="number"
                                             className={elegantInput}
                                             placeholder="0"
                                             value={srcDetail.amount}
                                             onChange={(e) => {
                                                const updated = [...(newBookingData.sources || [{ source: BookingSource.WALK_IN, amount: newBookingData.manualTotal || bookingTotal, startDate: newBookingData.checkIn, endDate: newBookingData.checkOut }])];
                                                updated[index].amount = parseFloat(e.target.value) || 0;
                                                updateFromSources(updated);
                                             }}
                                             disabled={readOnly}
                                          />
                                       </div>
                                    </div>
                                    <div className="flex gap-4 items-end">
                                       <div className={`${floatingGroup} flex-1`}>
                                          <DatePicker
                                             label="Start Date"
                                             value={srcDetail.startDate || newBookingData.checkIn}
                                             onChange={(date) => {
                                                const updated = [...(newBookingData.sources || [{ source: BookingSource.WALK_IN, amount: newBookingData.manualTotal || bookingTotal, startDate: newBookingData.checkIn, endDate: newBookingData.checkOut }])];
                                                updated[index].startDate = date;
                                                const end = updated[index].endDate || newBookingData.checkOut;
                                                if (end && new Date(end) > new Date(date)) {
                                                   const nights = Math.ceil((new Date(end).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
                                                   updated[index].amount = (newBookingData.roomRate || 0) * nights;
                                                }
                                                updateFromSources(updated);
                                             }}
                                             disabled={readOnly}
                                          />
                                       </div>
                                       <div className={`${floatingGroup} flex-1`}>
                                          <DatePicker
                                             label="End Date"
                                             value={srcDetail.endDate || newBookingData.checkOut}
                                             onChange={(date) => {
                                                const updated = [...(newBookingData.sources || [{ source: BookingSource.WALK_IN, amount: newBookingData.manualTotal || bookingTotal, startDate: newBookingData.checkIn, endDate: newBookingData.checkOut }])];
                                                updated[index].endDate = date;
                                                const start = updated[index].startDate || newBookingData.checkIn;
                                                if (start && new Date(date) > new Date(start)) {
                                                   const nights = Math.ceil((new Date(date).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
                                                   updated[index].amount = (newBookingData.roomRate || 0) * nights;
                                                }
                                                updateFromSources(updated);
                                             }}
                                             disabled={readOnly}
                                          />
                                       </div>
                                    </div>

                                    {!readOnly && (newBookingData.sources?.length > 1) && (
                                       <button
                                          type="button"
                                          onClick={() => {
                                             const updated = newBookingData.sources.filter((_: any, i: number) => i !== index);
                                             if (updated.length > 0) updateFromSources(updated);
                                             else setNewBookingData({ ...newBookingData, sources: updated });
                                          }}
                                          className="absolute -top-2 -right-2 p-1.5 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm transition opacity-0 group-hover:opacity-100"
                                       >
                                          <X size={14} />
                                       </button>
                                    )}
                                 </div>
                              ))}
                           </div>
                           {sourceDateError && <p className="text-red-500 text-sm mt-2">{sourceDateError}</p>}
                        </div>
                     </div>
                  </div>

                  { }
                  <div className="space-y-6">
                     <h3 className={sectionHeader} style={{ fontFamily: '"Playfair Display", serif' }}>
                        <Calendar size={22} className="text-slate-300" strokeWidth={1.5} /> Stay Details
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={floatingGroup}>
                           <DatePicker
                              label="Check-In"
                              value={newBookingData.checkIn}
                              onChange={(date) => {
                                 const updatedSources = newBookingData.sources ? [...newBookingData.sources] : undefined;
                                 if (updatedSources && updatedSources.length === 1 && newBookingData.checkOut && new Date(newBookingData.checkOut) > new Date(date)) {
                                    const nights = Math.ceil((new Date(newBookingData.checkOut).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
                                    updatedSources[0] = { ...updatedSources[0], startDate: date, amount: (newBookingData.roomRate || 0) * nights };
                                 }
                                 setNewBookingData({ ...newBookingData, checkIn: date, sources: updatedSources || newBookingData.sources, manualTotal: undefined });
                              }}
                              disabled={readOnly}
                           />
                        </div>
                        <div className={floatingGroup}>
                           <DatePicker
                              label="Check-Out"
                              value={newBookingData.checkOut}
                              onChange={(date) => {
                                 const updatedSources = newBookingData.sources ? [...newBookingData.sources] : undefined;
                                 if (updatedSources && updatedSources.length === 1 && newBookingData.checkIn && new Date(date) > new Date(newBookingData.checkIn)) {
                                    const nights = Math.ceil((new Date(date).getTime() - new Date(newBookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24));
                                    updatedSources[0] = { ...updatedSources[0], endDate: date, amount: (newBookingData.roomRate || 0) * nights };
                                 }
                                 setNewBookingData({ ...newBookingData, checkOut: date, sources: updatedSources || newBookingData.sources, manualTotal: undefined });
                              }}
                              minDate={newBookingData.checkIn}
                              disabled={readOnly}
                           />
                        </div>
                     </div>
                     {dateError && <p className="text-red-500 text-sm mt-2">{dateError}</p>}
                  </div>

                  { }
                  <div className="space-y-6">
                     <h3 className={sectionHeader} style={{ fontFamily: '"Playfair Display", serif' }}>
                        <MapPin size={22} className="text-slate-300" strokeWidth={1.5} /> Room Selection
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={floatingGroup}>

                           {isLoadingRooms ? (
                              <label className={elegantLabel}>Finding Rooms...</label>
                           ) : (
                              <CustomSelect
                                 label="Select Room"
                                 options={roomOptions}
                                 value={newBookingData.roomId}
                                 onChange={async (val) => {
                                    const roomId = Number(val);
                                    let r = apiAvailableRooms.find(room => room.id === roomId);

                                    if (!r && rooms) {
                                       r = rooms.find(room => room.id === roomId);
                                    }
                                    if (!r) {
                                       try {
                                          setIsLoadingRooms(true);
                                          r = await getRoomDetails(roomId);
                                       } catch (err) {
                                          console.error("Failed to fetch room details", err);
                                          r = rooms.find(room => room.id === roomId);
                                       } finally {
                                          setIsLoadingRooms(false);
                                       }
                                    }

                                    setNewBookingData((prev: any) => ({
                                       ...prev,
                                       roomId: roomId,
                                       roomRate: r ? r.pricePerNight : 0,
                                       manualTotal: undefined
                                    }));
                                 }}
                                 placeholder="Choose available room..."
                                 disabled={readOnly || isLoadingRooms}
                              />
                           )}
                           {readOnly && (
                              <div className="absolute inset-0 bg-transparent z-10" />
                           )}
                        </div>
                        <div className={floatingGroup}>
                           <label className={elegantLabel}>Nightly Rate (₹)</label>
                           {isFinancialsVisible ? (
                              <input
                                 type="number"
                                 name="roomRate"
                                 required
                                 className={elegantInput}
                                 value={newBookingData.roomRate}
                                 onChange={(e) => {
                                    const newRate = parseFloat(e.target.value) || 0;
                                    const updatedSources = newBookingData.sources ? [...newBookingData.sources] : undefined;
                                    if (updatedSources && updatedSources.length === 1 && updatedSources[0].startDate && updatedSources[0].endDate) {
                                       const nights = Math.max(1, Math.ceil((new Date(updatedSources[0].endDate).getTime() - new Date(updatedSources[0].startDate).getTime()) / (1000 * 60 * 60 * 24)));
                                       updatedSources[0].amount = newRate * nights;
                                    }
                                    setNewBookingData({ ...newBookingData, roomRate: newRate, sources: updatedSources || newBookingData.sources, manualTotal: undefined });
                                 }}
                                 disabled={readOnly}
                              />
                           ) : (
                              <div className="w-full border-b border-slate-200 py-2 md:py-3 flex items-center justify-between text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setIsSecurityModalOpen(true)}>
                                 <span className="text-sm italic">Hidden</span>
                                 <Lock size={14} />
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  { }
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <h3 className={sectionHeader} style={{ fontFamily: '"Playfair Display", serif' }}>
                           <Receipt size={22} className="text-slate-300" strokeWidth={1.5} /> Additional Pay
                        </h3>
                        {!readOnly && (
                           <button
                              type="button"
                              onClick={() => setNewBookingData({
                                 ...newBookingData,
                                 additionalCharges: [...(newBookingData.additionalCharges || []), { category: '', amount: 0 }],
                                 manualTotal: undefined
                              })}
                              className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition"
                           >
                              + Add Charge
                           </button>
                        )}
                     </div>

                     <div className="space-y-3">
                        {newBookingData.additionalCharges?.map((charge: any, index: number) => (
                           <div key={index} className="flex gap-3 items-end">
                              <div className={`${floatingGroup} flex-1`}>
                                 <label className={elegantLabel}>Fee Type</label>
                                 <input
                                    className={elegantInput}
                                    placeholder="e.g. Cleaning Fee, Occupancy Tax"
                                    value={charge.category}
                                    onChange={(e) => {
                                       const updated = [...newBookingData.additionalCharges];
                                       updated[index].category = e.target.value;
                                       setNewBookingData({ ...newBookingData, additionalCharges: updated, manualTotal: undefined });
                                    }}
                                    disabled={readOnly}
                                 />
                              </div>
                              <div className={`${floatingGroup} w-24`}>
                                 <label className={elegantLabel}>Amount</label>
                                 <input
                                    type="number"
                                    className={elegantInput}
                                    placeholder="0"
                                    value={charge.amount}
                                    onChange={(e) => {
                                       const updated = [...newBookingData.additionalCharges];
                                       updated[index].amount = parseFloat(e.target.value) || 0;
                                       setNewBookingData({ ...newBookingData, additionalCharges: updated, manualTotal: undefined });
                                    }}
                                    disabled={readOnly}
                                 />
                              </div>
                              {!readOnly && (
                                 <button
                                    type="button"
                                    onClick={() => {
                                       const updated = newBookingData.additionalCharges.filter((_: any, i: number) => i !== index);
                                       setNewBookingData({ ...newBookingData, additionalCharges: updated, manualTotal: undefined });
                                    }}
                                    className="mb-2 p-2 text-slate-400 hover:text-red-500 transition"
                                 >
                                    <X size={18} />
                                 </button>
                              )}
                           </div>
                        ))}
                        {(!newBookingData.additionalCharges || newBookingData.additionalCharges.length === 0) && (
                           <p className="text-sm text-slate-400 italic">No additional charges added.</p>
                        )}
                     </div>
                  </div>
               </div>


               { }
               <div className="lg:col-span-5">
                  <div className="bg-slate-900 rounded-2xl md:rounded-3xl p-5 md:p-8 text-white h-full flex flex-col justify-between shadow-2xl shadow-slate-900/20 relative overflow-y-auto overflow-x-hidden">
                     { }
                     <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                     {!isFinancialsVisible ? (
                        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center space-y-6">
                           <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                              <Lock size={32} className="text-white/50" />
                           </div>
                           <div>
                              <h3 className="text-xl font-bold text-white mb-2">Financials Locked</h3>
                              <p className="text-slate-400 text-sm max-w-[200px] mx-auto">
                                 Payment summary is hidden. Authenticate to view details.
                              </p>
                           </div>
                           <button
                              type="button"
                              onClick={() => setIsSecurityModalOpen(true)}
                              className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition shadow-lg"
                           >
                              Unlock Details
                           </button>
                        </div>
                     ) : (
                        <>
                           <div className="space-y-8 relative z-10">
                              <div>
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <CreditCard size={14} /> Payment Summary
                                 </h3>
                                 <div className="flex items-center gap-2 mt-2">
                                    <span className="text-2xl font-serif text-slate-400">₹</span>
                                    <input
                                       type="number"
                                       className="text-3xl font-serif bg-transparent border-b border-white/10 outline-none w-full placeholder:text-slate-600 focus:border-white/50 transition-colors text-white"
                                       value={newBookingData.manualTotal !== undefined ? (newBookingData.manualTotal === null ? '' : newBookingData.manualTotal) : (bookingTotal || '')}
                                       onChange={(e) => {
                                          const val = e.target.value;
                                          const newTotal = val === '' ? 0 : parseFloat(val);





                                          const currentExtras = newBookingData.additionalCharges?.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0) || 0;
                                          const nights = Math.max(1, Math.ceil((new Date(newBookingData.checkOut).getTime() - new Date(newBookingData.checkIn).getTime()) / (1000 * 60 * 60 * 24)));

                                          const calculatedRoomTotal = Math.max(0, newTotal - currentExtras);
                                          const newRate = calculatedRoomTotal / nights;

                                          let newSources = [...(newBookingData.sources || [{ source: BookingSource.WALK_IN, amount: bookingTotal, startDate: newBookingData.checkIn, endDate: newBookingData.checkOut }])];

                                          if (newSources.length === 1) {
                                             newSources[0].amount = calculatedRoomTotal;
                                             setNewBookingData({
                                                ...newBookingData,
                                                roomRate: parseFloat(newRate.toFixed(2)),
                                                manualTotal: undefined,
                                                sources: newSources
                                             });
                                          } else {
                                             setNewBookingData({
                                                ...newBookingData,
                                                roomRate: parseFloat(newRate.toFixed(2)),
                                                manualTotal: val === '' ? null : newTotal
                                             });
                                          }
                                       }}
                                       disabled={readOnly}
                                       placeholder="0"
                                    />
                                    {newBookingData.manualTotal !== undefined && !readOnly && (
                                       <button
                                          type="button"
                                          onClick={() => setNewBookingData({ ...newBookingData, manualTotal: undefined })}
                                          className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-white/10 rounded-full"
                                          title="Reset to calculated"
                                       >
                                          <RotateCcw size={16} />
                                       </button>
                                    )}
                                 </div>
                                 <p className="text-slate-400 text-sm mt-1">Total cost for {bookingNights} nights</p>
                              </div>

                              <div className="space-y-4 pt-6 border-t border-white/10">
                                 <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300">Room Rate</span>
                                    <span>₹{newBookingData.roomRate} x {bookingNights}</span>
                                 </div>
                                 {(newBookingData.additionalCharges || []).length > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                       <span className="text-slate-300">Extras</span>
                                       <span>+ ₹{newBookingData.additionalCharges.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0).toLocaleString()}</span>
                                    </div>
                                 )}

                                 <div className="pt-2 pb-2 mt-2 border-y border-white/10 space-y-2">
                                    <div className="text-xs text-slate-400 font-bold uppercase">Funding Sources</div>
                                    {(newBookingData.sources || []).map((s: any, idx: number) => (
                                       <div key={idx} className="flex justify-between items-center text-sm">
                                          <span className="text-slate-300 flex items-center gap-2"><PlatformIcon source={s.source} className="w-3.5 h-3.5" />{s.source}</span>
                                          <span>₹{(s.amount || 0).toLocaleString()}</span>
                                       </div>
                                    ))}
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

                              <div className="mt-6 gap-3 hidden lg:flex">
                                 <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors text-sm font-medium">
                                    Cancel
                                 </button>
                                 {!readOnly && (
                                    <button
                                       type="submit"
                                       disabled={!!dateError || !!sourceDateError || isLoadingRooms}
                                       className="flex-[2] py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-50 transition-colors text-sm shadow-lg disabled:opacity-50"
                                    >
                                       {editingBookingId ? "Save Changes" : "Confirm Booking"}
                                    </button>
                                 )}
                              </div>
                           </div>
                        </>
                     )}
                  </div>
               </div>
            </div>
         </form>

         { }
         {!readOnly && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50 flex items-center gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
               <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Due</p>
                  <p className="text-xl font-bold text-slate-900">
                     ₹{newBookingData.manualTotal !== undefined
                        ? (newBookingData.manualTotal || 0).toLocaleString()
                        : bookingTotal.toLocaleString()}
                  </p>
               </div>
               <button
                  type="button"
                  onClick={(e) => {

                     const form = document.querySelector('form');
                     if (form) form.requestSubmit();
                  }}
                  disabled={!!dateError || !!sourceDateError || isLoadingRooms}
                  className="flex-[2] py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors text-sm shadow-lg disabled:opacity-50"
               >
                  {editingBookingId ? "Save" : "Confirm"}
               </button>
            </div>
         )}

         <SecurityModal
            isOpen={isSecurityModalOpen}
            onClose={() => setIsSecurityModalOpen(false)}
            onAuthenticated={() => {
               setIsFinancialsVisible(true);
               setIsSecurityModalOpen(false);
            }}
         />
      </Modal >
   );
};

export default NewBookingModal;
