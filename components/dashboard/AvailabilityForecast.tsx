import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AvailabilityForecastProps {
  forecast: { date: Date; availableRooms: any[] }[];
  forecastPage: number;
  setForecastPage: (page: number | ((prev: number) => number)) => void;
  onOpenNewBooking: (date: Date) => void;
}

const AvailabilityForecast: React.FC<AvailabilityForecastProps> = ({ forecast, forecastPage, setForecastPage, onOpenNewBooking }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
              <h3 className="text-lg font-bold text-slate-800">Availability Forecast</h3>
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button 
                      disabled={forecastPage === 0}
                      onClick={() => setForecastPage(p => p - 1)}
                      className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:shadow-none text-slate-600 transition-all"
                  >
                      <ChevronLeft size={16}/>
                  </button>
                  <span className="text-sm font-medium text-slate-700 w-32 text-center select-none">
                     {forecast.length > 0 && (
                       <>
                           {forecast[0].date.toLocaleDateString(undefined, {month:'short', day:'numeric'})} - {forecast[forecast.length-1].date.toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                       </>
                     )}
                  </span>
                  <button 
                       disabled={forecastPage >= 30}
                       onClick={() => setForecastPage(p => p + 1)}
                       className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:shadow-none text-slate-600 transition-all"
                  >
                      <ChevronRight size={16}/>
                  </button>
              </div>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {forecast.map((day, idx) => (
                <div key={`${day.date.toISOString()}-${day.availableRooms.length}`} 
                     className={`p-4 rounded-lg border transition-all cursor-pointer ${day.availableRooms.length === 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md hover:border-blue-200'}`}
                     onClick={() => onOpenNewBooking(day.date)}
                     title="Click to start a new booking on this date"
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-slate-700">{day.date.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day:'numeric'})}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${day.availableRooms.length > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           {day.availableRooms.length} Free
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {day.availableRooms.length > 0 ? 
                           day.availableRooms.map(r => (
                               <span key={r.id} className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-slate-600" title={`${r.type} - $${r.pricePerNight}`}>
                                   {r.number}
                               </span>
                           ))
                           : <span className="text-xs text-slate-400 italic">No rooms available</span>
                        }
                    </div>
                </div>
            ))}
         </div>
    </div>
  );
};

export default AvailabilityForecast;
