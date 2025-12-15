
import React from 'react';
import { Settings as SettingsIcon, X, Moon, Sun, Monitor, Terminal, ChevronRight, History } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    isDark: boolean;
    onClose: () => void;
    showChangelog: boolean;
    setShowChangelog: (show: boolean) => void;
    CHANGELOG: Array<{ version: string; date: string; changes: string[] }>;
    PRESET_COLORS: string[];
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    settings,
    setSettings,
    isDark,
    onClose,
    showChangelog,
    setShowChangelog,
    CHANGELOG,
    PRESET_COLORS
}) => {
    const style = {
        panelGlass: isDark
            ? 'bg-black/40 border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl'
            : 'bg-white/60 border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl',
        inputInset: isDark
            ? 'bg-[#050505] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border-b border-white/10'
            : 'bg-[#e2e8f0] shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border-b border-white/50',
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
            <div className={`w-full max-w-md rounded-[2rem] p-8 relative shadow-2xl border ${style.panelGlass} bg-opacity-90 overflow-hidden`}>
                <button onClick={() => { onClose(); setShowChangelog(false); }} className="absolute top-6 right-6 text-slate-500 hover:text-red-500 transition-colors z-20">
                    <X size={24} />
                </button>

                {!showChangelog ? (
                    <>
                        <h2 className={`text-sm font-black uppercase tracking-[0.25em] mb-8 flex items-center gap-3 border-b pb-4 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                            <SettingsIcon size={16} style={{ color: settings.accentColor }} /> System Config
                        </h2>

                        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase opacity-50 ml-1">Appearance</label>
                                <div className={`flex p-1.5 rounded-xl border ${style.inputInset}`}>
                                    {(['light', 'auto', 'dark'] as const).map(mode => (
                                        <button key={mode} onClick={() => setSettings(s => ({ ...s, themeMode: mode }))}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2
                              ${settings.themeMode === mode ? 'shadow-lg text-white' : 'opacity-50 hover:opacity-100'}`}
                                            style={settings.themeMode === mode ? { backgroundColor: settings.accentColor } : { color: isDark ? 'white' : 'black' }}>
                                            {mode === 'light' ? <Sun size={14} /> : mode === 'dark' ? <Moon size={14} /> : <Monitor size={14} />}
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase opacity-50 ml-1">System Accent</label>
                                <div className="flex flex-wrap gap-3">
                                    {PRESET_COLORS.map(color => (
                                        <button key={color} onClick={() => setSettings(s => ({ ...s, accentColor: color }))}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shadow-lg`}
                                            style={{
                                                backgroundColor: color,
                                                borderColor: settings.accentColor === color ? (isDark ? 'white' : 'black') : 'transparent',
                                                transform: settings.accentColor === color ? 'scale(1.1)' : 'scale(1)'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6 pt-4 border-t border-dashed border-white/10">
                                <div className="space-y-2">
                                    <div className="flex justify-between px-1"><label className="text-[10px] font-bold uppercase opacity-50">Deadzone (Drift Fix)</label><span className="text-[10px] font-mono font-bold opacity-80">{settings.deadzone.toFixed(2)}</span></div>
                                    <input type="range" min="0" max="0.5" step="0.01" value={settings.deadzone} onChange={(e) => setSettings(s => ({ ...s, deadzone: parseFloat(e.target.value) }))} className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-current" style={{ color: settings.accentColor }} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between px-1"><label className="text-[10px] font-bold uppercase opacity-50">Smoothing (Latency)</label><span className="text-[10px] font-mono font-bold opacity-80">{settings.smoothing.toFixed(2)}</span></div>
                                    <input type="range" min="0" max="0.9" step="0.05" value={settings.smoothing} onChange={(e) => setSettings(s => ({ ...s, smoothing: parseFloat(e.target.value) }))} className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-current" style={{ color: settings.accentColor }} />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <button onClick={() => setShowChangelog(true)} className={`w-full py-3 rounded-xl flex items-center justify-between px-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}>
                                    <span className="flex items-center gap-2"><Terminal size={14} className="opacity-50" /> Developer Log</span>
                                    <ChevronRight size={14} className="opacity-50" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 border-b pb-4 mb-4 border-dashed border-white/20">
                            <button onClick={() => setShowChangelog(false)} className="opacity-50 hover:opacity-100 hover:text-white transition-colors">
                                <History size={16} />
                            </button>
                            <h2 className="text-sm font-black uppercase tracking-[0.25em]">Version History</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin">
                            {CHANGELOG.map((log, i) => (
                                <div key={i} className="relative pl-4 border-l-2 border-white/10 pb-2">
                                    <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full ${i === 0 ? 'animate-pulse' : ''}`} style={{ backgroundColor: i === 0 ? settings.accentColor : '#666' }}></div>
                                    <div className="flex flex-col mb-2">
                                        <span className="text-lg font-black tracking-tight leading-none">v{log.version}</span>
                                        <span className="text-[10px] font-mono opacity-50">{log.date}</span>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {log.changes.map((change, idx) => (
                                            <li key={idx} className="text-[10px] font-bold opacity-70 flex items-start gap-2">
                                                <span className="opacity-30 mt-0.5">-</span> {change}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsModal;
