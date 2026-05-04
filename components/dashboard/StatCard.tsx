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
  taxBadge?: { label: string; value: string };
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, total, totalTrend, icon, onClick, details, comparatorLabel, isRevenueVisible = true, setIsRevenueVisible, hoverContent, trend, taxBadge }) => {
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
      className={`bg-white/70 backdrop-blur-3xl p-6 rounded-[2rem] shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-white/80 flex flex-col justify-between transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-blue-400/30 group relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Dynamic ambient glows */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl group-hover:from-blue-400/20 group-hover:to-indigo-500/20 transition-all duration-700"></div>
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-emerald-400/5 to-blue-400/5 rounded-full blur-2xl group-hover:from-emerald-400/15 group-hover:to-blue-400/15 transition-all duration-700"></div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between pb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
            <div className="flex items-center gap-1.5 bg-slate-100/50 p-1 rounded-full">
              {setIsRevenueVisible && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsRevenueVisible(!isRevenueVisible); }}
                  className="text-slate-400 hover:text-blue-500 transition-colors p-1.5 rounded-full hover:bg-white shadow-sm"
                  title={isRevenueVisible ? "Hide Value" : "Show Value"}
                >
                  {isRevenueVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              )}
              {hoverContent && isRevenueVisible && (
                <button
                  onClick={toggleDetails}
                  className={`transition-all p-1.5 rounded-full ${isDetailsOpen ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-400 hover:text-blue-500 hover:bg-white'}`}
                  title="View Details"
                >
                  {isDetailsOpen ? <X size={12} /> : <PieChart size={12} />}
                </button>
              )}
            </div>
          </div>
          <div className="p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 group-hover:rotate-6 transition-all duration-500">
            {icon}
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className={`transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform ${isExpanded}`}>
            <div
              className="space-y-6"
              title={onClick ? `Click to view details` : ''}
              style={{ cursor: onClick ? 'pointer' : 'default' }}
            >
              <div className="flex justify-between items-end">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 opacity-60">Current Revenue</p>
                  <div className="flex flex-col gap-1">
                    <p className={`text-4xl font-black tracking-tighter ${isRevenueVisible ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent' : 'text-slate-200'}`}>
                      {isRevenueVisible ? value : '••••••'}
                    </p>
                    <div className={`flex items-center gap-2 ${isRevenueVisible && trend ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'} transition-all duration-500`}>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${trend?.positive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                        {trend ? (trend.value > 0 ? '↑ ' : '↓ ') + Math.abs(trend.value) + '%' : '0%'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{trend?.label || 'Target'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3 min-w-[100px]">
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 opacity-60">Cumulative</p>
                    <div className="flex flex-col items-end">
                      <span className="text-base font-black text-slate-700 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl shadow-sm">
                        {isRevenueVisible ? total : '•••'}
                      </span>
                      {totalTrend && (
                        <span className={`text-[10px] font-bold mt-1.5 ${totalTrend.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {totalTrend.value > 0 ? '+' : ''}{totalTrend.value}% YOY
                        </span>
                      )}
                    </div>
                  </div>

                  {isRevenueVisible && taxBadge && (
                    <div className="group/tax relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-rose-400 to-orange-400 rounded-lg blur opacity-20 group-hover/tax:opacity-40 transition duration-1000 group-hover/tax:duration-200 animate-pulse"></div>
                      <div className="relative flex flex-col items-end bg-white border border-rose-100 rounded-lg p-2 shadow-sm">
                        <span className="text-[8px] font-black uppercase tracking-[0.15em] text-rose-400 mb-0.5">Tax ({taxBadge.label})</span>
                        <span className="text-xs font-black text-rose-600 tracking-tight">{taxBadge.value}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent w-full"></div>

              <div className="grid grid-cols-4 gap-2">
                {details.map((detail, index) => (
                  <div key={detail.label} className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1.5 opacity-50">{detail.label}</p>
                    <p className="text-[13px] font-black text-slate-800 tracking-tight">
                      {isRevenueVisible ? detail.value : '•••'}
                    </p>
                    <div className={`mt-1 h-3 ${isRevenueVisible && detail.trend ? 'opacity-100' : 'opacity-0'}`}>
                      {detail.trend && (
                        <span className={`text-[9px] font-black ${detail.trend.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {detail.trend.value > 0 ? '↑' : '↓'}{Math.abs(detail.trend.value)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {comparatorLabel && isRevenueVisible && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <div className="h-px w-4 bg-slate-200"></div>
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                    {comparatorLabel}
                  </span>
                  <div className="h-px w-4 bg-slate-200"></div>
                </div>
              )}
            </div>
          </div>

          {showContent && (
            <div
              className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col justify-center ${overlayExpanded}`}
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
