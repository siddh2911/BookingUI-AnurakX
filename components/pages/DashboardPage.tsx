import React, { useState, useEffect } from 'react';
import Dashboard from '../dashboard/Dashboard';
import { useLanguage } from '../../contexts/LanguageContext';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage({ dashboardProps }: { dashboardProps: any }) {
    const { t } = useLanguage();
    const [needsReview, setNeedsReview] = useState(false);

    useEffect(() => {
        if (!dashboardProps.isAdmin) return;
        
        const savedDate = localStorage.getItem('karuna_daily_post_date');
        const savedStatus = localStorage.getItem('karuna_daily_post_status');
        const today = new Date().toDateString();

        if (savedDate !== today || savedStatus === 'pending') {
            setNeedsReview(true);
        }
    }, [dashboardProps.isAdmin]);

    return (
        <div className="animate-in fade-in duration-500">
            {needsReview && dashboardProps.isAdmin && (
                <div className="mb-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 md:p-5 shadow-lg shadow-purple-500/20 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none">
                        <Sparkles size={100} />
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Sparkles className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Daily AI Post is Ready!</h3>
                            <p className="text-purple-100 text-sm">Your automated Instagram post for {new Date().toLocaleDateString('en-US', { weekday: 'long' })} needs your approval.</p>
                        </div>
                    </div>
                    <Link 
                        to="/marketing" 
                        className="relative z-10 w-full md:w-auto px-5 py-2.5 bg-white text-purple-700 hover:bg-purple-50 hover:scale-105 rounded-lg text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        Review & Approve <ArrowRight size={16} />
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
