import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Booking } from '../../types';
import { generateChartData } from '../../services/chartUtils';

interface RevenueChartProps {
  bookings: Booking[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ bookings }) => {
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [offset, setOffset] = useState(0);

  const currentData = useMemo(() => {
    return generateChartData('revenue', range, offset, bookings, []);
  }, [range, offset, bookings]);

  const handleRangeChange = (newRange: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setRange(newRange);
    setOffset(0); // Reset offset when changing range
  };

  const handlePrev = () => setOffset(prev => prev + 1); // +1 moves further back in time
  const handleNext = () => setOffset(prev => prev - 1); // -1 moves closer to present

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              dy={10}
              height={40}
              minTickGap={32}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={45}
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              tickFormatter={(value) => {
                if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                return `₹${value}`;
              }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(4px)',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
                padding: '12px'
              }}
              formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
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

