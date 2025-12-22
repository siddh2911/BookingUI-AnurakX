import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  period?: string;
  total?: string | number;
  icon: React.ReactNode;
  onClick?: () => void;
  details: { label: string; value: string | number }[];
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, total, icon, onClick, details }) => {
  return (
    <div 
      className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      title={onClick ? `Click to view details` : ''}
    >
      <div>
        <div className="flex items-center justify-between pb-4">
          <h3 className="text-sm font-medium text-slate-500">{title}</h3>
          <div className="p-2 bg-green-100 rounded-lg text-green-600">{icon}</div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-end">
              <div>
                  <p className="text-xs text-slate-400">Today</p>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
              </div>
               <div className="text-right">
                  <p className="text-xs text-slate-400">Total (All-time)</p>
                  <p className="text-sm font-semibold text-slate-700">{total}</p>
              </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
               {details.map(detail => (
                 <div key={detail.label}>
                   <p className="text-[10px] text-slate-400 uppercase">{detail.label}</p>
                   <p className="text-sm font-semibold text-slate-700">{detail.value}</p>
                 </div>
               ))}
          </div>
        </div>
      </div>
    </div>
  );
};
