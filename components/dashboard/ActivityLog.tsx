import React from 'react';
import { AuditLog } from '../../types';

interface ActivityLogProps {
  logs: AuditLog[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {logs.length === 0 ? <p className="text-slate-500 text-sm">No recent activity.</p> :
            logs.slice(0, 5).map(log => (
              <div key={log.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-slate-800">{log.action}</p>
                  <p className="text-slate-500 text-xs">{log.details}</p>
                  <p className="text-slate-400 text-[10px] mt-1">{new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          }
        </div>
    </div>
  );
};

export default ActivityLog;
