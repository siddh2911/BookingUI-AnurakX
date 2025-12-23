import React from 'react';
import Dashboard from '../dashboard/Dashboard';

export default function DashboardPage({ dashboardProps }: { dashboardProps: any }) {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500">Welcome back, here's what's happening today.</p>
            </div>
            <Dashboard {...dashboardProps} />
        </div>
    );
}
