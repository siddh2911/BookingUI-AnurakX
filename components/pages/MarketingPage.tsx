import React, { useState, useEffect } from 'react';
import { Sparkles, Instagram, CheckCircle, RefreshCw, Clock, Image as ImageIcon, Send } from 'lucide-react';

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
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentPost, setCurrentPost] = useState<any>(null);
    const [postStatus, setPostStatus] = useState<'pending' | 'approved' | 'scheduled' | 'published'>('pending');

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
                id: Math.random().toString(36).substr(2, 9)
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
        // In a real app, this would trigger an API call to schedule via Buffer, Hootsuite, or Meta API.
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="text-purple-500" /> AI Marketing Assistant
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Review and approve daily automated Instagram posts.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Post Preview Card */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2 font-medium text-slate-800">
                                <Instagram className="text-pink-600" /> Today's Suggested Post
                            </div>
                            <span className="text-xs text-slate-500 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>

                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                <RefreshCw className="w-8 h-8 animate-spin mb-4 text-purple-500" />
                                <p className="font-medium">AI is crafting the perfect post...</p>
                            </div>
                        ) : currentPost ? (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Image Preview Area */}
                                <div className="space-y-3">
                                    <div className="aspect-square bg-slate-100 rounded-lg flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
                                        <ImageIcon className="w-10 h-10 text-slate-300 mb-3" />
                                        <p className="text-xs text-slate-500 font-medium">AI Image Prompt:</p>
                                        <p className="text-sm text-slate-700 mt-1 italic">"{currentPost.imagePrompt}"</p>
                                        
                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-white/80 backdrop-blur-sm border-t border-slate-200 translate-y-full group-hover:translate-y-0 transition-transform">
                                            <button className="w-full py-2 bg-slate-900 text-white rounded-md text-xs font-medium flex items-center justify-center gap-2">
                                                <Sparkles size={14} /> Generate Image
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Caption Area */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Caption</label>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap">
                                            {currentPost.caption}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Suggested Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {currentPost.tags.map((tag: string, idx: number) => (
                                                <span key={idx} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium border border-blue-100">
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
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                                <button 
                                    onClick={generateNewPost}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors flex items-center gap-2"
                                    disabled={postStatus !== 'pending'}
                                >
                                    <RefreshCw size={16} /> Regenerate
                                </button>
                                
                                {postStatus === 'pending' ? (
                                    <button 
                                        onClick={handleApprove}
                                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-bold shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center gap-2"
                                    >
                                        <CheckCircle size={18} /> Approve & Schedule
                                    </button>
                                ) : (
                                    <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold flex items-center gap-2 border border-emerald-200">
                                        <CheckCircle size={18} /> Post Approved
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Workflow Status */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Daily Workflow</h3>
                        
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                            
                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-purple-500 text-white shadow shrink-0 z-10">
                                    <Sparkles size={14} />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-purple-100 bg-purple-50/50 shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-800">AI Generation</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">08:00 AM - Post drafted</p>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow shrink-0 z-10 ${postStatus !== 'pending' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    <CheckCircle size={14} />
                                </div>
                                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border shadow-sm ${postStatus !== 'pending' ? 'border-blue-100 bg-blue-50/50' : 'border-slate-100 bg-white'}`}>
                                    <h4 className={`text-sm font-bold ${postStatus !== 'pending' ? 'text-slate-800' : 'text-slate-500'}`}>Admin Review</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{postStatus !== 'pending' ? 'Approved by Admin' : 'Awaiting your approval'}</p>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow shrink-0 z-10 ${postStatus === 'published' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    <Send size={14} />
                                </div>
                                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border shadow-sm ${postStatus === 'published' ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}>
                                    <h4 className={`text-sm font-bold ${postStatus === 'published' ? 'text-slate-800' : 'text-slate-500'}`}>Publish to IG</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Scheduled for 12:00 PM</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
