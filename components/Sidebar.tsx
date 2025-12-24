import React, { useState } from 'react';
import { LayoutDashboard, CalendarDays, BedDouble, Users, CreditCard, Calendar, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  currentUser: User;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUser, isSidebarOpen, setIsSidebarOpen, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLanguage();

  const links = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: t('dashboard'), exact: true },
    { to: '/calendar', icon: <Calendar size={20} />, label: t('calendar') },
    { to: '/bookings', icon: <CalendarDays size={20} />, label: t('bookings') },
    { to: '/rooms', icon: <BedDouble size={20} />, label: t('rooms') },
    { to: '/guests', icon: <Users size={20} />, label: t('guests') },
    { to: '/finance', icon: <CreditCard size={20} />, label: t('finance') },
  ];

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out shadow-xl
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:relative md:translate-x-0 
        ${collapsed ? "md:w-20" : "md:w-64"}
      `}
    >
      {/* Header */}
      <div className="h-24 flex items-center justify-between px-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center justify-center w-full px-2 py-2">
            <Link to="/" className="flex flex-col items-center hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold text-white tracking-widest leading-tight text-center" style={{ fontFamily: '"Playfair Display", serif' }}>
                KARUNA VILLA
              </h1>
              <div className="h-0.5 w-8 bg-blue-500/50 my-1 rounded-full"></div>
              <p className="text-[10px] text-blue-200 uppercase tracking-[0.3em] font-sans font-medium">
                Admin Dashboard
              </p>
            </Link>
          </div>
        )}
        {collapsed && (
          <div className="flex items-center justify-center w-full h-full">
            <Link to="/" className="text-xl font-bold text-white hover:text-blue-400 transition-colors" style={{ fontFamily: '"Playfair Display", serif' }}>KV</Link>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition transform translate-x-10 absolute right-0 border border-slate-700 shadow-lg z-50"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.exact}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
              ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <div className="relative z-10">{link.icon}</div>
            {!collapsed && <span className="font-medium whitespace-nowrap">{link.label}</span>}

            {/* Tooltip for collapsed state */}
            {collapsed && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none">
                {link.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className={`flex items-center ${collapsed ? 'justify-center flex-col gap-4' : 'justify-between px-2'}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold shadow-lg ring-2 ring-slate-800 shrink-0">
              {currentUser.name[0]}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-400 truncate">{currentUser.role}</p>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className={`text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors ${collapsed ? 'p-2' : 'p-2'}`}
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
