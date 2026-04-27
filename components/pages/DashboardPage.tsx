import React, { useState, useEffect } from 'react';
import Dashboard from '../dashboard/Dashboard';
import { useLanguage } from '../../contexts/LanguageContext';
import { Sparkles, ArrowRight, Instagram, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage({ dashboardProps }: { dashboardProps: any }) {
    const { t } = useLanguage();
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
        <div className="animate-in fade-in duration-500">
            {dashboardProps.isAdmin && marketingStatus !== 'none' && (
                <div className={`mb-6 relative overflow-hidden rounded-2xl border backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between p-4 sm:px-6 shadow-sm transition-all duration-300 ${
                    marketingStatus === 'scheduled' || marketingStatus === 'published' 
                        ? 'bg-emerald-50/80 border-emerald-100/50 dark:bg-emerald-500/10 dark:border-emerald-500/20' :
                    marketingStatus === 'rejected' 
                        ? 'bg-red-50/80 border-red-100/50 dark:bg-red-500/10 dark:border-red-500/20' :
                    'bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border-purple-100/50 dark:from-purple-500/10 dark:to-indigo-500/10 dark:border-purple-500/20'
                }`}>
                    <div className="flex items-center gap-4 w-full sm:w-auto mb-3 sm:mb-0">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full shadow-inner ${
                            marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                            marketingStatus === 'rejected' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                            'bg-white text-purple-600 animate-pulse shadow-purple-500/10 dark:bg-slate-800 dark:text-purple-400 dark:shadow-purple-500/5'
                        }`}>
                            {marketingStatus === 'scheduled' || marketingStatus === 'published' ? <CheckCircle size={20} /> :
                             marketingStatus === 'rejected' ? <XCircle size={20} /> :
                             <Sparkles size={20} />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                AI Marketing Assistant
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                    marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'bg-emerald-200/50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                    marketingStatus === 'rejected' ? 'bg-red-200/50 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                    'bg-purple-200/50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
                                }`}>
                                    {marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'Scheduled' :
                                     marketingStatus === 'rejected' ? 'Needs Attention' :
                                     'Action Required'}
                                </span>
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
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
                                ? 'bg-white text-emerald-700 hover:bg-emerald-50 hover:shadow border border-emerald-100 dark:bg-slate-800 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-slate-700' :
                            marketingStatus === 'rejected'
                                ? 'bg-white text-red-700 hover:bg-red-50 hover:shadow border border-red-100 dark:bg-slate-800 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-slate-700' :
                            'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md dark:bg-purple-600 dark:hover:bg-purple-500 dark:text-white dark:border dark:border-purple-500/50'
                        }`}
                    >
                        {marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'View Schedule' : 'Review Post'} <ArrowRight size={14} />
                    </Link>
                </div>
            )}

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900">{t('dashboard')}</h1>
                <p className="text-slate-500">{t('welcomeBack')}</p>
            </div>

            <Dashboard {...dashboardProps} />
        </div>
    );
}
