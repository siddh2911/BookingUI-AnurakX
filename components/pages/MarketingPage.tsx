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
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-2xl font-bold flex items-center gap-2 ${night ? 'text-white' : 'text-slate-800'}`}>
                        <Sparkles className={night ? 'text-blue-400' : 'text-purple-500'} /> AI Marketing Assistant
                    </h2>
                    <p className={`text-sm mt-1 ${night ? 'text-slate-400' : 'text-slate-500'}`}>Review and approve daily automated Instagram posts.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Post Preview Card */}
                <div className="lg:col-span-2">
                    <div className={`rounded-xl shadow-xl border overflow-hidden transition-all duration-500 ${night ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className={`p-4 border-b flex items-center justify-between ${night ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                            <div className={`flex items-center gap-2 font-medium ${night ? 'text-slate-200' : 'text-slate-800'}`}>
                                <Instagram className={night ? 'text-blue-400' : 'text-pink-600'} /> Today's Suggested Post
                            </div>
                            <span className={`text-xs font-medium ${night ? 'text-slate-500' : 'text-slate-500'}`}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>

                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center py-24">
                                <RefreshCw className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                                <p className={`font-medium ${night ? 'text-slate-500' : 'text-slate-400'}`}>AI is crafting the perfect post...</p>
                            </div>
                        ) : currentPost ? (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Image Preview Area */}
                                <div className="space-y-3">
                                    <div className={`aspect-square rounded-lg flex flex-col items-center justify-center p-4 text-center border-2 border-dashed relative overflow-hidden group transition-all duration-500 ${night ? 'bg-slate-900/50 border-slate-800 hover:border-blue-500/40' : 'bg-slate-50 border-slate-200'}`}>
                                        {currentPost.imageUrl && !isGeneratingImage ? (
                                            <img src={currentPost.imageUrl} alt="Generated Preview" className="absolute inset-0 w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <div className={`absolute inset-0 ${night ? 'bg-gradient-to-br from-blue-500/5 to-slate-900/5' : 'bg-gradient-to-br from-purple-500/5 to-pink-500/5'}`}></div>
                                                {isGeneratingImage ? (
                                                    <div className="flex flex-col items-center relative z-10">
                                                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                                                        <p className={`text-sm font-bold ${night ? 'text-slate-200' : 'text-slate-700'}`}>Nano Banana</p>
                                                        <p className={`text-xs ${night ? 'text-slate-500' : 'text-slate-500'}`}>Generating masterpiece...</p>
                                                    </div>
                                                ) : (
                                                    <div className="relative z-10">
                                                        <ImageIcon className={`w-10 h-10 mb-2 mx-auto ${night ? 'text-slate-700' : 'text-slate-300'}`} />
                                                        <p className={`text-xs font-medium ${night ? 'text-slate-500' : 'text-slate-400'}`}>No Image Generated Yet</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {!isGeneratingImage && (
                                            <div className={`absolute inset-x-0 bottom-0 p-3 backdrop-blur-md border-t transition-transform duration-500 ${currentPost.imageUrl ? 'translate-y-full group-hover:translate-y-0' : ''} ${night ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
                                                <button 
                                                    onClick={handleGenerateImage}
                                                    className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-md text-xs font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/20 transition-all"
                                                >
                                                    <Sparkles size={14} /> Generate with Nano Banana
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <label className={`text-xs font-bold uppercase tracking-wider block ${night ? 'text-slate-500' : 'text-slate-500'}`}>Image Prompt</label>
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`text-[10px] flex items-center gap-1 font-bold px-2 py-1 rounded-md transition-colors ${night ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' : 'text-purple-600 bg-purple-50 hover:bg-purple-100'}`}
                                            >
                                                <Upload size={12} /> {referenceImage ? 'Change Ref' : 'Add Ref Image'}
                                            </button>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </div>
                                        {referenceImage && (
                                            <div className={`text-[10px] font-medium px-2 py-1 rounded-md flex items-center gap-1 ${night ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-50'}`}>
                                                <CheckCircle size={10} /> Ref: {referenceImage}
                                            </div>
                                        )}
                                        <textarea 
                                            value={currentPost.imagePrompt}
                                            onChange={(e) => setCurrentPost({ ...currentPost, imagePrompt: e.target.value })}
                                            className={`w-full border rounded-lg p-3 text-sm outline-none transition-all resize-none h-24 disabled:cursor-not-allowed ${night ? 'bg-slate-900 border-slate-800 text-slate-300 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50' : 'bg-white border-slate-200 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-70'}`}
                                            disabled={postStatus !== 'pending' && postStatus !== 'rejected'}
                                        />
                                    </div>
                                </div>

                                {/* Caption Area */}
                                <div className="space-y-4">
                                    <div>
                                        <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${night ? 'text-slate-500' : 'text-slate-500'}`}>Caption</label>
                                        <div className={`border rounded-lg p-4 text-sm whitespace-pre-wrap transition-colors ${night ? 'bg-slate-900/50 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                                            {currentPost.caption}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${night ? 'text-slate-500' : 'text-slate-500'}`}>Suggested Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {currentPost.tags.map((tag: string, idx: number) => (
                                                <span key={idx} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${night ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Action Bar */}
                        {!isGenerating && currentPost && (
                            <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${night ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <button 
                                    onClick={generateNewPost}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 w-full sm:w-auto justify-center ${night ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                                    disabled={postStatus === 'approved' || postStatus === 'scheduled'}
                                >
                                    <RefreshCw size={16} /> Regenerate
                                </button>
                                
                                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
                                    {(postStatus === 'scheduled' || postStatus === 'published') && (
                                        <button 
                                            onClick={handleRevert}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 border border-transparent ${night ? 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30' : 'text-slate-500 hover:text-purple-600 hover:bg-purple-50 hover:border-purple-200'}`}
                                        >
                                            <Undo2 size={16} /> Revert
                                        </button>
                                    )}
                                    {postStatus === 'pending' || postStatus === 'rejected' ? (
                                        <>
                                            {postStatus !== 'rejected' && (
                                                <button 
                                                    onClick={handleReject}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${night ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-red-500 hover:bg-red-50'}`}
                                                >
                                                    Discard
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleApprove}
                                                className={`px-6 py-2 text-white rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2 ${night ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/20 hover:shadow-blue-500/30' : 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-500/20 hover:shadow-purple-500/30'}`}
                                            >
                                                <CheckCircle size={18} /> {postStatus === 'rejected' ? 'Re-Approve' : 'Approve & Schedule'}
                                            </button>
                                        </>
                                    ) : (
                                        <div className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border ${night ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                            <CheckCircle size={18} /> Post Approved
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Workflow Status */}
                <div className="space-y-6">
                    <div className={`rounded-xl shadow-xl border p-6 transition-all duration-500 ${night ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h3 className={`text-lg font-bold mb-4 ${night ? 'text-white' : 'text-slate-800'}`}>Daily Workflow</h3>
                        
                        <div className={`space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:to-transparent ${night ? 'before:via-slate-800' : 'before:via-slate-200'}`}>
                            
                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shadow shrink-0 z-10 transition-colors ${night ? 'border-slate-900 bg-blue-500 text-white' : 'border-white bg-purple-500 text-white'}`}>
                                    <Sparkles size={14} />
                                </div>
                                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border shadow-sm transition-colors ${night ? 'border-blue-500/20 bg-blue-500/5' : 'border-purple-100 bg-purple-50/50'}`}>
                                    <h4 className={`text-sm font-bold ${night ? 'text-slate-200' : 'text-slate-800'}`}>AI Generation</h4>
                                    <p className={`text-xs mt-0.5 ${night ? 'text-slate-500' : 'text-slate-500'}`}>08:00 AM - Post drafted</p>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shadow shrink-0 z-10 transition-colors ${postStatus === 'scheduled' || postStatus === 'published' ? 'bg-blue-500 text-white' : postStatus === 'rejected' ? 'bg-red-500 text-white' : night ? 'border-slate-900 bg-slate-800 text-slate-600' : 'border-white bg-slate-200 text-slate-400'}`}>
                                    {postStatus === 'rejected' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                </div>
                                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border shadow-sm transition-colors ${postStatus === 'scheduled' || postStatus === 'published' ? 'border-blue-500/20 bg-blue-500/5' : postStatus === 'rejected' ? 'border-red-500/20 bg-red-500/5' : night ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
                                    <h4 className={`text-sm font-bold ${postStatus === 'scheduled' || postStatus === 'published' ? night ? 'text-slate-200' : 'text-slate-800' : postStatus === 'rejected' ? night ? 'text-red-400' : 'text-red-700' : night ? 'text-slate-600' : 'text-slate-500'}`}>Admin Review</h4>
                                    <p className={`text-xs mt-0.5 ${night ? 'text-slate-600' : 'text-slate-500'}`}>{postStatus === 'scheduled' || postStatus === 'published' ? 'Approved by Admin' : postStatus === 'rejected' ? 'Discarded' : 'Awaiting your approval'}</p>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shadow shrink-0 z-10 transition-colors ${postStatus === 'published' ? 'bg-emerald-500 text-white' : night ? 'border-slate-900 bg-slate-800 text-slate-600' : 'border-white bg-slate-200 text-slate-400'}`}>
                                    <Send size={14} />
                                </div>
                                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border shadow-sm transition-colors ${postStatus === 'published' ? 'border-emerald-500/20 bg-emerald-500/5' : night ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
                                    <h4 className={`text-sm font-bold ${postStatus === 'published' ? night ? 'text-slate-200' : 'text-slate-800' : night ? 'text-slate-600' : 'text-slate-500'}`}>Publish to IG</h4>
                                    <p className={`text-xs mt-0.5 ${night ? 'text-slate-600' : 'text-slate-500'}`}>Scheduled for 12:00 PM</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
