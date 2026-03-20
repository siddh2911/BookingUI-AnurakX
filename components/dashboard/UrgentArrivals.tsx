import React from 'react';
import { Booking, Room } from '../../types';
import { Bell, Calendar, Clock, ArrowRight, Phone } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import PlatformIcon from '../common/PlatformIcon';

interface UrgentArrivalsProps {
    arrivals: Booking[];
    rooms: Room[];
    today: string;
    onEditBooking: (booking: Booking, isViewOnly?: boolean) => void;
}

const UrgentArrivals: React.FC<UrgentArrivalsProps> = ({ arrivals, rooms, today, onEditBooking }) => {
    const { t } = useLanguage();

    const todayDate = new Date(today);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    const urgentBookings = arrivals.filter(b => b.checkInDate === today || b.checkInDate === tomorrow);


    const isEmpty = urgentBookings.length === 0;

    return (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 p-5 md:p-8 relative overflow-hidden group transition-colors duration-1000">
            { }
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none transition-all duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-1000"></div>

            <div className="flex flex-wrap items-center justify-between mb-6 md:mb-8 relative z-10 gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{t('priorityCheckIns')}</h2>
                        <p className="text-xs md:text-sm text-slate-500">{t('prioritySubtitle')}</p>
                    </div>
                </div>
                { }
                <span className="bg-blue-100 text-blue-700 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                    {urgentBookings.length} {t('priorityBadge')}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                {isEmpty ? (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 py-12 flex flex-col items-center justify-center text-slate-500 bg-white/50 rounded-xl border border-slate-200 border-dashed">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <Clock className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium">No check-ins scheduled for today or tomorrow</p>
                    </div>
                ) : (
                    urgentBookings.map(booking => {
                        const room = rooms.find(r => r.id === booking.roomId);
                        const isToday = booking.checkInDate === today;

                        return (
                            <div
                                key={booking.id}
                                onClick={() => onEditBooking(booking, true)}
                                className="bg-white/50 hover:bg-white/80 border border-slate-200 hover:border-blue-300 backdrop-blur-md rounded-xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-sm"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${isToday
                                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                                            : 'bg-blue-100 text-blue-700 border-blue-200'
                                            }`}>
                                            {isToday ? t('today') : t('tomorrow')}
                                        </span>
                                        <div className="flex gap-2 -mr-2 -mt-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500" title={`Source: ${booking.sources?.[0]?.source || 'Unknown'}`}>
                                                <PlatformIcon source={booking.sources?.[0]?.source || 'Direct'} className="w-4 h-4" />
                                            </div>
                                            {booking.guestPhone && (
                                                <a
                                                    href={`tel:${booking.guestPhone}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-8 h-8 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 flex items-center justify-center transition-colors"
                                                    title={`Call ${booking.guestName}`}
                                                >
                                                    <Phone className="w-3.5 h-3.5 text-emerald-300" />
                                                </a>
                                            )}
                                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                <ArrowRight className="w-4 h-4 text-blue-500" />
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-lg text-slate-900 group-hover/card:text-blue-600 transition-colors truncate mb-1">{booking.guestName}</h3>
                                    <p className="text-xs text-slate-500 font-medium truncate">{booking.guestEmail || booking.guestPhone}</p>
                                </div>

                                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <div className="px-2 py-1 bg-slate-100 rounded border border-slate-200">
                                            <span className="font-mono font-bold text-slate-700">R{room?.number}</span>
                                        </div>
                                        <span className="text-xs font-semibold">{room?.type}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(booking.pendingBalance || 0) > 0 ? (
                                            <span className="text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                {t('due')}: ₹{booking.pendingBalance?.toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                {t('paid')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default UrgentArrivals;
