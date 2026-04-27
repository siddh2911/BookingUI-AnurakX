import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Instagram, CheckCircle, RefreshCw, Clock, Image as ImageIcon, Send, Upload, Undo2, XCircle } from 'lucide-react';

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
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Sparkles className="text-purple-500" /> AI Marketing Assistant
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review and approve daily automated Instagram posts.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Post Preview Card */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                                <Instagram className="text-pink-600" /> Today's Suggested Post
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>

                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
                                <RefreshCw className="w-8 h-8 animate-spin mb-4 text-purple-500" />
                                <p className="font-medium">AI is crafting the perfect post...</p>
                            </div>
                        ) : currentPost ? (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Image Preview Area */}
                                <div className="space-y-3">
                                    <div className="aspect-square bg-slate-100 dark:bg-slate-900/50 rounded-lg flex flex-col items-center justify-center p-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 relative overflow-hidden group transition-colors">
                                        {currentPost.imageUrl && !isGeneratingImage ? (
                                            <img src={currentPost.imageUrl} alt="Generated Preview" className="absolute inset-0 w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
                                                {isGeneratingImage ? (
                                                    <div className="flex flex-col items-center">
                                                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nano Banana</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Generating masterpiece...</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No Image Generated Yet</p>
                                                    </>
                                                )}
                                            </>
                                        )}
                                        
                                        {!isGeneratingImage && (
                                            <div className={`absolute inset-x-0 bottom-0 p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 transition-transform ${currentPost.imageUrl ? 'translate-y-full group-hover:translate-y-0' : ''}`}>
                                                <button 
                                                    onClick={handleGenerateImage}
                                                    className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md text-xs font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
                                                >
                                                    <Sparkles size={14} /> Generate with Nano Banana
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Image Prompt (Nano Banana)</label>
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-[10px] flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-md hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                                            >
                                                <Upload size={12} /> {referenceImage ? 'Change Ref' : 'Add Ref Image'}
                                            </button>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </div>
                                        {referenceImage && (
                                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md flex items-center gap-1">
                                                <CheckCircle size={10} /> Ref: {referenceImage}
                                            </div>
                                        )}
                                        <textarea 
                                            value={currentPost.imagePrompt}
                                            onChange={(e) => setCurrentPost({ ...currentPost, imagePrompt: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none h-24"
                                            disabled={postStatus !== 'pending' && postStatus !== 'rejected'}
                                        />
                                    </div>
                                </div>

                                {/* Caption Area */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Caption</label>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-sm text-slate-800 dark:text-slate-300 whitespace-pre-wrap transition-colors">
                                            {currentPost.caption}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Suggested Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {currentPost.tags.map((tag: string, idx: number) => (
                                                <span key={idx} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium border border-blue-100 dark:border-blue-500/20">
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
                            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
                                <button 
                                    onClick={generateNewPost}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
                                    disabled={postStatus === 'approved' || postStatus === 'scheduled'}
                                >
                                    <RefreshCw size={16} /> Regenerate
                                </button>
                                
                                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
                                    {(postStatus === 'scheduled' || postStatus === 'published') && (
                                        <button 
                                            onClick={handleRevert}
                                            className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 border border-transparent hover:border-purple-200 dark:hover:border-purple-500/30"
                                        >
                                            <Undo2 size={16} /> Revert
                                        </button>
                                    )}
                                    {postStatus === 'pending' || postStatus === 'rejected' ? (
                                        <>
                                            {postStatus !== 'rejected' && (
                                                <button 
                                                    onClick={handleReject}
                                                    className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Discard
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleApprove}
                                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-bold shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center gap-2"
                                            >
                                                <CheckCircle size={18} /> {postStatus === 'rejected' ? 'Re-Approve' : 'Approve & Schedule'}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-bold flex items-center gap-2 border border-emerald-200 dark:border-emerald-500/30">
                                            <CheckCircle size={18} /> Post Approved
                                        </div>
                                    )}
                                    {postStatus === 'rejected' && (
                                        <div className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold flex items-center gap-2 border border-red-200 dark:border-red-500/30">
                                            Discarded
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Workflow Status */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Daily Workflow</h3>
                        
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                            
                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-purple-500 text-white shadow shrink-0 z-10 transition-colors">
                                    <Sparkles size={14} />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-purple-100 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-500/5 shadow-sm transition-colors">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">AI Generation</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">08:00 AM - Post drafted</p>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow shrink-0 z-10 transition-colors ${postStatus === 'scheduled' || postStatus === 'published' ? 'bg-blue-500 text-white' : postStatus === 'rejected' ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                    {postStatus === 'rejected' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                </div>
                                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border shadow-sm transition-colors ${postStatus === 'scheduled' || postStatus === 'published' ? 'border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5' : postStatus === 'rejected' ? 'border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                                    <h4 className={`text-sm font-bold ${postStatus === 'scheduled' || postStatus === 'published' ? 'text-slate-800 dark:text-slate-200' : postStatus === 'rejected' ? 'text-red-700 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>Admin Review</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{postStatus === 'scheduled' || postStatus === 'published' ? 'Approved by Admin' : postStatus === 'rejected' ? 'Discarded' : 'Awaiting your approval'}</p>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow shrink-0 z-10 transition-colors ${postStatus === 'published' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                    <Send size={14} />
                                </div>
                                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border shadow-sm transition-colors ${postStatus === 'published' ? 'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                                    <h4 className={`text-sm font-bold ${postStatus === 'published' ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>Publish to IG</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Scheduled for 12:00 PM</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
