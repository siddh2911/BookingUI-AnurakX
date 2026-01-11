import React, { useMemo } from 'react';
import { Booking } from '../../types';
import PlatformIcon from '../common/PlatformIcon';
import { PieChart } from 'lucide-react';

interface BookingStatsProps {
    bookings: Booking[];
    className?: string; // Allow external sizing/positioning
    compact?: boolean;  // Toggle for ultra-compact mode
    mode?: 'count' | 'revenue' | 'percent'; // New mode prop
}

const BookingStats: React.FC<BookingStatsProps> = ({ bookings, className, compact = false, mode = 'count' }) => {
    const stats = useMemo(() => {
        const counts: Record<string, number> = {};
        let total = 0;

        bookings.forEach(b => {
            // Exclude cancelled bookings for revenue
            if (mode === 'revenue' && b.status === 'Cancelled') return;

            // normalize source
            let source = b.source || 'Direct';

            // Calculate based on mode, with fallback for revenue
            // 'percent' mode uses count logic for calculation
            const value = mode === 'revenue' ? (b.totalAmount || b.totalPaid || 0) : 1;

            counts[source] = (counts[source] || 0) + value;
            total += value;
        });

        // Convert to array and sort
        const sorted = Object.entries(counts)
            .map(([source, value]) => ({
                source,
                value,
                percentage: total > 0 ? (value / total) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value);

        if (compact && sorted.length > 3) {
            const top3 = sorted.slice(0, 3);
            const others = sorted.slice(3);
            const othersValue = others.reduce((sum, item) => sum + item.value, 0);
            const othersPercentage = others.reduce((sum, item) => sum + item.percentage, 0);

            // Format for tooltip
            const othersTooltip = others.map(o => {
                let displayVal = o.value.toString();
                if (mode === 'revenue' && o.value >= 1000) displayVal = `₹${(o.value / 1000).toFixed(1)}k`;
                if (mode === 'percent') displayVal = `${(total > 0 ? (o.value / total) * 100 : 0).toFixed(1)}%`;
                return `${o.source}: ${displayVal}`;
            }).join('\n');

            return [
                ...top3,
                { source: 'Others', value: othersValue, percentage: othersPercentage, tooltip: othersTooltip }
            ];
        }

        return sorted;
    }, [bookings, compact, mode]);

    const formatValue = (value: number, percentage: number) => {
        if (mode === 'revenue') {
            if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
            return `₹${value}`;
        }
        if (mode === 'percent') {
            return `${percentage.toFixed(1)}%`;
        }
        return value.toString();
    };

    if (stats.length === 0) return null;

    return (
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col h-full ${className} ${compact ? 'p-0 shadow-none border-none bg-transparent' : ''}`}>
            {!compact && (
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <PieChart size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Booking Sources</h3>
                </div>
            )}

            <div className={`flex-1 ${compact ? 'overflow-hidden space-y-2' : 'overflow-y-auto space-y-5 custom-scrollbar pr-2'}`}>
                {stats.map(({ source, value, percentage, tooltip }: any) => (
                    <div key={source} className="group" title={tooltip}>
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-md text-slate-500 transition-colors ${compact ? 'p-1' : 'bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                                    <PlatformIcon source={source === 'Others' ? 'Direct' : source} className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                                </div>
                                <span className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-slate-700`}>{source}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {!compact && (
                                    <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                                        {percentage.toFixed(1)}%
                                    </span>
                                )}
                                <span className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-slate-900 w-auto text-right`}>{formatValue(value, percentage)}</span>
                            </div>
                        </div>
                        {/* Progress Bar */}
                        <div className={`${compact ? 'h-1.5' : 'h-2'} w-full bg-slate-100 rounded-full overflow-hidden`}>
                            <div
                                className={`h-full bg-slate-900 rounded-full group-hover:bg-indigo-600 transition-colors duration-300 ease-out`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {!compact && (
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                    <span>Total Bookings</span>
                    <span className="font-bold text-slate-900">{bookings.length}</span>
                </div>
            )}
        </div>
    );
};

export default BookingStats;
