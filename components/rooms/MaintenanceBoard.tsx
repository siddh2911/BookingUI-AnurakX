import React, { useState } from 'react';
import { Room, MaintenanceTicket, MaintenanceStatus, MaintenanceCategory, MaintenanceSeverity } from '../../types';
import { Wrench, Zap, Monitor, Sofa, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';

interface MaintenanceBoardProps {
    rooms: Room[];
    tickets: MaintenanceTicket[];
    onUpdateTicket: (ticket: MaintenanceTicket) => void;
    onDeleteTicket?: (ticketId: string) => void;
}

const categoryIcons = {
    'Plumbing': DropletsIcon,
    'Electrical': Zap,
    'Appliance': Monitor,
    'Furniture': Sofa,
    'Other': MoreHorizontal
};

function DropletsIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7 2.9 7 2.9s-2.29 6.16-2.29 6.16C3.57 10 3 11.1 3 12.26c0 2.22 1.8 4.04 4 4.04z" />
            <path d="M14 11c0-1.55 1.25-2.8 2.8-2.8s2.8 1.25 2.8 2.8-1.25 2.8-2.8 2.8S14 12.55 14 11z" />
        </svg>
    );
}

export default function MaintenanceBoard({ rooms, tickets, onUpdateTicket, onDeleteTicket }: MaintenanceBoardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const columns: MaintenanceStatus[] = ['Open', 'In Progress', 'Resolved'];

    const handleReportIssue = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newTicket: MaintenanceTicket = {
            id: `mt_${Date.now()}`,
            roomNumber: formData.get('roomNumber') as string,
            category: formData.get('category') as MaintenanceCategory,
            severity: formData.get('severity') as MaintenanceSeverity,
            description: formData.get('description') as string,
            status: 'Open',
            reportedAt: new Date().toISOString()
        };
        onUpdateTicket(newTicket);
        setIsModalOpen(false);
    };

    const handleDragStart = (e: React.DragEvent, ticketId: string) => {
        e.dataTransfer.setData('ticketId', ticketId);
    };

    const handleDrop = (e: React.DragEvent, status: MaintenanceStatus) => {
        e.preventDefault();
        const ticketId = e.dataTransfer.getData('ticketId');
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket && ticket.status !== status) {
            onUpdateTicket({
                ...ticket,
                status,
                resolvedAt: status === 'Resolved' ? new Date().toISOString() : ticket.resolvedAt
            });
        }
    };

    const severityColors = {
        'Low': 'bg-slate-100 text-slate-600',
        'Medium': 'bg-amber-100 text-amber-700',
        'Critical': 'bg-rose-100 text-rose-700'
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-sm"
                >
                    <Plus size={16} /> Report Issue
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {columns.map(status => {
                    const columnTickets = tickets.filter(t => t.status === status);

                    return (
                        <div
                            key={status}
                            className="flex-1 w-full bg-slate-50/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 min-h-[500px]"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, status)}
                        >
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h3 className="font-bold text-slate-700">{status}</h3>
                                <span className="bg-white px-2.5 py-1 rounded-full text-xs font-semibold text-slate-500 shadow-sm border border-slate-100">
                                    {columnTickets.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {columnTickets.map(ticket => {
                                    const room = rooms.find(r => r.number === ticket.roomNumber);
                                    const Icon = categoryIcons[ticket.category] || Wrench;

                                    return (
                                        <div
                                            key={ticket.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, ticket.id)}
                                            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 cursor-grab active:cursor-grabbing group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500">
                                                        <Icon size={16} />
                                                    </div>
                                                    <span className="font-bold text-slate-900" style={{ fontFamily: '"Playfair Display", serif' }}>
                                                        Room {room?.number || ticket.roomNumber}
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${severityColors[ticket.severity]}`}>
                                                    {ticket.severity}
                                                </span>
                                                {onDeleteTicket && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDeleteTicket(ticket.id); }}
                                                        className="text-slate-300 hover:text-red-500 transition-colors ml-2"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                                                {ticket.description}
                                            </p>

                                            <div className="flex justify-between items-center text-xs text-slate-400">
                                                <span>{new Date(ticket.reportedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Drag to move
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {columnTickets.length === 0 && (
                                    <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                                        No {status.toLowerCase()} tickets
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Report Maintenance Issue" maxWidth="max-w-lg">
                <form onSubmit={handleReportIssue} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Room</label>
                        <select name="roomNumber" required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors">
                            <option value="">Select Room...</option>
                            {rooms.map(r => (
                                <option key={r.id} value={r.number}>Room {r.number}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Category</label>
                            <select name="category" required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors">
                                <option value="Plumbing">Plumbing</option>
                                <option value="Electrical">Electrical</option>
                                <option value="Appliance">Appliance/AC</option>
                                <option value="Furniture">Furniture</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Severity</label>
                            <select name="severity" required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors">
                                <option value="Low">Low (Cosmetic)</option>
                                <option value="Medium">Medium (Functional)</option>
                                <option value="Critical">Critical (Urgent)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Description</label>
                        <textarea
                            name="description"
                            required
                            rows={3}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors resize-none mb-4"
                            placeholder="Describe the issue..."
                        ></textarea>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/30">
                        Submit Ticket
                    </button>
                </form>
            </Modal>
        </div>
    );
}
