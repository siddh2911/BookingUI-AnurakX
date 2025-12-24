import React, { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (provider: string) => {
        setIsLoading(true);
        setTimeout(() => {
            onLogin();
        }, 1500);
    };

    return (
        <div className="min-h-screen flex w-full">
            {/* Left Panel - Branding (Matches Sidebar) */}
            <div className="hidden lg:flex w-[40%] bg-slate-900 relative flex-col items-center justify-center p-12 text-center overflow-hidden">
                {/* Abstract Shapes for Wealthy Feel */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                    <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[100px]"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    {/* Exact Logo from Sidebar */}
                    <h1 className="text-4xl font-bold text-white tracking-widest leading-tight text-center" style={{ fontFamily: '"Playfair Display", serif' }}>
                        KARUNA VILLA
                    </h1>
                    <div className="h-0.5 w-12 bg-blue-500/50 my-4 rounded-full"></div>
                    <p className="text-sm text-blue-200 uppercase tracking-[0.3em] font-sans font-medium mb-8">
                        Admin Dashboard
                    </p>

                    <p className="text-slate-400 font-light max-w-sm leading-relaxed">
                        Welcome to Karuna Villa, your serene Airbnb retreat in Varanasi. Manage your property with elegance and efficiency.
                    </p>
                </div>

                <div className="absolute bottom-8 text-xs text-slate-600 tracking-widest uppercase">
                    anurakX Software v1.0
                </div>
            </div>

            {/* Right Panel - Login Form (Matches Dashboard Main Area) */}
            <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-8 lg:p-16 relative">
                <div className="w-full max-w-md">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: '"Playfair Display", serif' }}>Sign In</h2>
                        <p className="text-slate-500">Access your admin portal securely.</p>
                    </div>

                    <div className="space-y-4">
                        {/* Google */}
                        <button
                            onClick={() => handleLogin('google')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-[0.98] shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M23.52 12.29C23.52 11.43 23.44 10.6 23.29 9.79H12V14.43H18.45C18.17 15.93 17.31 17.2 16.05 18.05V21.06H19.9C22.15 18.99 23.44 15.94 23.44 12.29Z" fill="#4285F4" />
                                <path d="M11.9999 23.9599C15.2399 23.9599 17.9599 22.8899 19.8999 21.0999L16.0499 18.0999C14.9799 18.8299 13.6199 19.2499 11.9999 19.2499C8.86992 19.2499 6.21992 17.1399 5.26992 14.3099H1.30992V17.3799C3.23992 21.2299 7.27992 23.9599 11.9999 23.9599Z" fill="#34A853" />
                                <path d="M5.27003 14.2901C5.02003 13.5501 4.88003 12.7601 4.88003 11.9501C4.88003 11.1401 5.02003 10.3501 5.27003 9.61011V6.54011H1.31003C0.490027 8.18011 0.0300274 10.0201 0.0300274 11.9501C0.0300274 13.8801 0.490027 15.7201 1.31003 17.3601L5.27003 14.2901Z" fill="#FBBC05" />
                                <path d="M11.9999 4.65997C13.7599 4.65997 15.3399 5.26997 16.5799 6.45997L19.9999 3.03997C17.9499 1.12997 15.2299 0 11.9999 0C7.27993 0 3.23993 2.73 1.30993 6.57999L5.26993 9.64999C6.21993 6.81999 8.86993 4.65997 11.9999 4.65997Z" fill="#EA4335" />
                            </svg>
                            <span>Continue with Google</span>
                        </button>

                        {/* Yahoo */}
                        <button
                            onClick={() => handleLogin('yahoo')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-[0.98] shadow-sm"
                        >
                            <span className="font-extrabold font-serif text-[#6001D2]">Y!</span>
                            <span>Continue with Yahoo</span>
                        </button>

                        {/* Email */}
                        <button
                            onClick={() => handleLogin('email')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white font-semibold py-4 px-6 rounded-xl hover:bg-slate-800 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-slate-900/20"
                        >
                            <Mail size={20} />
                            <span>Continue with Email</span>
                        </button>
                    </div>

                    <p className="mt-8 text-center text-xs text-slate-400">
                        Protected by anurakX Security
                    </p>
                </div>

                {/* Mobile Only Header (Simulating Sidebar) */}
                <div className="lg:hidden absolute top-0 left-0 w-full p-6 bg-slate-900">
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-lg text-white tracking-widest leading-tight" style={{ fontFamily: '"Playfair Display", serif' }}>KARUNA VILLA</span>
                        <span className="text-[9px] text-blue-200 uppercase tracking-widest font-sans">Admin</span>
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-800 font-medium">Authenticating...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginPage;
