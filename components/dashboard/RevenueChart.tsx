import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueChartProps {
  data: any[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
       <div className="flex justify-between items-center mb-6">
         <h3 className="text-lg font-bold text-slate-800">Revenue Trend</h3>
         <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Last 7 Days</span>
       </div>
       <div className="h-64 w-full">
         <ResponsiveContainer width="100%" height="100%">
           <BarChart data={data} margin={{top: 5, right: 5, left: -20, bottom: 0}}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
             <XAxis 
               dataKey="name" 
               axisLine={false} 
               tickLine={false} 
               tick={{fill: '#64748b', fontSize: 12}} 
               dy={10}
             />
             <YAxis 
               axisLine={false} 
               tickLine={false} 
               tick={{fill: '#64748b', fontSize: 12}} 
               tickFormatter={(value) => `₹${value}`}
             />
             <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                formatter={(value) => [`₹${value}`, 'Revenue']}
             />
             <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
           </BarChart>
         </ResponsiveContainer>
       </div>
    </div>
  );
};

export default RevenueChart;
