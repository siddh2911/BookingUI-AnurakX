import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Room } from '../../types';

interface AvailabilityForecastProps {
    forecast: { date: Date; availableRooms: any[] }[];
    forecastPage: number;
    setForecastPage: (page: number | ((prev: number) => number)) => void;
    onOpenNewBooking: (date: Date) => void;
    rooms: Room[];
}

const AvailabilityForecast: React.FC<AvailabilityForecastProps> = ({ forecast, forecastPage, setForecastPage, onOpenNewBooking, rooms }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Availability Forecast</h3>
                        <p className="text-xs text-slate-400">Quick check for room availability</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-sm">
                    <button
                        disabled={forecastPage === 0}
                        onClick={() => setForecastPage(p => p - 1)}
                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none text-slate-600 transition-all"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-semibold text-slate-700 w-36 text-center select-none tabular-nums">
                        {forecast.length > 0 && (
                            <>
                                {forecast[0].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {forecast[forecast.length - 1].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </>
                        )}
                    </span>
                    <button
                        disabled={forecastPage >= 30}
                        onClick={() => setForecastPage(p => p + 1)}
                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none text-slate-600 transition-all"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {forecast.map((day) => {
                    const isAvailable = day.availableRooms.length > 0;

                    // Logic to find unavailable rooms
                    const safeRooms = rooms || [];
                    const availableIds = new Set(day.availableRooms.map((r: any) => r.id));
                    const unavailableRooms = safeRooms.filter(r => !availableIds.has(r.id));
                    // Combine lists: Available first, then Unavailable
                    const displayRooms = [
                        ...day.availableRooms.map((r: any) => ({ ...r, isAvailable: true })),
                        ...unavailableRooms.map(r => ({ ...r, isAvailable: false }))
                    ];

                    return (
                        <div key={`${day.date.toISOString()}-${day.availableRooms.length}`}
                            className={`
                            group p-4 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden
                            ${isAvailable
                                    ? 'bg-white border-slate-100 hover:border-blue-300 hover:shadow-md'
                                    : 'bg-red-50 border-red-100 opacity-80'
                                }
                         `}
                            onClick={() => onOpenNewBooking(day.date)}
                        >
                            {/* Status Bar */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${isAvailable ? 'bg-green-400' : 'bg-red-400'}`}></div>

                            <div className="flex justify-between items-start mb-3 ml-2">
                                <span className="font-bold text-slate-700 text-sm">
                                    {day.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {day.availableRooms.length} Left
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 ml-2">
                                {displayRooms.slice(0, 12).map((r) => (
                                    <span
                                        key={r.id}
                                        className={`
                                            text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors
                                            ${r.isAvailable
                                                ? 'bg-slate-50 border border-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100'
                                                : 'bg-red-50 border border-red-100 text-red-300 line-through decoration-red-300'
                                            }
                                        `}
                                    >
                                        {r.number}
                                    </span>
                                ))}
                                {displayRooms.length > 12 && (
                                    <span className="text-[10px] text-slate-400 self-center">+{displayRooms.length - 12}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AvailabilityForecast;
