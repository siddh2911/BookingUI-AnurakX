import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, PieChart, X } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  period?: string;
  total?: string | number;
  totalTrend?: { value: number; positive: boolean };
  icon: React.ReactNode;
  onClick?: () => void;
  details: { label: string; value: string | number; trend?: { value: number; positive: boolean } }[];
  comparatorLabel?: string;
  isRevenueVisible?: boolean;
  setIsRevenueVisible?: (visible: boolean) => void;
  hoverContent?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, total, totalTrend, icon, onClick, details, comparatorLabel, isRevenueVisible = true, setIsRevenueVisible, hoverContent, trend }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsDetailsOpen(false);
      }
    };

    if (isDetailsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isDetailsOpen]);

  const toggleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetailsOpen(!isDetailsOpen);
  };

  const showContent = hoverContent && isRevenueVisible;
  const isExpanded = showContent && isDetailsOpen ? '-translate-y-full opacity-0' : '';
  const overlayExpanded = showContent && isDetailsOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0';

  return (
    <div
      ref={cardRef}
      className={`bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-white/20 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition duration-500"></div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
            {setIsRevenueVisible && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsRevenueVisible(!isRevenueVisible); }}
                className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded-full hover:bg-slate-50"
                title={isRevenueVisible ? "Hide Value" : "Show Value"}
              >
                {isRevenueVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
            {hoverContent && isRevenueVisible && (
              <button
                onClick={toggleDetails}
                className={`transition-colors p-1 rounded-full hover:bg-slate-100 ${isDetailsOpen ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:text-blue-500'}`}
                title="View Details"
              >
                {isDetailsOpen ? <X size={14} /> : <PieChart size={14} />}
              </button>
            )}
          </div>
          <div className="p-3 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-500 rounded-xl shadow-inner group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">

          <div
            className={`transition-all duration-500 ease-out transform ${isExpanded}`}
          >
            <div
              className="space-y-4"
              title={onClick ? `Click to view details` : ''}
              style={{ cursor: onClick ? 'pointer' : 'default' }}
            >
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Today</p>
                  <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {isRevenueVisible ? value : <span className="text-slate-300">••••••</span>}
                  </p>
                  <div className={`flex items-center gap-1 mt-1 text-xs font-bold ${trend?.positive ? 'text-emerald-500' : 'text-slate-400'} ${isRevenueVisible && trend ? '' : 'invisible'}`}>
                    <span>{trend ? (trend.value > 0 ? '+' : '') + trend.value + '%' : '0%'}</span>
                    <span className="text-slate-400 font-medium uppercase text-[9px] tracking-wide">{trend?.label || 'Target'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium mb-1">All-time</p>
                  <p className="text-sm font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 inline-block">
                    {isRevenueVisible ? total : '•••'}
                  </p>
                  <p className={`text-[10px] font-bold mt-1 ${totalTrend?.positive ? 'text-emerald-500' : 'text-rose-500'} ${isRevenueVisible && totalTrend ? '' : 'invisible'}`}>
                    {totalTrend ? (totalTrend.value > 0 ? '+' : '') + totalTrend.value + '%' : '0%'}
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-100 my-4 w-full"></div>

              <div className="grid grid-cols-2 gap-y-6 md:grid-cols-4 md:gap-y-0 md:divide-x md:divide-slate-100">
                {details.map((detail, index) => (
                  <div key={detail.label} className="px-1 flex flex-col items-center justify-start md:first:pl-0 md:last:pr-0">
                    <p className="text-xs md:text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 opacity-70">{detail.label}</p>
                    <p className="text-sm md:text-[11px] font-bold text-slate-700 tracking-tight leading-none mb-1">
                      {isRevenueVisible ? detail.value : <span className="text-slate-200">•••</span>}
                    </p>
                    <div className={`h-3 flex items-center justify-center w-full ${isRevenueVisible && detail.trend ? '' : 'invisible'}`}>
                      {detail.trend && (
                        <span className={`text-[10px] md:text-[8px] font-bold ${detail.trend.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {detail.trend.value > 0 ? '+' : ''}{detail.trend.value}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-3 flex items-center justify-center ${comparatorLabel && isRevenueVisible ? '' : 'invisible'}`}>
                <span className="text-[9px] font-medium text-slate-400 italic">
                  {comparatorLabel || 'Placeholder'}
                </span>
              </div>
            </div>
          </div>

          {showContent && (
            <div
              className={`absolute inset-0 transition-all duration-500 ease-out flex flex-col justify-center ${overlayExpanded}`}
              style={{ cursor: onClick ? 'pointer' : 'default' }}
              onClick={(e) => e.stopPropagation()}
            >
              {hoverContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
