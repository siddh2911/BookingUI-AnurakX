import React from 'react';
import { MenuItem } from '../../types';
import { Plus, Leaf, Flame, Pencil, Trash2, UtensilsCrossed } from 'lucide-react';

interface FoodCardProps {
    item: MenuItem;
    onAdd: (item: MenuItem) => void;
    onEdit?: (item: MenuItem) => void;
    onDelete?: (id: string) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item, onAdd, onEdit, onDelete }) => {
    return (
        <div className="group bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] border border-slate-100/50 overflow-hidden transition-all duration-500 hover:-translate-y-1 flex flex-col h-full">

            {/* Image Area */}
            <div className="relative h-60 overflow-hidden">
                <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-300" />
            </div>

            {/* Content Area */}
            <div className="p-5 flex flex-col flex-1">
                {/* Header & Badges */}
                <div className="flex justify-between items-start gap-4 mb-3">
                    <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                        {item.name}
                    </h3>

                    {/* Compact Badges */}
                    <div className="flex gap-1 shrink-0">
                        {item.isVegetarian ? (
                            <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center" title="Vegetarian">
                                <div className="w-2 h-2 rounded-full bg-current" />
                            </div>
                        ) : (
                            <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center" title="Non-Vegetarian">
                                <div className="w-2 h-2 rounded-full bg-current" />
                            </div>
                        )}
                        {item.isSpicy && (
                            <div className="w-5 h-5 rounded-md bg-orange-50 text-orange-500 flex items-center justify-center" title="Spicy">
                                <Flame size={12} fill="currentColor" />
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-6 flex-1 opacity-80">
                    {item.description}
                </p>

                {/* Actions - Clean & Functional */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                    <div className="flex gap-2">
                        {(onEdit || onDelete) && (
                            <>
                                {onEdit && (
                                    <button
                                        onClick={() => onEdit(item)}
                                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"
                                        title="Edit Item"
                                    >
                                        <Pencil size={18} strokeWidth={2} />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={() => onDelete(item.id)}
                                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"
                                        title="Delete Item"
                                    >
                                        <Trash2 size={18} strokeWidth={2} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => onAdd(item)}
                        className="pl-3 pr-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-900/20 hover:shadow-blue-600/30 flex items-center gap-3 group/btn"
                        title="Add to Manual Order"
                    >
                        <div className="bg-white/20 p-1 rounded-lg">
                            <Plus size={16} strokeWidth={3} className="group-active/btn:rotate-90 transition-transform" />
                        </div>
                        <span className="font-bold text-sm">₹{item.price}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
