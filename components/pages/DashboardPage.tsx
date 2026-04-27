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
                <div className="mb-8 grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="md:col-span-4 lg:col-span-3 bg-slate-900 p-6 flex flex-col justify-center items-center md:items-start text-center md:text-left gap-2">
                        <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-widest text-[10px]">
                            <Sparkles size={12} /> AI Marketing
                        </div>
                        <h3 className="text-white font-bold text-xl leading-tight">Daily Social Status</h3>
                    </div>
                    
                    <div className="md:col-span-8 lg:col-span-9 p-5 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${
                                marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'bg-emerald-50 text-emerald-600' :
                                marketingStatus === 'rejected' ? 'bg-red-50 text-red-600' :
                                'bg-purple-50 text-purple-600 animate-pulse'
                            }`}>
                                {marketingStatus === 'scheduled' || marketingStatus === 'published' ? <CheckCircle size={24} /> :
                                 marketingStatus === 'rejected' ? <XCircle size={24} /> :
                                 <Clock size={24} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">Today's Instagram Post</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                        marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'bg-emerald-100 text-emerald-700' :
                                        marketingStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-purple-100 text-purple-700'
                                    }`}>
                                        {marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'Ready' :
                                         marketingStatus === 'rejected' ? 'Discarded' :
                                         'Pending Review'}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-sm mt-0.5">
                                    {marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'Awesome! Your post is scheduled for today.' :
                                     marketingStatus === 'rejected' ? 'You discarded today\'s suggestion. Want to generate a new one?' :
                                     'The AI has drafted a new post. It needs your approval before publishing.'}
                                </p>
                            </div>
                        </div>

                        <Link 
                            to="/marketing" 
                            className={`w-full md:w-auto px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md ${
                                marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' :
                                'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                        >
                            {marketingStatus === 'scheduled' || marketingStatus === 'published' ? 'View Post' : 'Review Now'} <ArrowRight size={16} />
                        </Link>
                    </div>
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
