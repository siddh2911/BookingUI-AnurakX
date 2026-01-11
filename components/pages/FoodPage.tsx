import React, { useState } from 'react';
import { MenuItem, Room, RoomStatus, FoodOrder } from '../../types';
import { FoodCard } from '../dining/FoodCard';
import AddFoodModal from '../modals/AddFoodModal';
import { ChevronsUpDown, CheckCircle, Search, Plus, Filter, Loader2, Info, AlertTriangle, MessageSquare, Phone, UtensilsCrossed, Calendar, X, ChevronDown, User, Hash, Clock, ArrowRight, DollarSign, ChefHat, ShoppingBag, Trash2, Minus, Send, Pencil } from 'lucide-react';

interface FoodPageProps {
    rooms: Room[];
}


const INITIAL_MENU: MenuItem[] = [
    { id: '1', name: 'Butter Chicken', category: 'Mains', price: 450, isVegetarian: false, description: 'Tender chicken cooked in a rich tomato and butter gravy.', isSpicy: false, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&q=80&w=800' },
    { id: '2', name: 'Paneer Tikka', category: 'Starters', price: 320, isVegetarian: true, description: 'Marinated cottage cheese cubes grilled to perfection.', isSpicy: true, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=800' },
    { id: '3', name: 'Garlic Naan', category: 'Mains', price: 60, isVegetarian: true, description: 'Soft Indian bread topped with minced garlic and butter.', isSpicy: false, image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&q=80&w=800' },
    { id: '4', name: 'Chocolate Brownie', category: 'Desserts', price: 180, isVegetarian: true, description: 'Warm fudge brownie served with vanilla ice cream.', isSpicy: false, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=800' },
    { id: '5', name: 'Masala Chai', category: 'Drinks', price: 40, isVegetarian: true, description: 'Traditional Indian spiced tea.', isSpicy: false, image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=800' },
    { id: '6', name: 'Veg Hakka Noodles', category: 'Mains', price: 280, isVegetarian: true, description: 'Stir-fried noodles with fresh vegetables.', isSpicy: false, image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&q=80&w=800' },
    { id: '7', name: 'Chicken Biryani', category: 'Mains', price: 380, isVegetarian: false, description: 'Aromatic basmati rice cooked with spiced chicken.', isSpicy: true, image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&q=80&w=800' },
    { id: '8', name: 'Mango Lassi', category: 'Drinks', price: 90, isVegetarian: true, description: 'Refreshing yogurt-based mango drink.', isSpicy: false, image: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&q=80&w=800' },
];

const CATEGORIES = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks'];

const FoodPage: React.FC<FoodPageProps> = ({ rooms }) => {
    const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
    const [activeTab, setActiveTab] = useState<'menu' | 'inbox'>('menu');

    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [incomingOrders, setIncomingOrders] = useState<FoodOrder[]>([]);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    
    const filteredItems = menu.filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    
    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.item.id === item.id);
            if (existing) {
                return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { item, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(i => i.item.id !== itemId));
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.item.id === itemId) {
                return { ...i, quantity: Math.max(1, i.quantity + delta) };
            }
            return i;
        }));
    };

    
    const handleAddItem = (itemData: Omit<MenuItem, 'id'>) => {
        if (editingItem) {
            
            setMenu(prev => prev.map(item => item.id === editingItem.id ? { ...itemData, id: item.id } : item));
            setEditingItem(null);
        } else {
            
            const newItem: MenuItem = { ...itemData, id: Date.now().toString() };
            setMenu(prev => [newItem, ...prev]);
        }
        setIsAddModalOpen(false); 
    };

    const handleEditItem = (item: MenuItem) => {
        setEditingItem(item);
        setIsAddModalOpen(true);
    }

    const handleDeleteItem = (id: string) => {
        if (confirm('Are you sure you want to delete this item?')) {
            setMenu(prev => prev.filter(item => item.id !== id));
        }
    }

    const openAddModal = () => {
        setEditingItem(null);
        setIsAddModalOpen(true);
    }

    const updateOrderStatus = (orderId: string, status: FoodOrder['status']) => {
        setIncomingOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    };

    const cartTotal = cart.reduce((sum, i) => sum + (i.item.price * i.quantity), 0);

    const handlePlaceOrder = () => {
        if (!selectedRoomId) return alert('Please select a room');
        
        const newOrder: FoodOrder = {
            id: Date.now().toString(),
            roomId: selectedRoomId,
            items: cart.map(c => ({ menuItem: c.item, quantity: c.quantity })),
            status: 'Pending', 
            totalAmount: cartTotal,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setIncomingOrders(prev => [newOrder, ...prev]);
        setCart([]);
        setActiveTab('inbox');
    };

    const [isCartOpen, setIsCartOpen] = useState(false);

    

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-6 relative">
            <AddFoodModal
                key={editingItem ? editingItem.id : 'new-item'}
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddItem}
                initialData={editingItem}
            />

            {}
            <div className="flex-1 flex flex-col min-w-0 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-white/40 shadow-sm overflow-hidden relative">
                {}
                <div className="p-5 md:p-8 border-b border-slate-100/50 flex flex-col gap-4 md:gap-6 bg-white/50 backdrop-blur-xl sticky top-0 z-10 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight font-serif">Dining Menu</h1>
                            <p className="text-slate-500 text-sm font-medium mt-0.5 md:mt-1">Culinary delights for your guests</p>
                        </div>
                        {}
                        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl backdrop-blur-md self-start md:self-auto">
                            <button
                                onClick={() => setActiveTab('menu')}
                                className={`flex-1 md:flex-none py-2 px-4 md:py-2.5 md:px-6 rounded-xl text-xs md:text-sm font-bold transition-all shadow-sm ${activeTab === 'menu' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700 shadow-none'}`}
                            >
                                Menu
                            </button>
                            <button
                                onClick={() => setActiveTab('inbox')}
                                className={`flex-1 md:flex-none py-2 px-4 md:py-2.5 md:px-6 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 relative ${activeTab === 'inbox' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ChefHat size={16} className="md:w-[18px] md:h-[18px]" />
                                <span className="whitespace-nowrap">Live Orders</span>
                                {incomingOrders.filter(o => o.status === 'Pending').length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full ring-2 ring-white">
                                        {incomingOrders.filter(o => o.status === 'Pending').length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {activeTab === 'menu' && (
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
                            {}
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search dishes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium shadow-sm text-sm md:text-base"
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide -mx-1 px-1">
                                {}
                                <div className="flex gap-2 p-1 bg-white/50 rounded-2xl border border-slate-100">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveCategory(cat)}
                                            className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat
                                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={openAddModal}
                                className="hidden md:flex py-2.5 px-5 bg-blue-600 text-white rounded-xl font-bold items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 shrink-0 text-sm"
                            >
                                <Plus size={18} /> Add Item
                            </button>
                            {}
                            <button
                                onClick={openAddModal}
                                className="md:hidden py-2.5 px-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm shrink-0 text-sm"
                            >
                                <Plus size={16} /> New Dish
                            </button>
                        </div>
                    )}
                </div>

                {}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/30">
                    {activeTab === 'menu' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-24 md:pb-0">
                            {filteredItems.map(item => (
                                <div key={item.id} className="h-full">
                                    <FoodCard
                                        item={item}
                                        onAdd={addToCart}
                                        onEdit={() => handleEditItem(item)}
                                        onDelete={() => handleDeleteItem(item.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-3xl mx-auto">
                            {incomingOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <UtensilsCrossed size={48} className="mb-4 opacity-50" />
                                    <p>No active orders. Kitchen is quiet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {incomingOrders.map(order => (
                                        <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-md">Room {rooms.find(r => String(r.id) === String(order.roomId))?.number || order.roomId}</span>
                                                        <span className="text-slate-400 text-xs font-medium">#{order.id.slice(-4)}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">{order.timestamp}</p>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold capitalize
                              ${order.status === 'Pending' ? 'bg-orange-100 text-orange-600 animate-pulse' : ''}
                              ${order.status === 'Cooking' ? 'bg-yellow-100 text-yellow-700' : ''}
                              ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' : ''}
                           `}>
                                                    {order.status}
                                                </div>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm">
                                                        <span className="text-slate-700 font-medium">{item.quantity}x {item.menuItem.name}</span>
                                                        <span className="text-slate-500">₹{item.menuItem.price * item.quantity}</span>
                                                    </div>
                                                ))}
                                                <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900">
                                                    <span>Total</span>
                                                    <span>₹{order.totalAmount}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {order.status === 'Pending' && (
                                                    <button onClick={() => updateOrderStatus(order.id, 'Cooking')} className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors">
                                                        Accept & Cook
                                                    </button>
                                                )}
                                                {order.status === 'Cooking' && (
                                                    <button onClick={() => updateOrderStatus(order.id, 'Delivered')} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                                        <CheckCircle size={16} /> Mark Delivered
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {}
            <button
                onClick={() => setIsCartOpen(true)}
                className="fixed bottom-6 right-6 z-[100] p-4 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-blue-600 transition-all hover:scale-110 active:scale-95 flex items-center justify-center group border-[3px] border-white/20 backdrop-blur-sm"
                title="Open Cart"
            >
                <ShoppingBag size={22} />
                {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-white animate-bounce">
                        {cart.reduce((sum, i) => sum + i.quantity, 0)}
                    </span>
                )}
            </button>

            {}
            {isCartOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-300 border border-slate-100">

                        {}
                        <div className="px-6 py-5 border-b border-transparent flex justify-between items-center bg-white sticky top-0 z-20">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: '"Playfair Display", serif' }}>
                                    Manual Order
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 rounded-full hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-900"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {}
                        <div className="p-6 md:p-8 bg-slate-50/30 flex-1 overflow-y-auto custom-scrollbar">

                            {}
                            <div className="mb-8">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Guest Room</label>
                                <div className="relative group">
                                    {}
                                    <select
                                        value={selectedRoomId}
                                        onChange={(e) => setSelectedRoomId(e.target.value)}
                                        className="w-full bg-slate-50/50 border-b border-slate-200 focus:border-slate-800 text-slate-800 px-0 py-2 md:py-3 text-sm md:text-base transition-all outline-none appearance-none cursor-pointer placeholder:text-slate-300 hover:bg-slate-50 focus:bg-transparent"
                                    >
                                        <option value="" className="text-slate-400">Select a room...</option>
                                        {rooms.filter(r => r.status === RoomStatus.OCCUPIED).map(room => (
                                            <option key={room.id} value={room.id}>Room {room.number}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>

                            {}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                    <h3 className="text-lg md:text-xl text-slate-900 font-medium" style={{ fontFamily: '"Playfair Display", serif' }}>
                                        Order Summary
                                    </h3>
                                    <span className="text-slate-400 text-sm font-medium">{cart.length} Items</span>
                                </div>

                                {cart.length === 0 ? (
                                    <div className="py-8 flex flex-col items-center justify-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl">
                                        <ShoppingBag size={24} className="opacity-30" />
                                        <p className="text-sm font-medium text-slate-500">Cart is empty</p>
                                    </div>
                                ) : (
                                    cart.map(({ item, quantity }) => (
                                        <div key={item.id} className="flex gap-4 items-start group">
                                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-100 shadow-sm border border-slate-100">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            </div>

                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-medium text-slate-900 text-base line-clamp-1">{item.name}</p>
                                                    <p className="font-bold text-slate-900 text-sm">₹{item.price * quantity}</p>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <p className="text-xs text-slate-400">₹{item.price} each</p>

                                                    {}
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, -1)}
                                                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
                                                        >
                                                            <Minus size={12} strokeWidth={2} />
                                                        </button>
                                                        <span className="text-sm font-bold text-slate-900 w-4 text-center">{quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, 1)}
                                                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900 transition-colors"
                                                        >
                                                            <Plus size={12} strokeWidth={2} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="text-[10px] font-bold text-red-400 uppercase tracking-wider mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {}
                            <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium text-sm">Total Amount</span>
                                    <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: '"Playfair Display", serif' }}>₹{cartTotal}</span>
                                </div>
                                <button
                                    disabled={cart.length === 0 || !selectedRoomId}
                                    onClick={handlePlaceOrder}
                                    className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors text-sm shadow-lg disabled:opacity-50 disabled:shadow-none"
                                >
                                    Confirm Order
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FoodPage;
