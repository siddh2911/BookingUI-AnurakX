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
                <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-500 shadow-sm relative overflow-hidden group ${
                    marketingStatus === 'scheduled' || marketingStatus === 'published' 
                        ? (night ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50/80 border-emerald-100/50') :
                    marketingStatus === 'rejected' 
                        ? (night ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50/80 border-red-100/50') :
                    (night ? 'bg-slate-900 border-slate-800' : 'bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border-purple-100/50')
                }`}>
                    <div className="flex items-center gap-4 w-full sm:w-auto mb-3 sm:mb-0">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full shadow-inner ${
                            marketingStatus === 'scheduled' || marketingStatus === 'published' ? (night ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600') :
                            marketingStatus === 'rejected' ? (night ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600') :
                            (night ? 'bg-blue-500/20 text-blue-400' : 'bg-white text-purple-600 animate-pulse shadow-purple-500/10')
                        }`}>
                            {marketingStatus === 'scheduled' || marketingStatus === 'published' ? <CheckCircle size={20} /> :
                             marketingStatus === 'rejected' ? <XCircle size={20} /> :
                             <Sparkles size={20} />}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-sm font-bold flex items-center gap-2 ${night ? 'text-white' : 'text-slate-800'}`}>
                                AI Marketing Assistant
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                    marketingStatus === 'scheduled' || marketingStatus === 'published' ? (night ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-200/50 text-emerald-700') :
                                    marketingStatus === 'rejected' ? (night ? 'bg-red-500/20 text-red-400' : 'bg-red-200/50 text-red-700') :
                                    (night ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-200/50 text-purple-700')
                                }`}>
                                    {marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'Scheduled' :
                                     marketingStatus === 'rejected' ? 'Needs Attention' :
                                     'Action Required'}
                                </span>
                            </span>
                            <span className={`text-xs mt-0.5 font-medium ${night ? 'text-slate-400' : 'text-slate-500'}`}>
                                {marketingStatus === 'scheduled' || marketingStatus === 'published' ? "Today's Instagram post is ready to go." :
                                 marketingStatus === 'rejected' ? "You discarded the draft. Generate a new one?" :
                                 "Your daily Instagram post has been drafted and is awaiting your approval."}
                            </span>
                        </div>
                    </div>
                    <Link 
                        to="/marketing" 
                        className={`w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                            marketingStatus === 'scheduled' || marketingStatus === 'published' 
                                ? (night ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:bg-slate-700' : 'bg-white text-emerald-700 hover:bg-emerald-50 hover:shadow border border-emerald-100') :
                            marketingStatus === 'rejected'
                                ? (night ? 'bg-slate-800 text-red-400 border border-red-500/30 hover:bg-slate-700' : 'bg-white text-red-700 hover:bg-red-50 hover:shadow border border-red-100') :
                            (night ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md')
                        }`}
                    >
                        {marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'View Schedule' : 'Review Post'} <ArrowRight size={14} />
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
