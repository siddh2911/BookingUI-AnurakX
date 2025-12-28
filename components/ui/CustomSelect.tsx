import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    value: string | number;
    label: string;
    subtitle?: string;
    icon?: React.ReactNode;
}

interface CustomSelectProps {
    label?: string;
    options: SelectOption[];
    value: string | number | undefined;
    onChange: (value: string | number) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    required?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = "Select...",
    disabled = false,
    className = "",
    required = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                    {label} {required && <span className="text-red-400">*</span>}
                </label>
            )}

            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    w-full bg-slate-50/50 border-b border-slate-200 
                    px-0 py-2 md:py-3 cursor-pointer
                    flex items-center justify-between
                    transition-all duration-200
                    hover:bg-slate-50
                    ${isOpen ? 'border-slate-800 bg-white' : ''}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${!selectedOption && !placeholder ? 'text-slate-300' : 'text-slate-800'}
                `}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selectedOption ? (
                        <>
                            {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                            <div className="flex flex-col truncate">
                                <span className="text-sm md:text-base font-medium truncate">{selectedOption.label}</span>
                            </div>
                        </>
                    ) : (
                        <span className="text-slate-400 text-sm md:text-base">{placeholder}</span>
                    )}
                </div>

                <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-slate-800' : ''}`}
                />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1 space-y-0.5">
                        {options.map((option) => {
                            const isSelected = option.value === value;
                            return (
                                <div
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                                        ${isSelected ? 'bg-slate-50 text-slate-900 mx-1' : 'hover:bg-slate-50 text-slate-600'}
                                    `}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {option.icon && (
                                            <div className={`shrink-0 ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                                                {option.icon}
                                            </div>
                                        )}
                                        <div className="flex flex-col truncate">
                                            <span className={`text-sm truncate ${isSelected ? 'font-bold' : 'font-medium'}`}>
                                                {option.label}
                                            </span>
                                            {option.subtitle && (
                                                <span className="text-xs text-slate-400 truncate">
                                                    {option.subtitle}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {isSelected && <Check size={14} className="text-blue-600 shrink-0 ml-2" />}
                                </div>
                            );
                        })}
                        {options.length === 0 && (
                            <div className="px-4 py-3 text-sm text-slate-400 text-center italic">
                                No options available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
