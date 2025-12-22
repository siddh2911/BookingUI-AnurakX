import React from 'react';
import { LayoutDashboard, CalendarDays } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: 'dashboard' | 'bookings';
  setActiveTab: (tab: 'dashboard' | 'bookings') => void;
  setBookingFilter: (filter: any) => void;
  currentUser: User;
  isSidebarOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, setBookingFilter, currentUser, isSidebarOpen }) => {
  return (
    <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 w-64 bg-slate-900 text-white flex flex-col`}>
      <div className="p-6 text-2xl font-bold flex items-center gap-2 text-blue-400">
        Karuna Villa
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <button 
          onClick={() => { setActiveTab('dashboard'); setBookingFilter(null); }} 
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
        >
          <LayoutDashboard size={20} /> Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('bookings')} 
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'bookings' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
        >
          <CalendarDays size={20} /> Booking List
        </button>
      </nav>
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">
            {currentUser.name[0]}
          </div>
          <div>
            <p className="text-sm font-semibold">{currentUser.name}</p>
            <p className="text-xs text-slate-400">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
