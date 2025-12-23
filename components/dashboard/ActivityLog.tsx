import React from 'react';
import { AuditLog } from '../../types';
import { Activity } from 'lucide-react';

interface ActivityLogProps {
  logs: AuditLog[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
          <Activity size={18} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
          <p className="text-xs text-slate-400">System audit trail</p>
        </div>
      </div>

      <div className="space-y-6 relative flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Vertical line for timeline */}
        {logs.length > 0 && <div className="absolute left-2.5 top-2 bottom-0 w-px bg-slate-100"></div>}

        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <p className="text-sm">No recent activity.</p>
          </div>
        ) :
          logs.slice(0, 8).map((log, idx) => (
            <div key={log.id} className="flex gap-4 relative z-10">
              <div className={`
                    w-5 h-5 mt-0.5 rounded-full border-2 
                    flex items-center justify-center flex-shrink-0 bg-white
                    ${idx === 0 ? 'border-purple-500 shadow-[0_0_0_3px_rgba(168,85,247,0.1)]' : 'border-slate-200'}
                `}>
                <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-purple-500' : 'bg-slate-300'}`}></div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{log.action}</p>
                <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{log.details}</p>
                <p className="text-slate-400 text-[10px] mt-1.5 font-medium bg-slate-50 inline-block px-1.5 py-0.5 rounded">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
};

export default ActivityLog;
