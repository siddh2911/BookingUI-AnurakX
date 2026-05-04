import React from 'react';
import { Booking, Room } from '../../types';
import { LogOut, ArrowRight, Phone, Droplets, MessageCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import PlatformIcon from '../common/PlatformIcon';

interface UrgentDeparturesProps {
    departures: Booking[];
    rooms: Room[];
    today: string;
    onEditBooking: (booking: Booking, isViewOnly?: boolean) => void;
    housekeepingTasks: any[];
    onSendReviewRequest?: (b: Booking) => void;
}

const UrgentDepartures: React.FC<UrgentDeparturesProps> = ({ departures, rooms, today, onEditBooking, housekeepingTasks, onSendReviewRequest }) => {
    const { t } = useLanguage();

    const todayDate = new Date(today);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];


    const urgentBookings = departures.filter(b => b.checkOutDate === today || b.checkOutDate === tomorrow);

    if (urgentBookings.length === 0) return null;

    return (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 p-5 md:p-8 relative overflow-hidden group mb-6 transition-colors duration-1000">
            { }
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none transition-all duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-1000"></div>

            <div className="flex flex-wrap items-center justify-between mb-6 md:mb-8 relative z-10 gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{t('priorityCheckOuts')}</h2>
                        <p className="text-xs md:text-sm text-slate-500">{t('priorityCheckOutSubtitle')}</p>
                    </div>
                </div>
                { }
                <span className="bg-amber-100 text-amber-700 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                    {urgentBookings.length} {t('priorityBadge')}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                {urgentBookings.map(booking => {
                    const room = rooms.find(r => r.id === booking.roomId);
                    const isToday = booking.checkOutDate === today;
                    const isDirty = room?.cleanStatus ? room.cleanStatus === 'DIRTY' : housekeepingTasks?.find(t => t.roomId === room?.id)?.status === 'Dirty';

                    return (
                        <div
                            key={booking.id}
                            onClick={() => onEditBooking(booking, true)}
                            className="bg-white/50 hover:bg-white/80 border border-slate-200 hover:border-amber-300 backdrop-blur-md rounded-xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-sm group/card"
                        >
                            { }
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-1000"></div>

                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${isToday
                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                        {isToday ? t('today') : t('tomorrow')}
                                    </span>

                                    <div className="flex gap-2 -mr-2 -mt-2 relative z-10">
                                        <div className="flex -space-x-2">
                                            {booking.sources?.map((s: any, idx: number) => (
                                                <div key={idx} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 relative" style={{ zIndex: 10 - idx }} title={`Source: ${s.source || 'Unknown'}`}>
                                                    <PlatformIcon source={s.source || 'Direct'} className="w-4 h-4" />
                                                </div>
                                            ))}
                                        </div>
                                        {onSendReviewRequest && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSendReviewRequest(booking);
                                                }}
                                                className="w-8 h-8 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center transition-colors group/whatsapp"
                                                title={`Send WhatsApp Review Request to ${booking.guestName}`}
                                            >
                                                <MessageCircle className="w-3.5 h-3.5 text-blue-500/70 group-hover/whatsapp:text-blue-500 transition-colors" />
                                            </button>
                                        )}
                                        {booking.guestPhone && (
                                            <a
                                                href={`tel:${booking.guestPhone}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-8 h-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center transition-colors group/phone"
                                                title={`Call ${booking.guestName}`}
                                            >
                                                <Phone className="w-3.5 h-3.5 text-emerald-400/70 group-hover/phone:text-emerald-300 transition-colors" />
                                            </a>
                                        )}
                                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all transform translate-x-2 group-hover/card:translate-x-0 relative z-10">
                                            <ArrowRight className="w-4 h-4 text-amber-600" />
                                        </div>
                                    </div>
                                </div>

                                <h3 className="font-bold text-lg text-slate-900 group-hover/card:text-blue-600 transition-colors truncate mb-1">{booking.guestName}</h3>
                                <p className="text-xs text-slate-500 group-hover/card:text-slate-600 font-medium truncate transition-colors">{booking.guestEmail || booking.guestPhone}</p>
                            </div>

                            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
                                    <div className="px-2 py-1 bg-slate-100 rounded border border-slate-200 group-hover/card:border-blue-500/20 transition-colors">
                                        <span className="font-mono font-bold text-slate-700 group-hover/card:text-blue-700">R{room?.number}</span>
                                    </div>
                                    <span className="text-xs font-semibold tracking-wide uppercase">{room?.type}</span>
                                    {isDirty && (
                                        <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 font-bold flex items-center">
                                            <Droplets size={10} className="mr-0.5" /> Dirty
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {(booking.pendingBalance || 0) > 0 ? (
                                        <span className="text-rose-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                            {t('due')}: ₹{booking.pendingBalance?.toLocaleString()}
                                        </span>
                                    ) : (
                                        <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            {t('paid')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default UrgentDepartures;
