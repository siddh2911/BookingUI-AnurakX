import React, { useState, useEffect } from 'react';
import Dashboard from '../dashboard/Dashboard';
import { useLanguage } from '../../contexts/LanguageContext';
import { Sparkles, ArrowRight, Instagram, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

export default function DashboardPage({ dashboardProps }: { dashboardProps: any }) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const night = theme === 'night';
    const [marketingStatus, setMarketingStatus] = useState<string>('none');

    useEffect(() => {
        if (!dashboardProps.isAdmin) return;
        
        const savedDate = localStorage.getItem('karuna_daily_post_date');
        const savedStatus = localStorage.getItem('karuna_daily_post_status') || 'pending';
        const today = new Date().toDateString();

        if (savedDate !== today) {
            setMarketingStatus('missing');
        } else {
            setMarketingStatus(savedStatus);
        }
    }, [dashboardProps.isAdmin]);

    return (
        <div className="flex flex-col gap-6">
            {dashboardProps.isAdmin && marketingStatus !== 'none' && (
                <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-700 relative overflow-hidden group ${
                    marketingStatus === 'scheduled' || marketingStatus === 'published' 
                        ? (night ? 'bg-emerald-950/60 border-emerald-800/60 shadow-lg shadow-emerald-950/30' : 'bg-emerald-50/80 border-emerald-100 shadow-sm') :
                    marketingStatus === 'rejected' 
                        ? (night ? 'bg-red-950/60 border-red-800/60 shadow-lg shadow-red-950/30' : 'bg-red-50/80 border-red-100 shadow-sm') :
                    (night ? 'bg-slate-900 border-slate-800 shadow-lg' : 'bg-white border-blue-100 shadow-[0_10px_40px_-10px_rgba(59,130,246,0.1)]')
                }`}>
                    {/* Background Decorative Blur */}
                    <div className={`absolute top-0 right-0 w-64 h-64 blur-3xl opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 ${night ? 'bg-blue-400' : 'bg-blue-600'}`}></div>
                    
                    <div className="flex items-center gap-6 w-full md:w-auto relative z-10">
                        <div className={`flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg transition-transform duration-500 group-hover:scale-110 ${
                            marketingStatus === 'scheduled' || marketingStatus === 'published' ? (night ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-emerald-600 text-white') :
                            marketingStatus === 'rejected' ? (night ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30' : 'bg-red-600 text-white') :
                            (night ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-blue-600 text-white shadow-blue-500/20 animate-pulse')
                        }`}>
                            {marketingStatus === 'scheduled' || marketingStatus === 'published' ? <CheckCircle size={28} /> :
                             marketingStatus === 'rejected' ? <XCircle size={28} /> :
                             <Sparkles size={28} />}
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className={`text-xl font-black tracking-tight ${night ? 'text-white' : 'text-slate-900'}`}>
                                    AI Marketing Assistant
                                </h3>
                                <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ${
                                    marketingStatus === 'scheduled' || marketingStatus === 'published' ? (night ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-emerald-100 text-emerald-700') :
                                    marketingStatus === 'rejected' ? (night ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30' : 'bg-red-100 text-red-700') :
                                    (night ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-blue-600 text-white')
                                }`}>
                                    {marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'Scheduled' :
                                     marketingStatus === 'rejected' ? 'Needs Attention' :
                                     'Action Required'}
                                </span>
                            </div>
                            <p className={`text-sm font-medium leading-relaxed ${night ? 'text-slate-400' : 'text-slate-500'}`}>
                                {marketingStatus === 'scheduled' || marketingStatus === 'published' ? "Today's Instagram post is ready to go." :
                                 marketingStatus === 'rejected' ? "You discarded the draft. Generate a new one?" :
                                 "Your daily Instagram post has been drafted and is awaiting your approval."}
                            </p>
                        </div>
                    </div>
                    <Link 
                        to="/marketing" 
                        className={`relative z-10 w-full md:w-auto px-8 py-3.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-3 active:scale-95 ${
                            marketingStatus === 'scheduled' || marketingStatus === 'published' 
                                ? (night ? 'bg-slate-800 text-emerald-400 border border-slate-700 hover:bg-slate-700' : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-100 shadow-sm') :
                            marketingStatus === 'rejected'
                                ? (night ? 'bg-slate-800 text-red-400 border border-slate-700 hover:bg-slate-700' : 'bg-white text-red-700 hover:bg-red-50 border border-red-100 shadow-sm') :
                            (night ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30' : 'bg-slate-950 text-white hover:bg-slate-800 shadow-xl')
                        }`}
                    >
                        {marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'View Schedule' : 'Review Post'} <ArrowRight size={18} />
                    </Link>
                </div>
            )}

            <div className="mb-6">
                <h1 className={`text-3xl font-bold ${night ? 'text-white' : 'text-slate-900'}`}>{t('dashboard')}</h1>
                <p className={`${night ? 'text-slate-400' : 'text-slate-500'}`}>{t('welcomeBack')}</p>
            </div>

            <Dashboard {...dashboardProps} />
        </div>
    );
}
