import React, { useEffect, useRef } from 'react';
import { Mic, X, MessageSquare, Sparkles, ChevronDown } from 'lucide-react';

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

const QUICK_QUERIES = [
  "Book Room 101 for John Doe from May 10th",
  "Is Room 102 free for tomorrow?",
  "Who is arriving today?",
  "Show me total revenue for this month"
];

// Animated waveform bars
function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-5">
      {[0.9, 0.5, 1, 0.6, 0.8, 0.4, 0.9, 0.7].map((scale, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full bg-gradient-to-t from-indigo-500 to-cyan-400 transition-all duration-300 ${active ? 'animate-pulse' : 'opacity-30'}`}
          style={{
            height: active ? `${scale * 20}px` : '4px',
            animationDuration: `${0.5 + i * 0.1}s`,
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}
    </div>
  );
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
  liveTranscript,
}: VoiceAssistantDrawerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const night = theme === 'night';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript, isOpen]);

  const hasActivity = isListening || isThinking;

  // --- Floating Action Button (closed state) ---
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="AI Assistant"
        className={`
          fixed bottom-6 right-6 z-[9999] w-16 h-16 md:w-14 md:h-14 rounded-2xl
          flex items-center justify-center
          shadow-[0_8px_32px_rgba(99,102,241,0.5)]
          transition-all duration-300 ease-out active:scale-95 hover:scale-105
          bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-500
          ${hasActivity ? 'ring-4 ring-cyan-400/40 animate-pulse' : ''}
        `}
      >
        <MessageSquare size={26} className="text-white drop-shadow" />

        {/* Subtle shimmer overlay */}
        <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />

        {/* Active dot indicator */}
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-slate-950 animate-bounce" />
        )}
      </button>
    );
  }

  // --- Full Drawer (open state) ---
  return (
    <div
      className={`
        fixed bottom-0 right-0 md:right-6 md:bottom-6
        w-full md:w-[420px]
        h-[72vh] md:h-[600px]
        z-[9999]
        flex flex-col
        rounded-t-[2.5rem] md:rounded-3xl
        overflow-hidden
        shadow-[0_-8px_60px_rgba(0,0,0,0.4)]
        transition-all duration-500 ease-out
        ${night
          ? 'bg-slate-950/95 border border-slate-800/60'
          : 'bg-white/96 border border-slate-200/60'}
        backdrop-blur-3xl
      `}
    >
      {/* ─── Header ─── */}
      <div className={`flex-shrink-0 flex items-center justify-between px-5 py-4 border-b ${night ? 'border-slate-800/50' : 'border-slate-200/50'}`}>
        <div className="flex items-center gap-3">
          {/* Animated icon */}
          <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/30`}>
            <MessageSquare size={18} className="text-white" />
            {hasActivity && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full border-2 border-slate-950 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Karuna AI
              </h3>
              <Sparkles size={11} className="text-cyan-400" />
            </div>
            <p className={`text-[10px] uppercase tracking-wider font-medium mt-0.5 ${isListening ? 'text-cyan-500' : isThinking ? 'text-indigo-400' : night ? 'text-slate-500' : 'text-slate-400'}`}>
              {isListening ? '● Listening' : isThinking ? '● Thinking' : 'Ready'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(false)}
            className={`p-2 rounded-xl transition-colors ${night ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
          >
            <ChevronDown size={20} />
          </button>
        </div>
      </div>

      {/* ─── Messages ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
        {/* Empty state */}
        {messages.length === 0 && !hasActivity && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-cyan-400/15 border border-indigo-500/20 flex items-center justify-center">
              <MessageSquare size={32} className="text-indigo-400 opacity-80" />
            </div>
            <div>
              <p className={`font-semibold text-base mb-1 ${night ? 'text-slate-300' : 'text-slate-700'}`}>
                Ask me anything
              </p>
              <p className={`text-sm ${night ? 'text-slate-500' : 'text-slate-400'}`}>
                Tap a quick query below or press the mic to speak.
              </p>
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.type === 'ai' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mt-0.5 shadow shadow-indigo-500/20">
                <Sparkles size={12} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                ${msg.type === 'user'
                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-sm'
                  : night
                    ? 'bg-slate-800/80 text-slate-200 rounded-tl-sm border border-slate-700/40'
                    : 'bg-slate-100/90 text-slate-700 rounded-tl-sm border border-slate-200/60'}
              `}
            >
              {msg.text}
              {msg.action && (
                <button
                  onClick={msg.action.onClick}
                  className="mt-2.5 block text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors border border-cyan-500/20"
                >
                  {msg.action.label}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Live state bubble */}
        {isListening && (
          <div className="flex justify-start gap-2">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mt-0.5">
              <Sparkles size={12} className="text-white" />
            </div>
            <div className={`max-w-[78%] rounded-2xl rounded-tl-sm px-4 py-3 border ${night ? 'bg-slate-800/80 border-cyan-500/25 text-slate-300' : 'bg-slate-100/90 border-cyan-500/25 text-slate-600'}`}>
              <p className="text-sm italic opacity-75 mb-2">{liveTranscript || 'Listening to your voice…'}</p>
              <Waveform active />
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex justify-start gap-2">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mt-0.5">
              <Sparkles size={12} className="text-white animate-spin" />
            </div>
            <div className={`rounded-2xl rounded-tl-sm px-4 py-3 border ${night ? 'bg-slate-800/80 border-indigo-500/20' : 'bg-slate-100/90 border-indigo-500/20'}`}>
              <div className="flex gap-1.5 items-center h-4">
                {[0, 150, 300].map((delay) => (
                  <div
                    key={delay}
                    className="w-2 h-2 rounded-full bg-gradient-to-b from-indigo-400 to-cyan-400 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Footer ─── */}
      <div className={`flex-shrink-0 px-4 pb-5 pt-3 border-t ${night ? 'border-slate-800/50' : 'border-slate-200/50'}`}>
        {/* Quick queries — show always at the bottom */}
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => onQuickQuery(q)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 border
                ${night
                  ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-indigo-500/15 hover:text-cyan-400 hover:border-indigo-500/40'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300'}
              `}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Mic button row */}
        <div className="flex items-center justify-center">
          <button
            onClick={onToggleListening}
            className={`
              relative w-14 h-14 rounded-2xl flex items-center justify-center
              transition-all duration-300 ease-out active:scale-90 hover:scale-105
              shadow-lg
              ${isListening
                ? 'bg-gradient-to-br from-red-500 to-pink-600 shadow-red-500/40'
                : 'bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-indigo-500/30'}
            `}
          >
            {isListening && (
              <div className="absolute inset-0 rounded-2xl bg-red-400/20 animate-ping" />
            )}
            {isListening ? <Mic size={24} className="text-white relative z-10" /> : <Sparkles size={24} className="text-white relative z-10" />}
          </button>
        </div>

        <p className={`text-center text-[10px] mt-2 tracking-wide ${night ? 'text-slate-600' : 'text-slate-400'}`}>
          {isListening ? 'Speaking… stops automatically when done' : 'Tap to speak'}
        </p>
      </div>
    </div>
  );
}
