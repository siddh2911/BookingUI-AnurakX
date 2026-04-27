import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Instagram, CheckCircle, RefreshCw, Clock, Image as ImageIcon, Send, Upload, Undo2, XCircle } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const AI_POST_TEMPLATES = [
    {
        imagePrompt: "A stunning sunset view from the balcony of Karuna Villa, with a glass of wine on the railing. Warm, cinematic lighting.",
        caption: "Escape to tranquility. 🌅 Experience the magic of evening at Karuna Villa. Your perfect getaway awaits. #KarunaVilla #AirbnbStay #LuxuryRetreat #SunsetVibes",
        tags: ["KarunaVilla", "AirbnbStay", "LuxuryRetreat", "SunsetVibes"]
    },
    {
        imagePrompt: "A beautifully arranged breakfast tray floating in the private pool of Karuna Villa. Tropical vibe, bright morning sunlight.",
        caption: "Mornings done right. 🍳 Dive into luxury with our floating breakfast experience. Tag who you'd share this with! 👇 #FloatingBreakfast #VillaLife #VacationGoals",
        tags: ["FloatingBreakfast", "VillaLife", "VacationGoals", "TravelGram"]
    },
    {
        imagePrompt: "Cozy interior shot of the master bedroom at Karuna Villa, featuring crisp white linens and sunlight streaming through large windows.",
        caption: "Where comfort meets luxury. ✨ Sleep in style and wake up refreshed at Karuna Villa. Tap the link in our bio to book your stay. 🛏️ #CozyVibes #InteriorDesign #BoutiqueStay",
        tags: ["CozyVibes", "InteriorDesign", "BoutiqueStay", "KarunaVilla"]
    }
];

