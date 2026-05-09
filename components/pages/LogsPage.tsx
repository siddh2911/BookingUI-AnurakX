import React, { useState } from 'react';
import { AuditLog } from '../../types';
import { Search, Filter, Clock, User, Info, FileText } from 'lucide-react';

interface LogsPageProps {
    logs: AuditLog[];
}

export default function LogsPage({ logs }: LogsPageProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState<string>('all');

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (log.user && log.user.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filterAction === 'all' || log.action === filterAction;
        return matchesSearch && matchesFilter;
    });

    const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: '"Playfair Display", serif' }}>System Logs</h1>
                    <p className="text-slate-500">Track all administrative actions and system events.</p>
                </div>
                
                <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-white/50 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search logs..." 
                            className="pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 text-sm font-medium w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-2 px-3">
                        <Filter size={16} className="text-slate-400" />
                        <select 
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-600 cursor-pointer pr-8"
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                        >
                            <option value="all">All Actions</option>
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-slate-300" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {new Date(log.timestamp).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {new Date(log.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block ${
                                                    log.severity === 'WARNING' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                    log.severity === 'CRITICAL' || log.action.includes('Delete') ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                    'bg-blue-50 text-blue-600 border border-blue-100'
                                                }`}>
                                                    {log.action}
                                                </span>
                                                {log.severity && (
                                                    <span className={`text-[8px] font-bold mt-1 ml-1 ${
                                                        log.severity === 'WARNING' ? 'text-amber-500' : 
                                                        log.severity === 'CRITICAL' ? 'text-rose-500' : 
                                                        'text-slate-400'
                                                    }`}>
                                                        {log.severity}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                    {(log.user || 'S').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">{log.user || 'System'}</span>
                                                    {log.ipAddress && <span className="text-[9px] text-slate-400 font-medium font-mono">{log.ipAddress}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2">
                                                <Info size={14} className="text-slate-300 mt-1 flex-shrink-0" />
                                                <p className="text-sm text-slate-600 leading-relaxed max-w-xl">{log.details}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <FileText size={48} className="text-slate-400" />
                                            <p className="text-lg font-bold text-slate-500 tracking-tight">No matching logs found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
