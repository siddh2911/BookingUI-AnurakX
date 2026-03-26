import React from 'react';
import { Room, HousekeepingTask, HousekeepingStatus, Booking, BookingStatus } from '../../types';
import { Sparkles, Droplets, CheckCircle, Clock } from 'lucide-react';

interface HousekeepingGridProps {
    rooms: Room[];
    tasks: HousekeepingTask[];
    bookings: Booking[];
    onUpdateTask: (task: HousekeepingTask) => void;
}

const statusConfig: Record<HousekeepingStatus, { icon: React.ElementType, color: string, bg: string, border: string }> = {
    'Clean': { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    'Dirty': { icon: Droplets, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
    'Cleaning in Progress': { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    'Inspected': { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
};

export default function HousekeepingGrid({ rooms, tasks, bookings, onUpdateTask }: HousekeepingGridProps) {

    const getTaskForRoom = (roomId: number) => {
        return tasks.find(t => t.roomId === roomId);
    };

    const cycleStatus = (task: HousekeepingTask | undefined, roomId: number) => {
        if (!task) {
            // Default new task to Dirty if none exists
            onUpdateTask({ id: `hk_new_${Date.now()}`, roomId, status: 'Dirty', priority: 'Normal' });
            return;
        }

        const flow: Record<HousekeepingStatus, HousekeepingStatus> = {
            'Dirty': 'Cleaning in Progress',
            'Cleaning in Progress': 'Clean',
            'Clean': 'Inspected',
            'Inspected': 'Dirty' // Cycle back as needed
        };

        onUpdateTask({ ...task, status: flow[task.status] });
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map(room => {
                const task = getTaskForRoom(room.id);
                const status = task?.status || 'Clean'; // Fallback to Clean if no active task
                const config = statusConfig[status];
                const Icon = config.icon;

                // Priority Logic Based on Upcoming Bookings
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const upcoming = bookings.filter(b => b.roomId === room.id && new Date(b.checkInDate) >= today && b.status !== BookingStatus.CANCELLED);
                upcoming.sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());

                let displayPriority = task?.priority || 'Low';
                let priorityLabel = 'High Priority';
                if (upcoming.length > 0) {
                    const nextCheckIn = new Date(upcoming[0].checkInDate);
                    nextCheckIn.setHours(0, 0, 0, 0);
                    const daysUntil = (nextCheckIn.getTime() - today.getTime()) / 86400000;

                    if (daysUntil === 0) {
                        displayPriority = 'High';
                        priorityLabel = 'Check-in Today';
                    }
                    else if (daysUntil === 1 && displayPriority !== 'High') {
                        displayPriority = 'Normal';
                    }
                }

                return (
                    <div
                        key={room.id}
                        className={`bg-white/70 backdrop-blur-xl border-2 ${config.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: '"Playfair Display", serif' }}>
                                    {room.number}
                                </span>
                                <p className="text-xs text-slate-500 mt-0.5">{room.type}</p>
                            </div>
                            <div className={`p-2 rounded-xl ${config.bg} ${config.color}`}>
                                <Icon size={20} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-2">
                            <button
                                onClick={() => cycleStatus(task, room.id)}
                                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${config.bg} ${config.color} hover:brightness-95`}
                            >
                                {status}
                            </button>
                        </div>

                        {task?.assignedTo && (
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>Assigned: <strong className="text-slate-700">{task.assignedTo}</strong></span>
                            </div>
                        )}
                        {displayPriority === 'High' && (
                            <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-1 rounded-md inline-block shadow-sm border border-rose-100/50">
                                {priorityLabel}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
