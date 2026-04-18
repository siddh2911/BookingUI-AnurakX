import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Mail, ArrowLeft, Globe } from 'lucide-react';

const UnauthorizedPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-[#0f172a]">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-emerald-600/5 rounded-full blur-[100px]"></div>
            </div>

            {/* Glass Card */}
            <div className="relative z-10 w-full max-w-lg">
                <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 lg:p-12 shadow-2xl animate-in fade-in zoom-in duration-500">
                    
                    {/* Icon Header */}
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full scale-150"></div>
                            <div className="relative bg-red-500/10 border border-red-500/20 p-5 rounded-3xl">
                                <ShieldAlert size={48} className="text-red-500" />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="text-center space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: '"Playfair Display", serif' }}>
                                Access Restricted
                            </h1>
                            <div className="h-1 w-12 bg-red-500/50 mx-auto rounded-full"></div>
                        </div>

                        <p className="text-slate-300 text-lg font-light leading-relaxed">
                            You are not authorized to access this site. Your account lacks the required <span className="text-white font-medium underline decoration-red-500/30 underline-offset-4">Admin permissions</span>.
                        </p>

                        {/* Contact Support */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-center gap-2 text-blue-400 text-xs uppercase tracking-widest font-bold">
                                <Globe size={14} />
                                System Support
                            </div>
                            <p className="text-slate-400 text-sm">
                                Please reach out to our management team for authorization requests.
                            </p>
                            <a 
                                href="mailto:karunavillastay@gmail.com" 
                                className="inline-flex items-center gap-3 text-white hover:text-blue-400 transition-colors duration-200 group"
                            >
                                <div className="p-2 bg-white/5 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <span className="font-medium">karunavillastay@gmail.com</span>
                            </a>
                        </div>

                        {/* Action Bar */}
                        <div className="pt-6">
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-4 px-8 rounded-2xl hover:bg-blue-50 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-white/5 group"
                            >
                                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                Return to Login
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Brand */}
                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <p className="text-slate-500 text-xs uppercase tracking-[0.4em] font-medium opacity-50">
                        Karuna Villa Admin System
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
