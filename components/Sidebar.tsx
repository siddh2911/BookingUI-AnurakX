import React, { useState } from 'react';
import { LayoutDashboard, CalendarDays, BedDouble, Users, CreditCard, Calendar, ChevronLeft, ChevronRight, LogOut, Utensils, Globe } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  currentUser: User;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onLogout: () => void;
  onDashboardClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUser, isSidebarOpen, setIsSidebarOpen, onLogout, onDashboardClick }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLanguage();

  const links = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: t('dashboard'), exact: true },
    { to: '/calendar', icon: <Calendar size={20} />, label: t('calendar') },
    { to: '/bookings', icon: <CalendarDays size={20} />, label: t('bookings') },
    { to: '/dining', icon: <Utensils size={20} />, label: t('dining') },
    { to: '/rooms', icon: <BedDouble size={20} />, label: t('rooms') },
    { to: '/guests', icon: <Users size={20} />, label: t('guests') },
    { to: '/finance', icon: <CreditCard size={20} />, label: t('finance') },
    { to: '/channels', icon: <Globe size={20} />, label: 'Channels' },
  ];

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-30 flex flex-col bg-white/70 backdrop-blur-3xl border-r border-slate-200 text-slate-800 transition-all duration-300 ease-in-out shadow-2xl
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:relative md:translate-x-0 
        ${collapsed ? "md:w-20" : "md:w-64"}
      `}
    >
      { }
      <div className="h-24 flex flex-col justify-center px-4 border-b border-slate-200 relative">
        {!collapsed && (
          <div className="flex items-center justify-center w-full px-2 py-2">
            <Link to="/" className="flex flex-col items-center hover:opacity-90 transition-opacity gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-widest leading-none text-center" style={{ fontFamily: '"Playfair Display", serif' }}>
                KARUNA VILLA
              </h1>
              <p className="text-[10px] text-blue-600 uppercase tracking-[0.3em] font-medium border-t border-blue-500/30 pt-1.5 px-2">
                Dashboard
              </p>

            </Link>
          </div>
        )}
        {collapsed && (
          <div className="flex items-center justify-center w-full h-full">
            <Link to="/" className="text-xl font-bold text-slate-900 hover:text-blue-500 transition-colors" style={{ fontFamily: '"Playfair Display", serif' }}>KV</Link>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition transform translate-x-10 absolute right-0 border border-slate-200 shadow-lg z-50"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      { }
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.exact}
            className="block mb-1 focus:outline-none"
            onClick={link.to === '/' ? onDashboardClick : undefined}
          >
            {({ isActive }) => (
              <div className={`
                flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative
                ${isActive
                  ? 'bg-blue-600/10 text-blue-600 shadow-sm border border-blue-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }
                ${collapsed ? 'justify-center mx-1' : 'mx-2'}
              `}>
                <div className={`relative z-10 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'scale-110 text-blue-600' : ''}`}>
                  {link.icon}
                </div>
                {!collapsed && (
                  <span className={`font-semibold whitespace-nowrap tracking-tight transition-colors duration-300 ${isActive ? 'text-blue-700' : ''}`}>
                    {link.label}
                  </span>
                )}

                {/* Active Indicator Line */}
                <div className={`absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'} ${collapsed ? 'hidden' : ''}`} />

                {collapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-2xl border border-slate-700 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap z-50 pointer-events-none">
                    {link.label}
                  </div>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      { }
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className={`flex items-center w-full ${collapsed ? 'justify-center flex-col gap-4' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md ring-2 ring-white shrink-0 text-sm">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>

          {!collapsed && (
            <>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-[13px] font-bold text-slate-800 truncate tracking-tight" title={currentUser.name}>
                  {currentUser.name}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest truncate mt-0.5">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                title="Sign Out"
              >
                <LogOut size={18} strokeWidth={2.5} />
              </button>
            </>
          )}

          {collapsed && (
            <button
              onClick={onLogout}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors border border-slate-200 bg-white shadow-sm shrink-0"
              title="Sign Out"
            >
              <LogOut size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
