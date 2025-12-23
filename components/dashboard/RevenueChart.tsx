import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueChartProps {
  data: any[];
}

const RevenueChart: React.FC<{ data: { last7Days: any[]; last30Days: any[]; last1Year: any[] } }> = ({ data }) => {
  const [range, setRange] = React.useState<'7d' | '30d' | '1y'>('7d');

  const currentData = React.useMemo(() => {
    switch (range) {
      case '30d': return data.last30Days;
      case '1y': return data.last1Year;
      case '7d': default: return data.last7Days;
    }
  }, [range, data]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Revenue Trend</h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {range === '1y' ? 'Monthly' : 'Daily'} booking revenue metrics
          </p>
        </div>
        <select
          className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          value={range}
          onChange={(e) => setRange(e.target.value as any)}
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="1y">Last 1 Year</option>
        </select>
      </div>
      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={currentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              dy={10}
              interval={range === '30d' ? 6 : 0} // Reduce ticks for 30d view
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip
              cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }}
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
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb', shadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;
