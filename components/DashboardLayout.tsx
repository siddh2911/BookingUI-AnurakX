import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Bell, Search, Sun, Moon, AlertTriangle, Mic } from 'lucide-react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { User, Room } from '../types';
import { MOCK_USER } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../hooks/useTheme';

interface DashboardLayoutProps {
    onLogout: () => void;
    onDashboardClick?: () => void;
    onVoiceBooking?: (transcript: string) => void;
    rooms?: Room[];
    currentUser: User;
}

export default function DashboardLayout({ onLogout, onDashboardClick, onVoiceBooking, rooms, currentUser }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');
    const recognitionRef = useRef<any>(null);
    const { language, setLanguage, t } = useLanguage();
    const { theme, toggleTheme } = useTheme();

    const toggleListening = () => {
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            return; // onend handles the submission
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice booking is currently only supported in Chrome or Edge browsers.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        let finalSentence = '';

        recognition.onstart = () => {
            setIsListening(true);
            setLiveTranscript('');
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalSentence += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setLiveTranscript(finalSentence + interimTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            setLiveTranscript('');
            recognitionRef.current = null;
        };

        recognition.onend = () => {
            setIsListening(false);
            if (finalSentence || liveTranscript) {
                const textToProcess = finalSentence || liveTranscript;
                console.log("Recorded Voice (Final):", textToProcess);
                if (onVoiceBooking && textToProcess.trim().length > 0) {
                    onVoiceBooking(textToProcess);
                }
            }
            setLiveTranscript('');
            recognitionRef.current = null;
        };

        recognition.start();
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 relative overflow-hidden transition-colors duration-1000">
            {/* Environmental Background */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className={`absolute -top-[10%] -right-[10%] w-[80vw] h-[80vw] rounded-full blur-[120px] transition-all duration-3000 ease-in-out ${theme === 'day' ? 'bg-orange-100/30 opacity-100 shadow-[0_0_100px_rgba(251,146,60,0.1)]' : 'bg-violet-500/8 opacity-60 translate-y-20'}`} />
                <div className={`absolute top-[30%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-[100px] transition-all duration-3000 ease-in-out ${theme === 'day' ? 'bg-blue-100/20 opacity-100 shadow-[0_0_100px_rgba(59,130,246,0.05)]' : 'bg-blue-500/6 opacity-50 -translate-y-10'}`} />
                <div className={`absolute -bottom-[10%] right-[20%] w-[40vw] h-[40vw] rounded-full blur-[90px] transition-all duration-3000 ease-in-out ${theme === 'day' ? 'bg-purple-50/30 opacity-80' : 'bg-emerald-500/5 opacity-40'}`} />
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
                onDashboardClick={onDashboardClick}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 bg-white/40 backdrop-blur-3xl transition-colors duration-1000">
                { }
                <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white shadow-md z-20">
                    <Link to="/" onClick={onDashboardClick} className="flex flex-col items-start">
                        <span className="font-bold text-lg text-white tracking-widest leading-none" style={{ fontFamily: '"Playfair Display", serif' }}>KARUNA VILLA</span>
                        <span className="text-[9px] text-blue-200/80 uppercase tracking-widest font-sans mt-0.5 ml-0.5">Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-800 transition-colors"
                            title={theme === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
                        >
                            {theme === 'day' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                            className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                            {language === 'en' ? 'HI' : 'EN'}
                        </button>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white hover:text-blue-400 transition-colors">
                            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
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
                            onClick={toggleListening}
                            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${isListening ? 'bg-red-50 border-red-200 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                            title={isListening ? "Listening... Click to Stop" : "Voice Booking"}
                        >
                            <Mic size={18} />
                        </button>
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

                {/* --- Live Subtitles Overlay --- */}
                {isListening && (
                    <div className="absolute top-20 left-0 right-0 z-50 flex justify-center mt-4">
                        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 max-w-2xl w-[90%] animate-in slide-in-from-top-4 fade-in duration-300">
                            <div className="flex shrink-0 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Live Transcription</p>
                                <p className="text-sm font-medium truncate">
                                    {liveTranscript || <span className="text-slate-500 italic">Listening to your voice...</span>}
                                </p>
                            </div>
                            <button
                                onClick={toggleListening}
                                className="shrink-0 text-xs font-bold bg-white text-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
                            >
                                Stop & Parse
                            </button>
                        </div>
                    </div>
                )}


                {rooms && rooms.filter(r => r.cleanStatus === 'DIRTY').length > 0 && (
                    <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-600 px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2 z-20 shadow-sm animate-pulse m-2 md:mx-8 md:mt-4 rounded-xl">
                        <AlertTriangle size={18} className="text-red-500" />
                        <span>Attention: Room {rooms.filter(r => r.cleanStatus === 'DIRTY').map(r => r.number).join(', ')} is Uncleared and requires housekeeping!</span>
                    </div>
                )}

                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
