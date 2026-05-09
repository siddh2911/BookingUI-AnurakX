import React, { useState } from 'react';
import { Room, HousekeepingTask, MaintenanceTicket, Booking } from '../../types';
import HousekeepingGrid from '../rooms/HousekeepingGrid';
import MaintenanceBoard from '../rooms/MaintenanceBoard';
import { updateRoomCleanStatus, createMaintenanceTicket, updateMaintenanceTicketStatus, deleteMaintenanceTicket } from '../../services/api';

export default function RoomsPage({
    rooms, setRooms, bookings, housekeepingTasks, setHousekeepingTasks, maintenanceTickets, setMaintenanceTickets
}: {
    rooms: Room[]; setRooms: any; bookings: Booking[]; housekeepingTasks: HousekeepingTask[]; setHousekeepingTasks: any; maintenanceTickets: MaintenanceTicket[]; setMaintenanceTickets: any;
}) {
    const [activeTab, setActiveTab] = useState<'housekeeping' | 'maintenance' | 'plans'>('housekeeping');
    
    // Mock state for room plans (persisted to localStorage for now)
    const [packages, setPackages] = useState<string[]>(() => {
        const saved = localStorage.getItem('karuna_packages');
        return saved ? JSON.parse(saved) : ['Honeymoon', 'Standard', 'Corporate', 'Long Stay'];
    });
    const [mealPlans, setMealPlans] = useState<{code: string, name: string}[]>(() => {
        const saved = localStorage.getItem('karuna_meal_plans');
        return saved ? JSON.parse(saved) : [
            { code: 'EP', name: 'Room Only' },
            { code: 'CP', name: 'Breakfast' },
            { code: 'MAP', name: 'Half Board' },
            { code: 'AP', name: 'Full Board' }
        ];
    });
    const [bookingSources, setBookingSources] = useState<string[]>(() => {
        const saved = localStorage.getItem('karuna_booking_sources');
        if (saved) return JSON.parse(saved);
        // Default to the enum values
        return ['Direct Website', 'Walk-in', 'Booking.com', 'Airbnb', 'Expedia', 'Instagram', 'MakeMyTrip', 'Agoda', 'Goibibo'];
    });

    React.useEffect(() => {
        localStorage.setItem('karuna_packages', JSON.stringify(packages));
    }, [packages]);

    React.useEffect(() => {
        localStorage.setItem('karuna_meal_plans', JSON.stringify(mealPlans));
    }, [mealPlans]);

    React.useEffect(() => {
        localStorage.setItem('karuna_booking_sources', JSON.stringify(bookingSources));
    }, [bookingSources]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Room Management</h2>
                    <p className="text-slate-500 text-sm hidden md:block">Housekeeping status and maintenance tracking</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
                    <button
                        onClick={() => setActiveTab('housekeeping')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'housekeeping'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        Housekeeping
                    </button>
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'maintenance'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        Maintenance
                    </button>
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'plans'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        Rate Plans
                    </button>
                </div>
            </div>

            {/* Content Views */}
            <div className="mt-6">
                {activeTab === 'housekeeping' ? (
                    <HousekeepingGrid
                        rooms={rooms}
                        tasks={housekeepingTasks}
                        bookings={bookings}
                        onUpdateTask={(updatedTask) => {
                            setHousekeepingTasks((prev: any) => {
                                const existing = prev.find((t: any) => t.id === updatedTask.id);
                                if (existing) return prev.map((t: any) => t.id === updatedTask.id ? updatedTask : t);
                                return [...prev, updatedTask];
                            });
                            
                            // Immediately update room cleanStatus locally for UI responsiveness
                            const cStatus = updatedTask.status === 'Clean' ? 'CLEAN' : 
                                           updatedTask.status === 'Dirty' ? 'DIRTY' : 
                                           updatedTask.status === 'Inspected' ? 'INSPECTED' : 'CLEAN';
                            
                            setRooms((prev: Room[]) => prev.map(r => r.id === updatedTask.roomId ? { ...r, cleanStatus: cStatus as any } : r));

                            const roomNum = rooms.find(r => r.id === updatedTask.roomId)?.number;
                            if (roomNum) {
                                updateRoomCleanStatus(roomNum, cStatus as any).catch(console.error);
                            }
                        }}
                    />
                ) : activeTab === 'maintenance' ? (
                    <MaintenanceBoard
                        rooms={rooms}
                        tickets={maintenanceTickets}
                        onUpdateTicket={async (updatedTicket) => {
                            setMaintenanceTickets(prev => {
                                const existing = prev.find(t => t.id === updatedTicket.id);
                                if (existing) return prev.map(t => t.id === updatedTicket.id ? updatedTicket : t);
                                return [...prev, updatedTicket];
                            });
                            try {
                                if (updatedTicket.id.startsWith('mt_')) {
                                    const created = await createMaintenanceTicket(updatedTicket);
                                    setMaintenanceTickets((prev: any) => prev.map((t: any) => t.id === updatedTicket.id ? { ...updatedTicket, id: created.id.toString() } : t));
                                } else {
                                    await updateMaintenanceTicketStatus(updatedTicket.id, updatedTicket.status);
                                }
                            } catch (e) { console.error('Failed API sync:', e); }
                        }}
                        onDeleteTicket={async (ticketId) => {
                            setMaintenanceTickets((prev: any) => prev.filter((t: any) => t.id !== ticketId));
                            try {
                                await deleteMaintenanceTicket(ticketId);
                            } catch (e) { console.error(e); }
                        }}
                    />
                ) : activeTab === 'plans' ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Packages Section */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                                    Booking Packages
                                </h3>
                                <div className="space-y-3">
                                    {packages.map((pkg, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-lg">
                                            <span className="font-medium text-slate-700">{pkg}</span>
                                            <button 
                                                onClick={() => setPackages(packages.filter((_, i) => i !== idx))}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex gap-2 mt-4">
                                        <input 
                                            type="text" 
                                            id="new-package"
                                            placeholder="Add new package..." 
                                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = (e.target as HTMLInputElement).value.trim();
                                                    if (val && !packages.includes(val)) {
                                                        setPackages([...packages, val]);
                                                        (e.target as HTMLInputElement).value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <button 
                                            onClick={() => {
                                                const el = document.getElementById('new-package') as HTMLInputElement;
                                                const val = el.value.trim();
                                                if (val && !packages.includes(val)) {
                                                    setPackages([...packages, val]);
                                                    el.value = '';
                                                }
                                            }}
                                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Meal Plans Section */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                                    Meal Plans
                                </h3>
                                <div className="space-y-3">
                                    {mealPlans.map((plan, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-lg">
                                            <div>
                                                <span className="font-bold text-slate-800 mr-2">{plan.code}</span>
                                                <span className="text-slate-500 text-sm">({plan.name})</span>
                                            </div>
                                            <button 
                                                onClick={() => setMealPlans(mealPlans.filter((_, i) => i !== idx))}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex gap-2 mt-4">
                                        <input 
                                            type="text" 
                                            id="new-plan-code"
                                            placeholder="Code (e.g. BB)" 
                                            className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none uppercase"
                                        />
                                        <input 
                                            type="text" 
                                            id="new-plan-name"
                                            placeholder="Plan Name..." 
                                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    document.getElementById('add-plan-btn')?.click();
                                                }
                                            }}
                                        />
                                        <button 
                                            id="add-plan-btn"
                                            onClick={() => {
                                                const codeEl = document.getElementById('new-plan-code') as HTMLInputElement;
                                                const nameEl = document.getElementById('new-plan-name') as HTMLInputElement;
                                                const code = codeEl.value.trim().toUpperCase();
                                                const name = nameEl.value.trim();
                                                if (code && name && !mealPlans.some(p => p.code === code)) {
                                                    setMealPlans([...mealPlans, { code, name }]);
                                                    codeEl.value = '';
                                                    nameEl.value = '';
                                                }
                                            }}
                                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Booking Sources Section */}
                            <div className="md:col-span-2 mt-4 pt-8 border-t border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-purple-500 rounded-full"></div>
                                    Booking Sources (OTAs)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {bookingSources.map((src, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-lg">
                                            <span className="font-medium text-slate-700">{src}</span>
                                            <button 
                                                onClick={() => setBookingSources(bookingSources.filter((_, i) => i !== idx))}
                                                className="text-slate-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-4 max-w-md">
                                    <input 
                                        type="text" 
                                        id="new-source"
                                        placeholder="Add new source (e.g. Cleartrip)..." 
                                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = (e.target as HTMLInputElement).value.trim();
                                                if (val && !bookingSources.includes(val)) {
                                                    setBookingSources([...bookingSources, val]);
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <button 
                                        onClick={() => {
                                            const el = document.getElementById('new-source') as HTMLInputElement;
                                            const val = el.value.trim();
                                            if (val && !bookingSources.includes(val)) {
                                                setBookingSources([...bookingSources, val]);
                                                el.value = '';
                                            }
                                        }}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex-shrink-0"
                                    >
                                        Add Source
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
