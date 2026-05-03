import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Bell, Search, Sun, Moon, AlertTriangle } from 'lucide-react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import VoiceAssistantDrawer from './VoiceAssistantDrawer';
import { User, Room } from '../types';
import { MOCK_USER } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../hooks/useTheme';

interface DashboardLayoutProps {
    onLogout: () => void;
    onDashboardClick?: () => void;
    onVoiceBooking?: (transcript: string) => Promise<string | undefined>;
    rooms?: Room[];
    currentUser: User;
    isAdmin?: boolean;
    isVerifying?: boolean;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  action?: { label: string; onClick: () => void };
}

export default function DashboardLayout({ onLogout, onDashboardClick, onVoiceBooking, rooms, currentUser, isAdmin = false, isVerifying }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [liveTranscript, setLiveTranscript] = useState('');
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const { language, setLanguage, t } = useLanguage();
    const { theme, toggleTheme } = useTheme();

    const resetSilenceTimer = () => {
        console.log("[DEBUG] resetSilenceTimer called");
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
            if (recognitionRef.current) {
                console.log("Silence detected (2s). Stopping...");
                recognitionRef.current.stop();
            }
        }, 2000);
    };

    const handleQuickQuery = async (query: string) => {
        setIsAssistantOpen(true);
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', text: query }]);
        if (onVoiceBooking) {
            setIsThinking(true);
            try {
                const response = await onVoiceBooking(query);
                if (response) {
                    setMessages(prev => [...prev, { id: Date.now().toString() + 'ai', type: 'ai', text: response }]);
                }
            } finally {
                setIsThinking(false);
            }
        }
    };

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
        
        recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
        recognition.continuous = false; // Auto-stop when user stops speaking
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        let finalSentence = '';

        recognition.onstart = () => {
            setIsListening(true);
            setLiveTranscript('');
            resetSilenceTimer();
        };

        recognition.onresult = (event: any) => {
            resetSilenceTimer();
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
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            setLiveTranscript('');
            recognitionRef.current = null;
        };

        recognition.onend = async () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            setIsListening(false);
            const textToProcess = finalSentence || liveTranscript;
            
            if (textToProcess.trim().length > 0) {
                console.log("Recorded Voice (Final):", textToProcess);
                setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', text: textToProcess }]);
                
                if (onVoiceBooking) {
                    setIsThinking(true);
                    try {
                        const response = await onVoiceBooking(textToProcess);
                        if (response) {
                            setMessages(prev => [...prev, { id: Date.now().toString() + 'ai', type: 'ai', text: response }]);
                        }
                    } catch (err) {
                        setMessages(prev => [...prev, { id: Date.now().toString() + 'ai', type: 'ai', text: "Sorry, I encountered an error." }]);
                    } finally {
                        setIsThinking(false);
                    }
                }
            }
            setLiveTranscript('');
            recognitionRef.current = null;
        };

        recognition.start();
    };

    // Listen for custom event to resume listening
    useEffect(() => {
        const handleResume = () => {
            if (!isListening) {
                toggleListening();
            }
        };
        window.addEventListener('resume-voice-assistant', handleResume);
        return () => window.removeEventListener('resume-voice-assistant', handleResume);
    }, [isListening, language, theme]); // Added dependencies to ensure closures are fresh


    return (
        <div className={`flex h-screen font-sans relative overflow-hidden transition-colors duration-300 ${theme === 'night' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
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
                isAdmin={isAdmin}
                isVerifying={isVerifying}
            />

            <div className={`flex-1 flex flex-col h-screen overflow-hidden relative z-10 transition-colors duration-300 ${theme === 'night' ? 'bg-slate-950/20 backdrop-blur-3xl' : 'bg-white/40 backdrop-blur-3xl'}`}>
                { }
                <div className={`md:hidden flex items-center justify-between p-4 shadow-md z-20 ${theme === 'night' ? 'bg-slate-950 text-white' : 'bg-slate-900 text-white'}`}>
                    <Link to="/" onClick={onDashboardClick} className="flex flex-col items-start">
                        <span className="font-bold text-lg text-white tracking-widest leading-none" style={{ fontFamily: '"Playfair Display", serif' }}>KARUNA VILLA</span>
                        <span className="text-[9px] text-blue-200/80 uppercase tracking-widest font-sans mt-0.5 ml-0.5">Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${theme === 'night' ? 'border-slate-800 text-slate-300 hover:bg-slate-900' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                            title={theme === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
                        >
                            {theme === 'day' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-colors ${theme === 'night' ? 'border-slate-800 text-slate-300 hover:bg-slate-900' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                        >
                            {language === 'en' ? 'HI' : 'EN'}
                        </button>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white hover:text-blue-400 transition-colors">
                            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                { }
                <header className={`hidden md:flex items-center justify-between h-20 px-8 backdrop-blur-2xl border-b z-10 transition-colors duration-300 ${theme === 'night' ? 'bg-slate-950/80 border-slate-800' : 'bg-white/40 border-white/20'}`}>
                    <div className={`flex items-center gap-3 ml-12 backdrop-blur-md border px-4 py-2.5 rounded-full w-96 shadow-sm transition-all duration-300 ${theme === 'night' ? 'bg-slate-900 border-slate-800 text-slate-300 focus-within:border-blue-500/50' : 'bg-white/50 border-slate-200 text-slate-500 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:bg-white/70 focus-within:border-blue-400/50'}`}>
                        <Search size={18} className={theme === 'night' ? 'text-slate-500' : 'text-slate-400'} />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            className={`bg-transparent border-none outline-none text-sm w-full font-medium ${theme === 'night' ? 'text-slate-200 placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button

                            onClick={toggleTheme}
                            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${theme === 'night' ? 'border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                            title={theme === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
                        >
                            {theme === 'day' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                            className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm font-bold transition-colors ${theme === 'night' ? 'border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                        >
                            {language === 'en' ? 'HI' : 'EN'}
                        </button>
                        <button className={`p-2 relative transition ${theme === 'night' ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-500'}`}>
                            <Bell size={20} />
                            <span className={`absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 ${theme === 'night' ? 'border-slate-950' : 'border-white'}`}></span>
                        </button>
                    </div>
                </header>

                <VoiceAssistantDrawer
                    isListening={isListening}
                    isThinking={isThinking}
                    isOpen={isAssistantOpen}
                    setIsOpen={setIsAssistantOpen}
                    onToggleListening={toggleListening}
                    messages={messages}
                    onQuickQuery={handleQuickQuery}
                    theme={theme}
                    liveTranscript={liveTranscript}
                />



                {rooms && rooms.filter(r => r.cleanStatus === 'DIRTY').length > 0 && (
                    <div className={`backdrop-blur-md border px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2 z-20 shadow-sm animate-pulse m-2 md:mx-8 md:mt-4 rounded-xl ${theme === 'night' ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
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
