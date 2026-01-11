import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../types';
import { Plus, Upload, Leaf, Flame, Sparkles } from 'lucide-react';
import Modal from '../ui/Modal';

interface AddFoodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (item: Omit<MenuItem, 'id'>) => void;
    initialData?: MenuItem | null; // For Edit Mode
}

const CATEGORIES = ['Starters', 'Mains', 'Desserts', 'Drinks'] as const;

const AddFoodModal: React.FC<AddFoodModalProps> = ({ isOpen, onClose, onAdd, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: 'Mains' as MenuItem['category'],
        description: '',
        image: '',
        isVegetarian: true,
        isSpicy: false,
    });

    // Load initial data when modal opens with data
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                price: initialData.price.toString(),
                category: initialData.category,
                description: initialData.description,
                image: initialData.image,
                isVegetarian: initialData.isVegetarian,
                isSpicy: initialData.isSpicy || false,
            });
        } else {
            // Reset if adding new
            setFormData({
                name: '', price: '', category: 'Mains', description: '', image: '', isVegetarian: true, isSpicy: false
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            name: formData.name,
            price: Number(formData.price),
            category: formData.category,
            description: formData.description,
            image: formData.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800', // Default placeholder
            isVegetarian: formData.isVegetarian,
            isSpicy: formData.isSpicy,
        });
        onClose();
        // Reset form only if not in edit mode
        if (!initialData) {
            setFormData({
                name: '', price: '', category: 'Mains', description: '', image: '', isVegetarian: true, isSpicy: false
            });
        }
    };

    // Luxury Styles
    const elegantInput = "w-full bg-slate-50/50 border-b border-slate-200 focus:border-slate-800 text-slate-800 px-0 py-2.5 text-sm transition-all outline-none placeholder:text-slate-300 hover:bg-slate-50 focus:bg-transparent";
    const elegantLabel = "text-[10px] font-bold text-slate-400 uppercase tracking-widest";
    const floatingGroup = "relative";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Culinary Item' : 'New Culinary Item'} maxWidth="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={floatingGroup}>
                        <label className={elegantLabel}>Dish Name</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. Truffle Risotto"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className={elegantInput}
                        />
                    </div>
                    <div className={floatingGroup}>
                        <label className={elegantLabel}>Price (₹)</label>
                        <input
                            required
                            type="number"
                            placeholder="0"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                            className={elegantInput}
                        />
                    </div>
                </div>

                {/* Category & Attributes */}
                <div className="space-y-4">
                    <label className={elegantLabel}>Category & Type</label>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setFormData({ ...formData, category: cat })}
                                className={`px-4 py-2 text-sm font-bold rounded-full transition-all border ${formData.category === cat
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isVegetarian: !formData.isVegetarian })}
                            className={`flex flex-1 items-center justify-center gap-2 p-3 rounded-xl border transition-all ${formData.isVegetarian
                                ? 'bg-green-50 border-green-200 text-green-700 shadow-sm'
                                : 'text-slate-400 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <Leaf size={16} />
                            <span className="text-sm font-bold">Vegetarian</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isSpicy: !formData.isSpicy })}
                            className={`flex flex-1 items-center justify-center gap-2 p-3 rounded-xl border transition-all ${formData.isSpicy
                                ? 'bg-red-50 border-red-200 text-red-700 shadow-sm'
                                : 'text-slate-400 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <Flame size={16} />
                            <span className="text-sm font-bold">Spicy</span>
                        </button>
                    </div>
                </div>

                {/* Description */}
                <div className={floatingGroup}>
                    <label className={elegantLabel}>Description</label>
                    <textarea
                        rows={3}
                        placeholder="Describe flavors, ingredients, and presentation..."
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className={`${elegantInput} resize-none`}
                    />
                </div>

                {/* Image URL */}
                <div className={floatingGroup}>
                    <label className={elegantLabel}>Image URL</label>
                    <div className="relative">
                        <input
                            type="url"
                            placeholder="https://..."
                            value={formData.image}
                            onChange={e => setFormData({ ...formData, image: e.target.value })}
                            className={`${elegantInput} pl-8`}
                        />
                        <Upload size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300" />
                    </div>
                </div>


                {/* Submit Action */}
                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2"
                    >
                        <Plus size={18} />
                        {initialData ? 'Save Changes' : 'Add to Menu'}
                    </button>
                </div>

            </form>
        </Modal>
    );
};

export default AddFoodModal;
