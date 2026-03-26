import React, { useState } from 'react';
import { Room, HousekeepingTask, MaintenanceTicket, Booking } from '../../types';
import HousekeepingGrid from '../rooms/HousekeepingGrid';
import MaintenanceBoard from '../rooms/MaintenanceBoard';

export default function RoomsPage({
    rooms, bookings, housekeepingTasks, setHousekeepingTasks, maintenanceTickets, setMaintenanceTickets
}: {
    rooms: Room[]; bookings: Booking[]; housekeepingTasks: HousekeepingTask[]; setHousekeepingTasks: any; maintenanceTickets: MaintenanceTicket[]; setMaintenanceTickets: any;
}) {
    const [activeTab, setActiveTab] = useState<'housekeeping' | 'maintenance'>('housekeeping');

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
                            const roomNum = rooms.find(r => r.id === updatedTask.roomId)?.number;
                            if (roomNum) {
                                import('../../services/api').then(api => {
                                    const cStatus = updatedTask.status.toUpperCase() as 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'MAINTENANCE';
                                    api.updateRoomCleanStatus(roomNum, cStatus).catch(console.error);
                                });
                            }
                        }}
                    />
                ) : (
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
                                const { createMaintenanceTicket, updateMaintenanceTicketStatus } = await import('../../services/api');
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
                                const { deleteMaintenanceTicket } = await import('../../services/api');
                                await deleteMaintenanceTicket(ticketId);
                            } catch (e) { console.error(e); }
                        }}
                    />
                )}
            </div>
        </div>
    );
}
