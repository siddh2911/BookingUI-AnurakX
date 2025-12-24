import React from 'react';
import Dashboard from '../dashboard/Dashboard';
import { useLanguage } from '../../contexts/LanguageContext';

export default function DashboardPage({ dashboardProps }: { dashboardProps: any }) {
    const { t } = useLanguage();
    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900">{t('dashboard')}</h1>
                <p className="text-slate-500">{t('welcomeBack')}</p>
            </div>
            <Dashboard {...dashboardProps} />
        </div>
    );
}
