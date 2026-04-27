import React, { useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Booking, Room } from '../../types';
import { generateChartData } from '../../services/chartUtils';
import { useTheme } from '../../hooks/useTheme';

interface RevenueChartProps {
  bookings: Booking[];
  rooms?: Room[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ bookings, rooms }) => {
  const { theme } = useTheme();
  const night = theme === 'night';
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'yoy'>('monthly');
  const [offset, setOffset] = useState(0);

  const currentData = useMemo(() => {
    return generateChartData('revenue', range, offset, bookings, []);
  }, [range, offset, bookings]);

  const handleRangeChange = (newRange: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'yoy') => {
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
          <h3 className={`text-lg font-bold ${night ? 'text-white' : 'text-slate-900'}`}>Revenue Trend</h3>
          <p className={`text-xs font-medium mt-1 ${night ? 'text-slate-500' : 'text-slate-400'}`}>
            {range === 'yearly' ? 'Year-over-year' : range === 'monthly' ? 'Month-over-month' : range === 'weekly' ? 'Week-over-week' : range === 'yoy' ? 'Year-over-year Comparison' : 'Daily'} booking revenue metrics
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
            <option value="yoy">YoY Compare</option>
          </select>
        </div>
      </div>
      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {range === 'yoy' ? (
            <LineChart data={currentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={night ? 'rgba(51, 65, 85, 0.4)' : 'rgba(203, 213, 225, 0.4)'} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: night ? '#64748b' : '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={60}
                tick={{ fill: night ? '#475569' : '#94a3b8', fontSize: 11, fontWeight: 500 }}
                tickMargin={10}
                tickFormatter={(value: number) => {
                  if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                  return `₹${value}`;
                }}
              />
              <Tooltip
                cursor={{ stroke: night ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', strokeWidth: 20 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={`p-3 rounded-xl border shadow-xl min-w-[150px] backdrop-blur-md ${night ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
                        <p className={`text-sm font-bold mb-2 border-b pb-1 ${night ? 'text-white border-slate-700' : 'text-slate-800 border-slate-100'}`}>{label}</p>
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-sm mb-1 gap-6">
                            <span className="font-medium" style={{ color: entry.color }}>{entry.name}</span>
                            <span className={`font-bold ${night ? 'text-slate-200' : 'text-slate-800'}`}>₹{(entry.value as number).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: night ? '#64748b' : '#64748b' }} />
              <Line type="monotone" dataKey={new Date().getFullYear().toString()} name="This Year" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey={(new Date().getFullYear() - 1).toString()} name="Last Year" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
              <Line type="monotone" dataKey={(new Date().getFullYear() - 2).toString()} name="2 Years Ago" stroke="#94a3b8" strokeWidth={2} strokeDasharray="3 3" />
            </LineChart>
          ) : (
            <BarChart data={currentData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                tickFormatter={(value) => {
                  if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                  return `₹${value}`;
                }}
              />
              <Tooltip
                cursor={{ fill: night ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const revenue = payload[0].value as number;
                    const isMonthly = range === 'monthly';
                    const isYearly = range === 'yearly';

                    // Calculate Normal Rent: 12000/month for monthly, 144000/year for yearly
                    let normalRent = 0;
                    if (rooms) {
                      if (isMonthly) normalRent = rooms.length * 12000;
                      if (isYearly) normalRent = rooms.length * 12000 * 12;
                    }

                    const increment = revenue - normalRent;
                    const hasIncrement = increment > 0;
                    const showExtras = (isMonthly || isYearly) && normalRent > 0;

                    return (
                      <div className={`p-3 rounded-xl border shadow-xl min-w-[150px] backdrop-blur-md ${night ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
                        <p className={`text-sm font-bold mb-2 border-b pb-1 ${night ? 'text-white border-slate-700' : 'text-slate-800 border-slate-100'}`}>{label}</p>
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span className={`${night ? 'text-slate-400' : 'text-slate-500'} font-medium mr-4`}>Revenue</span>
                          <span className={`font-bold ${night ? 'text-blue-400' : 'text-blue-600'}`}>₹{revenue.toLocaleString()}</span>
                        </div>

                        {showExtras && (
                          <>
                            <div className="flex justify-between items-center text-sm mb-1">
                              <span className={`${night ? 'text-slate-400' : 'text-slate-500'} font-medium mr-4`}>Normal Rent</span>
                              <span className={`font-bold ${night ? 'text-slate-300' : 'text-slate-700'}`}>₹{normalRent.toLocaleString()}</span>
                            </div>
                            <div className={`flex justify-between items-center text-sm border-t pt-1 mt-1 ${night ? 'border-slate-700' : 'border-slate-100'}`}>
                              <span className={`${night ? 'text-slate-400' : 'text-slate-500'} font-medium mr-4`}>Increment</span>
                              <span className={`font-bold ${hasIncrement ? 'text-green-500' : 'text-red-500'}`}>
                                {hasIncrement ? '+' : ''}₹{increment.toLocaleString()}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="revenue"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;

