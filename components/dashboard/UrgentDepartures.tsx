import React from 'react';
import { Booking, Room } from '../../types';
import { LogOut, ArrowRight, Phone } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface UrgentDeparturesProps {
    departures: Booking[];
    rooms: Room[];
    today: string;
    onEditBooking: (booking: Booking, isViewOnly?: boolean) => void;
}

const UrgentDepartures: React.FC<UrgentDeparturesProps> = ({ departures, rooms, today, onEditBooking }) => {
    const { t } = useLanguage();
    // Calculate tomorrow's date string
    const todayDate = new Date(today);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    // Filter for check-outs today or tomorrow
    const urgentBookings = departures.filter(b => b.checkOutDate === today || b.checkOutDate === tomorrow);

    if (urgentBookings.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-xl border border-white/5 p-5 md:p-8 text-white relative overflow-hidden group mb-6">
            {/* Elegant Background Glow - Subtle Sunset Tones */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            <div className="flex flex-wrap items-center justify-between mb-6 md:mb-8 relative z-10 gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-2xl border border-white/10 flex items-center justify-center backdrop-blur-md shadow-inner shrink-0 ring-1 ring-white/5">
                        <LogOut className="w-4 h-4 md:w-5 md:h-5 text-amber-200" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-orange-200 to-rose-200">{t('priorityCheckOuts')}</h2>
                        <p className="text-xs md:text-sm text-slate-400">{t('priorityCheckOutSubtitle')}</p>
                    </div>
                </div>
                {/* Count Indicator */}
                <span className="bg-amber-500/10 text-amber-200 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full border border-amber-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]">
                    {urgentBookings.length} {t('priorityBadge')}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                {urgentBookings.map(booking => {
                    const room = rooms.find(r => r.id === booking.roomId);
                    const isToday = booking.checkOutDate === today;

                    return (
                        <div
                            key={booking.id}
                            onClick={() => onEditBooking(booking, true)}
                            className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/20 backdrop-blur-sm rounded-xl p-5 transition-all duration-300 cursor-pointer group/card flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 relative overflow-hidden"
                        >
                            {/* Card Hover Glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-1000"></div>

                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${isToday
                                        ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                                        : 'bg-slate-700/50 text-slate-300 border-slate-600/50'
                                        }`}>
                                        {isToday ? t('today') : t('tomorrow')}
                                    </span>

                                    <div className="flex gap-2 -mr-2 -mt-2">
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
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all transform translate-x-2 group-hover/card:translate-x-0">
                                            <ArrowRight className="w-4 h-4 text-amber-200" />
                                        </div>
                                    </div>
                                </div>

                                <h3 className="font-bold text-lg text-white group-hover/card:text-amber-100 transition-colors truncate mb-1">{booking.guestName}</h3>
                                <p className="text-xs text-slate-400 group-hover/card:text-slate-300 font-medium truncate transition-colors">{booking.guestEmail || booking.guestPhone}</p>
                            </div>

                            <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <div className="px-2 py-1 bg-white/5 rounded border border-white/10 group-hover/card:border-amber-500/20 transition-colors">
                                        <span className="font-mono font-bold text-slate-200 group-hover/card:text-amber-100">R{room?.number}</span>
                                    </div>
                                    <span className="text-xs opacity-50 font-medium tracking-wide uppercase">{room?.type}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(booking.pendingBalance || 0) > 0 ? (
                                        <span className="text-rose-300 text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                                            {t('due')}: ₹{booking.pendingBalance?.toLocaleString()}
                                        </span>
                                    ) : (
                                        <span className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
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
