import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  action?: { label: string; onClick: () => void };
}

interface VoiceAssistantDrawerProps {
  isListening: boolean;
  isThinking: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onToggleListening: () => void;
  messages: Message[];
  onQuickQuery: (query: string) => void;
  theme: string;
  liveTranscript: string;
}

export default function VoiceAssistantDrawer({
  isListening,
  isThinking,
  isOpen,
  setIsOpen,
  onToggleListening,
  messages,
  onQuickQuery,
  theme,
  liveTranscript
}: VoiceAssistantDrawerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, liveTranscript, isOpen]);

  // If closed but listening/thinking, show floating button with animation
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-[9999] p-5 md:p-4 rounded-full shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-500 overflow-hidden group
          ${isListening ? 'scale-110 ring-4 ring-cyan-400/30' : 'hover:scale-105'}
          ${theme === 'night' ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}
        `}
      >
        <div className="relative z-10">
          <Mic size={24} className={isListening ? 'text-cyan-400 animate-pulse' : 'text-indigo-500 group-hover:text-cyan-400'} />
        </div>
        
        {/* Gemini Aura */}
        <div className={`absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-cyan-400/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
        {isListening && (
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/40 to-cyan-400/40 animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <div className={`fixed bottom-0 right-0 md:right-6 md:bottom-6 w-full md:w-[400px] h-[70vh] md:h-[600px] z-[9999] flex flex-col rounded-t-[2.5rem] md:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-3xl transition-all duration-500 ease-out transform translate-y-0
      ${theme === 'night' ? 'bg-slate-950/90 border border-slate-800/50' : 'bg-white/95 border border-slate-200/50'}
    `}>
      {/* Header */}
      <div className={`p-4 flex justify-between items-center border-b backdrop-blur-md z-10
        ${theme === 'night' ? 'border-slate-800/50 bg-slate-900/50' : 'border-slate-200/50 bg-white/50'}
      `}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Mic size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">AI Assistant</h3>
            <p className={`text-[10px] uppercase tracking-widest font-semibold ${isListening ? 'text-cyan-500 animate-pulse' : 'text-slate-500'}`}>
              {isListening ? 'Listening...' : isThinking ? 'Thinking...' : 'Idle'}
            </p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className={`p-2 rounded-full transition-colors ${theme === 'night' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
          <ChevronDown size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 opacity-60">
            <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-tr from-indigo-500/20 to-cyan-400/20 flex items-center justify-center">
              <Mic size={24} className="text-indigo-400" />
            </div>
            <p className={`text-sm ${theme === 'night' ? 'text-slate-400' : 'text-slate-500'}`}>
              Tap the microphone and ask me anything about the villa.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm
              ${msg.type === 'user' 
                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm' 
                : theme === 'night' 
                  ? 'bg-slate-800/80 text-slate-200 rounded-bl-sm border border-slate-700/50' 
                  : 'bg-white/90 text-slate-700 rounded-bl-sm border border-slate-200/50'}
            `}>
              <p className="text-sm leading-relaxed">{msg.text}</p>
              {msg.action && (
                <button 
                  onClick={msg.action.onClick}
                  className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 transition-colors border border-cyan-500/20"
                >
                  {msg.action.label}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Live Transcript / Thinking State */}
        {(isListening || isThinking) && (
          <div className="flex justify-start">
            <div className={`max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border
              ${theme === 'night' ? 'bg-slate-800/80 border-cyan-500/30' : 'bg-white/90 border-cyan-500/30'}
            `}>
              {isThinking ? (
                <div className="flex gap-1.5 items-center h-5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className={`text-sm italic ${theme === 'night' ? 'text-slate-300' : 'text-slate-600'}`}>
                    {liveTranscript || 'Listening...'}
                  </p>
                  {/* Organic Waveform Simulation */}
                  <div className="flex items-center gap-1 h-3 mt-2 opacity-70">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="w-1 bg-gradient-to-t from-indigo-500 to-cyan-400 rounded-full animate-pulse" 
                        style={{ 
                          height: `${Math.floor(Math.random() * 60 + 40)}%`,
                          animationDuration: `${0.5 + Math.random()}s`
                        }} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input / Action Area */}
      <div className={`p-4 border-t backdrop-blur-md z-10
        ${theme === 'night' ? 'border-slate-800/50 bg-slate-900/50' : 'border-slate-200/50 bg-white/50'}
      `}>
        {/* Quick Queries */}
        {!isListening && !isThinking && messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {["Today's Check-ins", "Rooms under maintenance", "Total revenue today"].map((query) => (
              <button
                key={query}
                onClick={() => onQuickQuery(query)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors border
                  ${theme === 'night' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-cyan-400' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-cyan-600'}
                `}
              >
                {query}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={onToggleListening}
            className={`relative p-4 rounded-full overflow-hidden group shadow-lg transition-transform hover:scale-105 active:scale-95
              ${isListening ? 'bg-slate-900' : 'bg-gradient-to-r from-indigo-500 to-cyan-500'}
            `}
          >
            {isListening && (
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 opacity-20 animate-pulse" />
            )}
            <Mic size={24} className={isListening ? 'text-red-400 relative z-10' : 'text-white relative z-10'} />
          </button>
        </div>
      </div>
    </div>
  );
}
