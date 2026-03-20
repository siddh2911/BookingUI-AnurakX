import React, { useState } from 'react';
import { Menu, X, Bell, Search, Sun, Moon } from 'lucide-react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { User } from '../types';
import { MOCK_USER } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../hooks/useTheme';

interface DashboardLayoutProps {
    onLogout: () => void;
}

export default function DashboardLayout({ onLogout }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentUser] = useState<User>(MOCK_USER);
    const { language, setLanguage, t } = useLanguage();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 relative overflow-hidden transition-colors duration-1000">
            {/* Environmental Background */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className={`absolute -top-[10%] -right-[10%] w-[80vw] h-[80vw] rounded-full blur-[120px] transition-all duration-3000 ease-in-out ${theme === 'day' ? 'bg-orange-100/30 opacity-100 shadow-[0_0_100px_rgba(251,146,60,0.1)]' : 'bg-blue-900/20 opacity-40 translate-y-20'}`} />
                <div className={`absolute top-[30%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-[100px] transition-all duration-3000 ease-in-out ${theme === 'day' ? 'bg-blue-100/20 opacity-100 shadow-[0_0_100px_rgba(59,130,246,0.05)]' : 'bg-indigo-900/20 opacity-50 -translate-y-10'}`} />
                <div className={`absolute -bottom-[10%] right-[20%] w-[40vw] h-[40vw] rounded-full blur-[90px] transition-all duration-3000 ease-in-out ${theme === 'day' ? 'bg-purple-50/30 opacity-80' : 'bg-purple-900/10 opacity-30'}`} />
            </div>

            { }
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

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 bg-white/40 backdrop-blur-3xl transition-colors duration-1000">
                { }
                <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white shadow-md z-20">
                    <Link to="/" className="flex flex-col items-start">
                        <span className="font-bold text-lg text-white tracking-widest leading-none" style={{ fontFamily: '"Playfair Display", serif' }}>KARUNA VILLA</span>
                        <span className="text-[9px] text-blue-200/80 uppercase tracking-widest font-sans mt-0.5 ml-0.5">Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                            className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                            {language === 'en' ? 'HI' : 'EN'}
                        </button>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                { }
                <header className="hidden md:flex items-center justify-between h-20 px-8 bg-white/40 backdrop-blur-2xl border-b border-white/20 z-10 transition-colors duration-1000">
                    <div className="flex items-center gap-3 ml-12 text-slate-500 bg-white/50 backdrop-blur-md border border-slate-200 px-4 py-2.5 rounded-full w-96 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:bg-white/70 focus-within:border-blue-400/50 transition-all duration-300">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            className="bg-transparent border-none outline-none text-sm w-full text-slate-900 placeholder:text-slate-400 font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                            title={theme === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
                        >
                            {theme === 'day' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
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
