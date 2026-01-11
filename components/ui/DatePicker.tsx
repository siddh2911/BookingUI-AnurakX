import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { cn } from '../../lib/utils'; // Assuming this exists based on previous conversations about clsx/tailwind-merge

interface DatePickerProps {
    label?: string;
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    minDate?: string;
    className?: string;
    disabled?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, minDate, className, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Initialize current month to selected date if valid
    useEffect(() => {
        if (value && !isNaN(Date.parse(value))) {
            setCurrentMonth(parseISO(value));
        }
    }, [value, isOpen]);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    const handleDateClick = (date: Date) => {
        onChange(format(date, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth)),
        end: endOfWeek(endOfMonth(currentMonth))
    });

    const displayValue = value ? format(parseISO(value), 'dd MMM yyyy') : '';

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            {label && <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">{label}</label>}

            <div
                className={cn(
                    "w-full bg-slate-50/50 border-b border-slate-200 text-slate-800 py-2 md:py-3 text-sm md:text-base transition-all flex items-center justify-between cursor-pointer hover:bg-slate-50",
                    disabled && "opacity-50 cursor-not-allowed",
                    isOpen && "border-slate-800"
                )}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={cn(!value && "text-slate-300")}>
                    {displayValue || "Select Date"}
                </span>
                <CalendarIcon size={16} className="text-slate-400" />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 z-50 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 p-3 md:p-4 w-[280px] md:w-[300px] animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-bold text-slate-800">
                            {format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-center text-xs font-bold text-slate-400 py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {daysInMonth.map((date, idx) => {
                            const isSelected = value ? isSameDay(date, parseISO(value)) : false;
                            const isCurrentMonth = isSameMonth(date, currentMonth);
                            const isPast = minDate ? date < parseISO(minDate) : false; // Naive check, usually need startOfDay

                            const isDisabled = isPast && !isSameDay(date, parseISO(minDate || ''));

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !isDisabled && handleDateClick(date)}
                                    disabled={isDisabled}
                                    className={cn(
                                        "h-8 w-8 md:h-9 md:w-9 text-sm rounded-full flex items-center justify-center transition-all relative",
                                        !isCurrentMonth && "text-slate-300",
                                        isCurrentMonth && !isSelected && "text-slate-700 hover:bg-slate-100",
                                        isSelected && "bg-slate-900 text-white shadow-lg shadow-slate-900/20 font-bold",
                                        isToday(date) && !isSelected && "text-blue-600 font-bold bg-blue-50",
                                        isDisabled && "opacity-20 cursor-not-allowed hover:bg-transparent"
                                    )}
                                >
                                    {format(date, 'd')}
                                    {isSelected && (
                                        <span className="absolute inset-0 border-2 border-white rounded-full mix-blend-overlay opacity-30"></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
