import React from 'react';
import { Booking, Room } from '../../types';
import { Bell, Calendar, Clock, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface UrgentArrivalsProps {
    arrivals: Booking[];
    rooms: Room[];
    today: string;
    onEditBooking: (booking: Booking, isViewOnly?: boolean) => void;
}

const UrgentArrivals: React.FC<UrgentArrivalsProps> = ({ arrivals, rooms, today, onEditBooking }) => {
    const { t } = useLanguage();
    // Calculate tomorrow's date string
    const todayDate = new Date(today);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    const urgentBookings = arrivals.filter(b => b.checkInDate === today || b.checkInDate === tomorrow);

    if (urgentBookings.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 p-5 md:p-8 text-white relative overflow-hidden group">
            {/* Elegant Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            <div className="flex flex-wrap items-center justify-between mb-6 md:mb-8 relative z-10 gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center backdrop-blur-md shadow-inner shrink-0">
                        <Bell className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">{t('priorityCheckIns')}</h2>
                        <p className="text-xs md:text-sm text-slate-400">{t('prioritySubtitle')}</p>
                    </div>
                </div>
                {/* Optional: Add a small indicator of count */}
                <span className="bg-blue-500/20 text-blue-300 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">
                    {urgentBookings.length} {t('priorityBadge')}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                {urgentBookings.map(booking => {
                    const room = rooms.find(r => r.id === booking.roomId);
                    const isToday = booking.checkInDate === today;

                    return (
                        <div
                            key={booking.id}
                            onClick={() => onEditBooking(booking, true)}
                            className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 backdrop-blur-sm rounded-xl p-5 transition-all duration-300 cursor-pointer group/card flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${isToday
                                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                        : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                                        }`}>
                                        {isToday ? t('today') : t('tomorrow')}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity -mr-2 -mt-2">

                                        <ArrowRight className="w-4 h-4 text-white" />
                                    </div>
                                </div>

                                <h3 className="font-bold text-lg text-white group-hover/card:text-blue-200 transition-colors truncate mb-1">{booking.guestName}</h3>
                                <p className="text-xs text-slate-400 font-medium truncate">{booking.guestEmail || booking.guestPhone}</p>
                            </div>

                            <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <div className="px-2 py-1 bg-white/5 rounded border border-white/5">
                                        <span className="font-mono font-bold text-white">R{room?.number}</span>
                                    </div>
                                    <span className="text-xs opacity-70">{room?.type}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(booking.pendingBalance || 0) > 0 ? (
                                        <span className="text-red-300 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                                            {t('due')}: ₹{booking.pendingBalance?.toLocaleString()}
                                        </span>
                                    ) : (
                                        <span className="text-green-300 text-[10px] font-bold uppercase tracking-wider bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
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

export default UrgentArrivals;