export default function MarketingPage() {
    const { theme } = useTheme();
    const night = theme === 'night';
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [currentPost, setCurrentPost] = useState<any>(null);
    const [postStatus, setPostStatus] = useState<'pending' | 'approved' | 'scheduled' | 'published' | 'rejected'>('pending');
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load today's post if exists, else generate one
        const savedPost = localStorage.getItem('karuna_daily_post');
        const savedDate = localStorage.getItem('karuna_daily_post_date');
        const today = new Date().toDateString();

        if (savedPost && savedDate === today) {
            setCurrentPost(JSON.parse(savedPost));
            const status = localStorage.getItem('karuna_daily_post_status') as any;
            if (status) setPostStatus(status);
        } else {
            generateNewPost();
        }
    }, []);

    const generateNewPost = () => {
        setIsGenerating(true);
        setPostStatus('pending');
        
        // Simulate AI generation delay
        setTimeout(() => {
            const randomTemplate = AI_POST_TEMPLATES[Math.floor(Math.random() * AI_POST_TEMPLATES.length)];
            const newPost = {
                ...randomTemplate,
                date: new Date().toDateString(),
                id: Math.random().toString(36).substr(2, 9),
                imageUrl: null
            };
            
            setCurrentPost(newPost);
            localStorage.setItem('karuna_daily_post', JSON.stringify(newPost));
            localStorage.setItem('karuna_daily_post_date', new Date().toDateString());
            localStorage.setItem('karuna_daily_post_status', 'pending');
            setIsGenerating(false);
        }, 2000);
    };

    const handleApprove = () => {
        setPostStatus('scheduled');
        localStorage.setItem('karuna_daily_post_status', 'scheduled');
    };

    const handleReject = () => {
        setPostStatus('rejected');
        localStorage.setItem('karuna_daily_post_status', 'rejected');
    };

    const handleRevert = () => {
        setPostStatus('pending');
        localStorage.setItem('karuna_daily_post_status', 'pending');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setReferenceImage(file.name);
        }
    };

    const handleGenerateImage = () => {
        setIsGeneratingImage(true);
        setTimeout(() => {
            const updatedPost = { ...currentPost, imageUrl: '/placeholder_post.png?t=' + Date.now() };
            setCurrentPost(updatedPost);
            localStorage.setItem('karuna_daily_post', JSON.stringify(updatedPost));
            setIsGeneratingImage(false);
        }, 3000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl ${night ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-purple-100 text-purple-600'}`}>
                            <Sparkles size={24} />
                        </div>
                        <h2 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${night ? 'text-white' : 'text-slate-900'}`}>
                            AI Marketing Assistant
                            {postStatus === 'pending' && (
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter animate-pulse ${night ? 'bg-blue-500 text-white' : 'bg-purple-600 text-white'}`}>
                                    Action Required
                                </span>
                            )}
                        </h2>
                    </div>
                    <p className={`text-sm ml-14 ${night ? 'text-slate-400' : 'text-slate-500'}`}>Review and approve daily automated Instagram posts.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Post Preview Card */}
                <div className="lg:col-span-8">
                    <div className={`rounded-3xl shadow-2xl border overflow-hidden transition-all duration-700 ${night ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className={`p-5 border-b flex items-center justify-between ${night ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                            <div className={`flex items-center gap-3 font-bold ${night ? 'text-slate-200' : 'text-slate-800'}`}>
                                <div className={`p-1.5 rounded-lg ${night ? 'bg-slate-800' : 'bg-white shadow-sm'}`}>
                                    <Instagram size={18} className={night ? 'text-blue-400' : 'text-pink-600'} />
                                </div>
                                Today's Suggested Post
                            </div>
                            <div className={`flex items-center gap-2 text-xs font-bold ${night ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Clock size={14} /> {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                        </div>

                        {isGenerating ? (
                            <div className={`flex flex-col items-center justify-center py-32 ${night ? 'bg-slate-950' : ''}`}>
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
                                    <RefreshCw className="w-12 h-12 animate-spin text-blue-500 relative z-10" />
                                </div>
                                <p className={`font-bold text-lg ${night ? 'text-slate-200' : 'text-slate-800'}`}>Nano Banana is thinking...</p>
                                <p className={`text-sm mt-1 ${night ? 'text-slate-500' : 'text-slate-400'}`}>Crafting the perfect engagement strategy</p>
                            </div>
                        ) : currentPost ? (
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Image Preview Area */}
                                <div className="space-y-5">
                                    <div className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-6 text-center border-2 border-dashed relative overflow-hidden group transition-all duration-700 ${night ? 'bg-slate-900/30 border-slate-800 hover:border-blue-500/40' : 'bg-slate-50 border-slate-200'}`}>
                                        {currentPost.imageUrl && !isGeneratingImage ? (
                                            <img src={currentPost.imageUrl} alt="Generated Preview" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        ) : (
                                            <>
                                                <div className={`absolute inset-0 ${night ? 'bg-gradient-to-br from-blue-500/10 to-slate-950' : 'bg-gradient-to-br from-purple-500/5 to-pink-500/5'}`}></div>
                                                {isGeneratingImage ? (
                                                    <div className="flex flex-col items-center relative z-10">
                                                        <div className="w-12 h-12 mb-4 relative">
                                                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-25"></div>
                                                            <RefreshCw className="w-full h-full text-blue-500 animate-spin relative z-10" />
                                                        </div>
                                                        <p className={`text-base font-black ${night ? 'text-white' : 'text-slate-900'}`}>Nano Banana</p>
                                                        <p className={`text-xs mt-1 ${night ? 'text-slate-500' : 'text-slate-500'}`}>Painting your masterpiece...</p>
                                                    </div>
                                                ) : (
                                                    <div className="relative z-10 flex flex-col items-center">
                                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${night ? 'bg-slate-800' : 'bg-white shadow-sm'}`}>
                                                            <ImageIcon className={`w-8 h-8 ${night ? 'text-slate-600' : 'text-slate-300'}`} />
                                                        </div>
                                                        <p className={`text-xs font-bold uppercase tracking-widest ${night ? 'text-slate-500' : 'text-slate-400'}`}>No Image Generated</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {!isGeneratingImage && (
                                            <div className={`absolute inset-x-0 bottom-0 p-4 backdrop-blur-xl border-t transition-transform duration-700 ${currentPost.imageUrl ? 'translate-y-full group-hover:translate-y-0' : ''} ${night ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
                                                <button 
                                                    onClick={handleGenerateImage}
                                                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:shadow-blue-500/30 transition-all active:scale-95"
                                                >
                                                    <Sparkles size={16} /> {currentPost.imageUrl ? 'Regenerate Masterpiece' : 'Generate with Nano Banana'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2.5">
                                        <div className="flex items-center justify-between">
                                            <label className={`text-[10px] font-black uppercase tracking-[0.2em] block ${night ? 'text-slate-600' : 'text-slate-500'}`}>Image Prompt</label>
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`text-[10px] flex items-center gap-1.5 font-black uppercase tracking-tighter px-3 py-1.5 rounded-lg transition-all ${night ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' : 'text-purple-600 bg-purple-50 hover:bg-purple-100'}`}
                                            >
                                                <Upload size={12} /> {referenceImage ? 'Change Ref' : 'Add Reference'}
                                            </button>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </div>
                                        {referenceImage && (
                                            <div className={`text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 border animate-in slide-in-from-left-2 ${night ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                                                <CheckCircle size={12} /> Using Reference: {referenceImage}
                                            </div>
                                        )}
                                        <textarea 
                                            value={currentPost.imagePrompt}
                                            onChange={(e) => setCurrentPost({ ...currentPost, imagePrompt: e.target.value })}
                                            className={`w-full border rounded-2xl p-4 text-sm outline-none transition-all resize-none h-28 disabled:cursor-not-allowed leading-relaxed ${night ? 'bg-slate-900/50 border-slate-800 text-slate-300 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50' : 'bg-white border-slate-200 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-70 shadow-sm'}`}
                                            placeholder="Describe the mood and content for AI..."
                                            disabled={postStatus !== 'pending' && postStatus !== 'rejected'}
                                        />
                                    </div>
                                </div>

                                {/* Caption Area */}
                                <div className="space-y-6 flex flex-col justify-between">
                                    <div className="space-y-6">
                                        <div>
                                            <label className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 block ${night ? 'text-slate-600' : 'text-slate-500'}`}>Caption</label>
                                            <div className={`border rounded-2xl p-5 text-sm whitespace-pre-wrap transition-colors leading-relaxed ${night ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800 shadow-inner'}`}>
                                                {currentPost.caption}
                                            </div>
                                        </div>

                                        <div>
                                            <label className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 block ${night ? 'text-slate-600' : 'text-slate-500'}`}>Suggested Tags</label>
                                            <div className="flex flex-wrap gap-2.5">
                                                {currentPost.tags.map((tag: string, idx: number) => (
                                                    <span key={idx} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${night ? 'bg-blue-500/5 text-blue-400 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-2xl border flex items-center gap-4 ${night ? 'bg-blue-500/5 border-blue-500/10' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${night ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                            <Sparkles size={18} />
                                        </div>
                                        <div>
                                            <p className={`text-xs font-bold ${night ? 'text-slate-200' : 'text-slate-800'}`}>Engagement Boost</p>
                                            <p className={`text-[10px] ${night ? 'text-slate-500' : 'text-slate-500'}`}>AI predicts 24% higher engagement for this combination.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Action Bar */}
                        {!isGenerating && currentPost && (
                            <div className={`p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-5 transition-colors ${night ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <button 
                                    onClick={generateNewPost}
                                    className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 w-full sm:w-auto justify-center ${night ? 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border border-slate-200'}`}
                                    disabled={postStatus === 'approved' || postStatus === 'scheduled'}
                                >
                                    <RefreshCw size={16} /> Regenerate Draft
                                </button>
                                
                                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
                                    {(postStatus === 'scheduled' || postStatus === 'published') && (
                                        <button 
                                            onClick={handleRevert}
                                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-transparent ${night ? 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30' : 'text-slate-500 hover:text-purple-600 hover:bg-purple-50 hover:border-purple-200'}`}
                                        >
                                            <Undo2 size={16} /> Modify
                                        </button>
                                    )}
                                    {postStatus === 'pending' || postStatus === 'rejected' ? (
                                        <>
                                            {postStatus !== 'rejected' && (
                                                <button 
                                                    onClick={handleReject}
                                                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${night ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-red-500 hover:bg-red-50'}`}
                                                >
                                                    Discard
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleApprove}
                                                className={`px-8 py-3 text-white rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-2xl transition-all flex items-center gap-2 active:scale-95 ${night ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/20 hover:shadow-blue-500/40' : 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-500/20 hover:shadow-purple-500/40'}`}
                                            >
                                                <CheckCircle size={18} /> {postStatus === 'rejected' ? 'Re-Approve' : 'Approve & Schedule'}
                                            </button>
                                        </>
                                    ) : (
                                        <div className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 border ${night ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm'}`}>
                                            <CheckCircle size={18} /> Optimized & Scheduled
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Workflow Status */}
                <div className="lg:col-span-4 space-y-8">
                    <div className={`rounded-3xl shadow-2xl border p-8 transition-all duration-700 ${night ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h3 className={`text-xl font-black mb-6 flex items-center gap-3 ${night ? 'text-white' : 'text-slate-900'}`}>
                            <div className={`p-1.5 rounded-lg ${night ? 'bg-slate-900' : 'bg-slate-50'}`}>
                                <Send size={18} className="text-blue-500" />
                            </div>
                            Workflow Status
                        </h3>
                        
                        <div className={`space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:to-transparent ${night ? 'before:via-slate-800' : 'before:via-slate-200'}`}>
                            
                            <div className="relative flex items-center gap-6 group">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-xl shrink-0 z-10 transition-all duration-500 ${night ? 'border-slate-950 bg-blue-600 text-white shadow-blue-500/20' : 'border-white bg-purple-600 text-white'}`}>
                                    <Sparkles size={16} />
                                </div>
                                <div className={`flex-1 p-4 rounded-2xl border transition-all duration-500 ${night ? 'border-blue-500/20 bg-blue-500/5' : 'border-purple-100 bg-purple-50/50'}`}>
                                    <h4 className={`text-sm font-black ${night ? 'text-slate-100' : 'text-slate-900'}`}>AI Generation</h4>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${night ? 'text-slate-500' : 'text-slate-500'}`}>08:00 AM - Content Ready</p>
                                </div>
                            </div>

                            <div className="relative flex items-center gap-6 group">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-xl shrink-0 z-10 transition-all duration-500 ${postStatus === 'scheduled' || postStatus === 'published' ? 'bg-blue-600 text-white border-slate-950' : postStatus === 'rejected' ? 'bg-red-600 text-white border-slate-950' : night ? 'border-slate-950 bg-slate-900 text-slate-700' : 'border-white bg-slate-200 text-slate-400'}`}>
                                    {postStatus === 'rejected' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                </div>
                                <div className={`flex-1 p-4 rounded-2xl border transition-all duration-500 ${postStatus === 'scheduled' || postStatus === 'published' ? 'border-blue-500/20 bg-blue-500/5' : postStatus === 'rejected' ? 'border-red-500/20 bg-red-500/5' : night ? 'border-slate-900 bg-slate-900/50' : 'border-slate-100 bg-white'}`}>
                                    <h4 className={`text-sm font-black ${postStatus === 'scheduled' || postStatus === 'published' ? (night ? 'text-slate-100' : 'text-slate-900') : postStatus === 'rejected' ? (night ? 'text-red-400' : 'text-red-700') : (night ? 'text-slate-600' : 'text-slate-500')}`}>Admin Review</h4>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${night ? 'text-slate-600' : 'text-slate-500'}`}>{postStatus === 'scheduled' || postStatus === 'published' ? 'Approved by Admin' : postStatus === 'rejected' ? 'Draft Discarded' : 'Awaiting Final Approval'}</p>
                                </div>
                            </div>

                            <div className="relative flex items-center gap-6 group">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-xl shrink-0 z-10 transition-all duration-500 ${postStatus === 'published' ? 'bg-emerald-600 text-white border-slate-950' : night ? 'border-slate-950 bg-slate-900 text-slate-700' : 'border-white bg-slate-200 text-slate-400'}`}>
                                    <Send size={16} />
                                </div>
                                <div className={`flex-1 p-4 rounded-2xl border transition-all duration-500 ${postStatus === 'published' ? 'border-emerald-500/20 bg-emerald-500/5' : night ? 'border-slate-900 bg-slate-900/50' : 'border-slate-100 bg-white'}`}>
                                    <h4 className={`text-sm font-black ${postStatus === 'published' ? (night ? 'text-slate-100' : 'text-slate-900') : (night ? 'text-slate-600' : 'text-slate-500')}`}>Publish to IG</h4>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${night ? 'text-slate-600' : 'text-slate-500'}`}>Target: Today 12:00 PM</p>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className={`rounded-3xl border p-6 flex items-start gap-4 ${night ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 text-white'}`}>
                        <div className="p-2 bg-blue-500 rounded-xl text-white">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black">Optimization Tip</h4>
                            <p className="text-xs mt-1 text-slate-400 leading-relaxed">Posts shared between 11 AM and 1 PM show 15% higher conversion for villa bookings.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
