import React, { useState, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import {
  Edit3, Eye, Download, Plus, Trash2, GripVertical, Save,
  Shield, Clock, Flame, Volume2, Dog, Cigarette, Users, Wifi,
  CheckCircle, AlignLeft, ChevronDown, ChevronUp, PenLine
} from 'lucide-react';

interface RuleItem {
  id: string;
  text: string;
  icon: string;
  category: string;
}

interface SignatureConfig {
  ownerName: string;
  ownerDesignation: string;
  showGuestSignature: boolean;
  showDate: boolean;
  showRoomNumber: boolean;
  footerNote: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  shield: <Shield size={18} />,
  clock: <Clock size={18} />,
  flame: <Flame size={18} />,
  volume: <Volume2 size={18} />,
  dog: <Dog size={18} />,
  cigarette: <Cigarette size={18} />,
  users: <Users size={18} />,
  wifi: <Wifi size={18} />,
  check: <CheckCircle size={18} />,
  note: <AlignLeft size={18} />,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);
const CATEGORIES = ['General', 'Check-in / Check-out', 'Noise & Conduct', 'Safety', 'Amenities'];

const DEFAULT_RULES: RuleItem[] = [
  { id: '1', category: 'Check-in / Check-out', icon: 'clock', text: 'Check-in time is 2:00 PM. Check-out time is 11:00 AM.' },
  { id: '2', category: 'General', icon: 'users', text: 'Maximum occupancy must not exceed the number of guests registered at check-in.' },
  { id: '3', category: 'Noise & Conduct', icon: 'volume', text: 'Quiet hours are from 10:00 PM to 8:00 AM. Please be considerate of other guests.' },
  { id: '4', category: 'Safety', icon: 'cigarette', text: 'Smoking is strictly prohibited in all indoor areas. Designated smoking areas are available outside.' },
  { id: '5', category: 'Safety', icon: 'flame', text: 'Do not tamper with fire safety equipment. In case of emergency, use the nearest emergency exit.' },
  { id: '6', category: 'General', icon: 'dog', text: 'Pets are not permitted on the premises unless prior written approval has been obtained.' },
  { id: '7', category: 'Amenities', icon: 'wifi', text: 'Complimentary WiFi is available. Password will be provided at check-in. Please do not share with non-guests.' },
  { id: '8', category: 'General', icon: 'shield', text: 'Management is not responsible for loss or damage to personal belongings. Please use in-room safes for valuables.' },
];

const DEFAULT_SIG: SignatureConfig = {
  ownerName: 'Property Manager',
  ownerDesignation: 'Karuna Villa Management',
  showGuestSignature: true,
  showDate: true,
  showRoomNumber: true,
  footerNote: 'By signing below, the guest acknowledges they have read, understood, and agree to abide by the house rules listed above.',
};

type PreviewMode = 'modern' | 'classic' | 'minimal';
const PREVIEW_MODES: { id: PreviewMode; label: string }[] = [
  { id: 'modern', label: 'Modern' },
  { id: 'classic', label: 'Classic' },
  { id: 'minimal', label: 'Minimal' },
];

export default function HouseRulesPage() {
  const { theme } = useTheme();
  const night = theme === 'night';
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('modern');
  const [rules, setRules] = useState<RuleItem[]>(() => {
    const saved = localStorage.getItem('karuna_house_rules');
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  const [hotelName, setHotelName] = useState(() => localStorage.getItem('karuna_hotel_name') || 'Karuna Villa');
  const [tagline, setTagline] = useState(() => localStorage.getItem('karuna_tagline') || 'A place to feel at home.');
  const [sig, setSig] = useState<SignatureConfig>(() => {
    const saved = localStorage.getItem('karuna_sig_config');
    return saved ? JSON.parse(saved) : DEFAULT_SIG;
  });
  const [savedOk, setSavedOk] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    items: rules.filter(r => r.category === cat),
  })).filter(g => g.items.length > 0);

  const addRule = () => {
    setRules(prev => [...prev, { id: Date.now().toString(), text: 'New rule — click to edit.', icon: 'check', category: 'General' }]);
  };

  const updateRule = (id: string, patch: Partial<RuleItem>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const deleteRule = (id: string) => setRules(prev => prev.filter(r => r.id !== id));

  const saveAll = () => {
    localStorage.setItem('karuna_house_rules', JSON.stringify(rules));
    localStorage.setItem('karuna_hotel_name', hotelName);
    localStorage.setItem('karuna_tagline', tagline);
    localStorage.setItem('karuna_sig_config', JSON.stringify(sig));
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2000);
  };

  const handlePrint = () => {
    const printContent = printRef.current?.cloneNode(true);
    if (!printContent) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const title = w.document.createElement('title');
    title.textContent = `${hotelName} - House Rules`;
    const style = w.document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Georgia', serif; color: #1e293b; background: #fff; padding: 48px; }
    `;
    w.document.head.replaceChildren(title, style);
    w.document.body.replaceChildren(printContent);
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  const inputCls = `w-full px-3 py-2 rounded-lg text-sm border outline-none transition ${night ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-400'}`;
  const cardCls = `p-6 rounded-2xl border ${night ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`;
  const labelCls = `text-xs font-semibold block mb-1 ${night ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${night ? 'text-white' : 'text-slate-900'}`}>House Rules</h1>
          <p className={`text-sm mt-0.5 ${night ? 'text-slate-400' : 'text-slate-500'}`}>Edit, preview, and print your guest house rules with signature.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveAll} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${savedOk ? 'bg-emerald-500 text-white' : night ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-900 hover:bg-slate-700 text-white'}`}>
            <Save size={16} /> {savedOk ? 'Saved!' : 'Save All'}
          </button>
          <button onClick={handlePrint} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${night ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <Download size={16} /> Print / Download
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex items-center gap-1 p-1 rounded-xl w-fit ${night ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'}`}>
        {[{ id: 'edit', icon: <Edit3 size={15} />, label: 'Edit' }, { id: 'preview', icon: <Eye size={15} />, label: 'Preview' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? (night ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-900 shadow') : (night ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'edit' && (
        <div className="space-y-6">
          {/* Property Info */}
          <div className={cardCls}>
            <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${night ? 'text-slate-400' : 'text-slate-500'}`}>Property Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>Property Name</label><input value={hotelName} onChange={e => setHotelName(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Tagline / Subtitle</label><input value={tagline} onChange={e => setTagline(e.target.value)} className={inputCls} /></div>
            </div>
          </div>

          {/* Rules List */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-bold uppercase tracking-widest ${night ? 'text-slate-400' : 'text-slate-500'}`}>Rules ({rules.length})</h2>
              <button onClick={addRule} className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 transition">
                <Plus size={14} /> Add Rule
              </button>
            </div>
            <div className="space-y-2">
              {rules.map(rule => (
                <div key={rule.id} className={`rounded-xl border transition-all ${night ? 'border-slate-800 bg-slate-800/40' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}>
                    <GripVertical size={14} className={night ? 'text-slate-600' : 'text-slate-300'} />
                    <span className={night ? 'text-slate-400' : 'text-slate-500'}>{ICON_MAP[rule.icon]}</span>
                    <p className={`flex-1 text-sm truncate ${night ? 'text-slate-300' : 'text-slate-700'}`}>{rule.text}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${night ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>{rule.category}</span>
                    {expandedId === rule.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    <button onClick={e => { e.stopPropagation(); deleteRule(rule.id); }} className="text-red-400 hover:text-red-500 transition p-1"><Trash2 size={14} /></button>
                  </div>
                  {expandedId === rule.id && (
                    <div className={`px-4 pb-4 pt-2 border-t space-y-3 ${night ? 'border-slate-700' : 'border-slate-200'}`}>
                      <div><label className={labelCls}>Rule Text</label>
                        <textarea value={rule.text} onChange={e => updateRule(rule.id, { text: e.target.value })} rows={3} className={`${inputCls} resize-none`} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelCls}>Category</label>
                          <select value={rule.category} onChange={e => updateRule(rule.id, { category: e.target.value })} className={inputCls}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select></div>
                        <div><label className={labelCls}>Icon</label>
                          <select value={rule.icon} onChange={e => updateRule(rule.id, { icon: e.target.value })} className={inputCls}>
                            {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                          </select></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Signature Section */}
          <div className={cardCls}>
            <div className="flex items-center gap-2 mb-5">
              <PenLine size={16} className={night ? 'text-blue-400' : 'text-blue-600'} />
              <h2 className={`text-sm font-bold uppercase tracking-widest ${night ? 'text-slate-400' : 'text-slate-500'}`}>Signature Section</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div><label className={labelCls}>Owner / Manager Name</label><input value={sig.ownerName} onChange={e => setSig(s => ({ ...s, ownerName: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Designation / Company</label><input value={sig.ownerDesignation} onChange={e => setSig(s => ({ ...s, ownerDesignation: e.target.value }))} className={inputCls} /></div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Acknowledgement Footer Note</label>
              <textarea value={sig.footerNote} onChange={e => setSig(s => ({ ...s, footerNote: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
            </div>
            <div className="flex flex-wrap gap-4">
              {[
                { key: 'showGuestSignature', label: 'Guest Signature Field' },
                { key: 'showDate', label: 'Date Field' },
                { key: 'showRoomNumber', label: 'Room Number Field' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sig[key as keyof SignatureConfig] as boolean}
                    onChange={e => setSig(s => ({ ...s, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <span className={`text-sm font-medium ${night ? 'text-slate-300' : 'text-slate-700'}`}>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'preview' && (
        <div className="space-y-4">
          <div className={`flex items-center gap-1 p-1 rounded-xl w-fit ${night ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'}`}>
            {PREVIEW_MODES.map(m => (
              <button key={m.id} onClick={() => setPreviewMode(m.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${previewMode === m.id ? (night ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-900 shadow') : (night ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="overflow-auto rounded-2xl border shadow-xl" style={{ minHeight: '600px', background: '#f8fafc' }}>
            <div ref={printRef}>
              <PreviewCanvas mode={previewMode} rules={rules} grouped={grouped} hotelName={hotelName} tagline={tagline} sig={sig} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SignatureBlock({ sig, mode }: { sig: SignatureConfig; mode: PreviewMode }) {
  const isModern = mode === 'modern';
  const isClassic = mode === 'classic';

  const lineStyle: React.CSSProperties = {
    borderBottom: `1px solid ${isClassic ? '#78716c' : '#cbd5e1'}`,
    minWidth: '160px',
    marginTop: '32px',
    marginBottom: '4px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: isClassic ? '#78716c' : '#94a3b8',
    fontStyle: isClassic ? 'italic' : 'normal',
    letterSpacing: '0.05em',
  };

  const containerStyle: React.CSSProperties = {
    marginTop: '48px',
    paddingTop: '24px',
    borderTop: `${isClassic ? '2px solid #1e293b' : '1px solid #e2e8f0'}`,
  };

  return (
    <div style={containerStyle}>
      {/* Footer note */}
      {sig.footerNote && (
        <p style={{ fontSize: '12px', color: isClassic ? '#78716c' : '#64748b', fontStyle: isClassic ? 'italic' : 'normal', marginBottom: '32px', lineHeight: '1.6', textAlign: isClassic ? 'center' : 'left' }}>
          {sig.footerNote}
        </p>
      )}

      {/* Signature fields row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '48px', justifyContent: isClassic ? 'space-between' : 'flex-start' }}>
        {/* Owner signature */}
        <div>
          <div style={lineStyle} />
          <div style={labelStyle}>{sig.ownerName}</div>
          <div style={{ ...labelStyle, fontWeight: '600', color: isClassic ? '#44403c' : '#475569' }}>{sig.ownerDesignation}</div>
        </div>

        {/* Guest signature */}
        {sig.showGuestSignature && (
          <div>
            <div style={lineStyle} />
            <div style={labelStyle}>Guest Signature</div>
            <div style={{ ...labelStyle, fontWeight: '600', color: isClassic ? '#44403c' : '#475569' }}>Name: _________________________</div>
          </div>
        )}

        {/* Extra fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sig.showDate && (
            <div>
              <div style={{ ...lineStyle, marginTop: '8px', minWidth: '120px' }} />
              <div style={labelStyle}>Date</div>
            </div>
          )}
          {sig.showRoomNumber && (
            <div>
              <div style={{ ...lineStyle, marginTop: '8px', minWidth: '80px' }} />
              <div style={labelStyle}>Room No.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewCanvas({ mode, rules, grouped, hotelName, tagline, sig }: {
  mode: PreviewMode; rules: RuleItem[]; grouped: { category: string; items: RuleItem[] }[]; hotelName: string; tagline: string; sig: SignatureConfig;
}) {
  if (mode === 'modern') return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#fff', padding: '48px', minHeight: '800px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #0f172a', paddingBottom: '24px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.3em', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Welcome to</div>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px', margin: '0 0 6px' }}>{hotelName}</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0, fontStyle: 'italic' }}>{tagline}</p>
        <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '20px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>House Rules & Guidelines</div>
      </div>
      {grouped.map(group => (
        <div key={group.category} style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px', borderLeft: '3px solid #3b82f6', paddingLeft: '10px' }}>
            {group.category}
          </div>
          {group.items.map(rule => (
            <div key={rule.id} style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 16px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }}>•</span>
              <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>{rule.text}</span>
            </div>
          ))}
        </div>
      ))}
      <SignatureBlock sig={sig} mode={mode} />
    </div>
  );

  if (mode === 'classic') return (
    <div style={{ fontFamily: "'Georgia', serif", background: '#fffdf7', padding: '56px', minHeight: '800px', border: '1px solid #d1c7a3' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{hotelName}</h1>
        <p style={{ fontSize: '13px', color: '#78716c', margin: '0 0 20px', fontStyle: 'italic' }}>{tagline}</p>
        <div style={{ borderTop: '3px double #1e293b', borderBottom: '3px double #1e293b', padding: '8px 0', fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1e293b' }}>House Rules</div>
      </div>
      {grouped.map(group => (
        <div key={group.category} style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '2px solid #1e293b', marginBottom: '12px', paddingBottom: '4px', color: '#1e293b' }}>
            {group.category}
          </div>
          {group.items.map((rule, i) => (
            <div key={rule.id} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: '1px dashed #d6d3c4' }}>
              <span style={{ fontWeight: 'bold', color: '#78716c', minWidth: '20px' }}>{i + 1}.</span>
              <span style={{ fontSize: '13px', color: '#44403c', lineHeight: '1.7' }}>{rule.text}</span>
            </div>
          ))}
        </div>
      ))}
      <SignatureBlock sig={sig} mode={mode} />
    </div>
  );

  return (
    <div style={{ fontFamily: "'Helvetica Neue', 'Arial', sans-serif", background: '#fff', padding: '48px', minHeight: '800px' }}>
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>{hotelName}</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' }}>{tagline}</p>
        <div style={{ width: '40px', height: '3px', background: '#0f172a' }} />
      </div>
      <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>House Rules</div>
      {rules.map((rule, i) => (
        <div key={rule.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', minWidth: '20px', paddingTop: '2px', fontWeight: '600' }}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>{rule.text}</span>
        </div>
      ))}
      <SignatureBlock sig={sig} mode={mode} />
    </div>
  );
}
