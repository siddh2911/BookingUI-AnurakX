import React, { useState } from 'react';
import { Menu, X, Bell, Search } from 'lucide-react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { User } from '../types';
import { MOCK_USER } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardLayoutProps {
    onLogout: () => void;
}

export default function DashboardLayout({ onLogout }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentUser] = useState<User>(MOCK_USER);
    const { language, setLanguage, t } = useLanguage();

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar
                currentUser={currentUser}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                onLogout={onLogout}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white shadow-md z-20">
                    <Link to="/" className="flex flex-col">
                        <span className="font-bold text-lg text-white tracking-widest leading-tight" style={{ fontFamily: '"Playfair Display", serif' }}>KARUNA VILLA</span>
                        <span className="text-[9px] text-blue-200 uppercase tracking-widest font-sans">Dashboard</span>
                    </Link>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Desktop Topbar (Optional, can be added for search/notifications) */}
                <header className="hidden md:flex items-center justify-between h-20 px-8 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
                    <div className="flex items-center gap-3 ml-12 text-slate-400 bg-white border border-slate-200 px-4 py-2.5 rounded-full w-96 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all duration-200">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            {language === 'en' ? 'HI' : 'EN'}
                        </button>
                        <button className="p-2 relative text-slate-400 hover:text-blue-500 transition">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
