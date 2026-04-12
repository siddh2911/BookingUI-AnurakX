import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Booking, Room } from '../../types';
import { generateChartData } from '../../services/chartUtils';

interface RevenueChartProps {
  bookings: Booking[];
  rooms?: Room[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ bookings, rooms }) => {
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [offset, setOffset] = useState(0);

  const currentData = useMemo(() => {
    return generateChartData('revenue', range, offset, bookings, []);
  }, [range, offset, bookings]);

  const handleRangeChange = (newRange: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setRange(newRange);
    setOffset(0);
  };

  const handlePrev = () => setOffset(prev => prev + 1);
  const handleNext = () => setOffset(prev => prev - 1);

  return (
    <div className="bg-white/70 backdrop-blur-xl p-4 sm:p-6 rounded-2xl shadow-sm border border-white/20 h-full flex flex-col transition-colors duration-1000">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Revenue Trend</h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {range === 'yearly' ? 'Year-over-year' : range === 'monthly' ? 'Month-over-month' : range === 'weekly' ? 'Week-over-week' : 'Daily'} booking revenue metrics
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-200">
            <button
              onClick={handlePrev}
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNext}
              disabled={offset <= 0}
              className={`p-1 rounded transition-colors ${offset <= 0 ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700'}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <select
            className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
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
          <BarChart data={currentData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--color-slate-200), 0.5)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(var(--color-slate-400), 1)', fontSize: 11, fontWeight: 500 }}
              dy={10}
              height={40}
              minTickGap={32}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={60}
              tick={{ fill: 'rgba(var(--color-slate-400), 1)', fontSize: 11, fontWeight: 500 }}
              tickMargin={10}
              tickFormatter={(value) => {
                if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                return `₹${value}`;
              }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const revenue = payload[0].value as number;
                  const isMonthly = range === 'monthly';

                  const normalRent = isMonthly && rooms ? rooms.length * 12000 : 0;
                  const increment = revenue - normalRent;
                  const hasIncrement = increment > 0;

                  return (
                    <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-xl min-w-[150px]">
                      <p className="text-sm font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-slate-500 font-medium mr-4">Revenue</span>
                        <span className="font-bold text-blue-600">₹{revenue.toLocaleString()}</span>
                      </div>

                      {isMonthly && normalRent > 0 && (
                        <>
                          <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-slate-500 font-medium mr-4">Normal Rent</span>
                            <span className="font-bold text-slate-700">₹{normalRent.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-1 mt-1">
                            <span className="text-slate-500 font-medium mr-4">Increment</span>
                            <span className={`font-bold ${hasIncrement ? 'text-green-500' : 'text-slate-500'}`}>
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
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;

