import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Booking, Room } from '../../types';
import { generateChartData } from '../../services/chartUtils';
import { useTheme } from '../../hooks/useTheme';

interface OccupancyChartProps {
    bookings: Booking[];
    rooms: Room[];
}

const OccupancyChart: React.FC<OccupancyChartProps> = ({ bookings, rooms }) => {
    const { theme } = useTheme();
    const night = theme === 'night';
    const [range, setRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const [offset, setOffset] = useState(0);

    const currentData = useMemo(() => {
        return generateChartData('occupancy', range, offset, bookings, rooms);
    }, [range, offset, bookings, rooms]);

    const handleRangeChange = (newRange: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
        setRange(newRange);
        setOffset(0);
    };

    const handlePrev = () => setOffset(prev => prev + 1);
    const handleNext = () => setOffset(prev => prev - 1);

    return (
        <div className={`backdrop-blur-xl p-4 sm:p-6 rounded-2xl shadow-sm border transition-all duration-500 h-full flex flex-col ${
            night ? 'bg-slate-950 border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.2)]' : 'bg-white/70 border-white/20'
        }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                <div>
                    <h3 className={`text-lg font-bold ${night ? 'text-white' : 'text-slate-900'}`}>Occupancy Trend</h3>
                    <p className={`text-xs font-medium mt-1 ${night ? 'text-slate-500' : 'text-slate-400'}`}>
                        {range === 'yearly' ? 'Year-over-year' : range === 'monthly' ? 'Month-over-month' : range === 'weekly' ? 'Week-over-week' : 'Daily'} occupancy percentage
                    </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className={`flex rounded-lg p-1 border transition-colors ${night ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <button
                            onClick={handlePrev}
                            className={`p-1 rounded transition-colors ${night ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={offset <= 0}
                            className={`p-1 rounded transition-colors ${
                                offset <= 0 
                                    ? (night ? 'text-slate-700 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') 
                                    : (night ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <select
                        className={`text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 transition-all cursor-pointer ${
                            night ? 'bg-slate-900 border-slate-800 text-slate-300 focus:ring-blue-500/20' : 'bg-slate-50 border-slate-200 text-slate-600 focus:ring-blue-100'
                        }`}
                        value={range}
                        onChange={(e) => handleRangeChange(e.target.value as any)}
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
            </div>
            <div className="flex-1 min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={currentData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={night ? '#3b82f6' : '#8b5cf6'} stopOpacity={night ? 0.3 : 0.3} />
                                <stop offset="95%" stopColor={night ? '#3b82f6' : '#8b5cf6'} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={night ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.5)'} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: night ? '#64748b' : '#94a3b8', fontSize: 11, fontWeight: 500 }}
                            dy={10}
                            height={40}
                            minTickGap={32}
                            tickMargin={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            width={60}
                            tick={{ fill: night ? '#475569' : '#94a3b8', fontSize: 11, fontWeight: 500 }}
                            tickMargin={10}
                            tickFormatter={(value) => `${value}%`}
                            domain={[0, 100]}
                        />
                        <Tooltip
                            cursor={{ stroke: night ? '#334155' : '#e2e8f0', strokeDasharray: '3 3' }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className={`p-3 rounded-xl border shadow-xl min-w-[150px] backdrop-blur-md ${night ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
                                            <p className={`text-sm font-bold mb-2 border-b pb-1 ${night ? 'text-white border-slate-700' : 'text-slate-800 border-slate-100'}`}>{label}</p>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className={`${night ? 'text-slate-400' : 'text-slate-500'} font-medium mr-4`}>Occupancy</span>
                                                <span className={`font-bold ${night ? 'text-blue-400' : 'text-purple-600'}`}>{payload[0].value}%</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="occupancy"
                            stroke={night ? '#3b82f6' : '#8b5cf6'}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorOccupancy)"
                            activeDot={{ r: 6, strokeWidth: 0, fill: night ? '#3b82f6' : '#7c3aed' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default OccupancyChart;
