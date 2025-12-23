import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  period?: string;
  total?: string | number;
  icon: React.ReactNode;
  onClick?: () => void;
  details: { label: string; value: string | number }[];
  isRevenueVisible?: boolean;
  setIsRevenueVisible?: (visible: boolean) => void;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, total, icon, onClick, details, isRevenueVisible = true, setIsRevenueVisible }) => {
  return (
    <div
      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group relative overflow-hidden"
    >
      {/* Decorative gradient blob */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-2xl group-hover:bg-blue-100 transition duration-500"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
            {setIsRevenueVisible && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsRevenueVisible(!isRevenueVisible); }}
                className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded-full hover:bg-slate-50"
              >
                {isRevenueVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
          </div>
          <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-xl shadow-inner group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        </div>

        <div
          className="space-y-4"
          onClick={onClick}
          title={onClick ? `Click to view details` : ''}
          style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">Today</p>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isRevenueVisible ? value : <span className="text-slate-200">••••••</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-medium mb-1">All-time</p>
              <p className="text-sm font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 inline-block">
                {isRevenueVisible ? total : '•••'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50 text-center">
            {details.map(detail => (
              <div key={detail.label} className="p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{detail.label}</p>
                <p className="text-sm font-bold text-slate-700">
                  {isRevenueVisible ? detail.value : <span className="text-slate-200">•••</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
