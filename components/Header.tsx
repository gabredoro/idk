
import React from 'react';
import { Cable, Settings as SettingsIcon, CheckCircle2, Activity } from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
    settings: AppSettings;
    isDark: boolean;
    isTransmitting: boolean;
    isOutputReady: boolean;
    selectedOutputId: string;
    setSelectedOutputId: (id: string) => void;
    midiAccess: any;
    onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({
    settings,
    isDark,
    isTransmitting,
    isOutputReady,
    selectedOutputId,
    setSelectedOutputId,
    midiAccess,
    onOpenSettings
}) => {
    const style = {
        textPrimary: isDark ? 'text-slate-200' : 'text-slate-700',
        textSecondary: isDark ? 'text-slate-500' : 'text-slate-500',
        inputInset: isDark
            ? 'bg-[#050505] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border-b border-white/10'
            : 'bg-[#e2e8f0] shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border-b border-white/50',
    };

    return (
        <header className={`titlebar-drag h-20 shrink-0 z-50 flex items-center justify-between pl-28 pr-8 relative`}>
            <div className="flex items-center gap-4 no-drag group cursor-default">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:rotate-12
                         ${isDark ? 'bg-gradient-to-br from-[#333] to-[#111] border border-white/10' : 'bg-gradient-to-br from-white to-slate-200 border border-white/50'}`}>
                    <Cable style={{ color: settings.accentColor }} size={24} className="drop-shadow-md" />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black tracking-tighter uppercase drop-shadow-sm leading-none">
                        Midi<span style={{ color: settings.accentColor }}>Bridge</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold bg-black/10 px-1.5 py-0.5 rounded text-slate-500 uppercase tracking-widest border border-white/5">Native</span>
                    </div>
                </div>
            </div>

            {/* CENTER STATUS */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-10 no-drag select-none items-center justify-center">
                <div className="flex flex-col items-center gap-1.5 group">
                    <div className={`w-3 h-3 rounded-full transition-all duration-75 relative border ${isDark ? 'border-white/5' : 'border-black/10'}`}
                        style={{
                            backgroundColor: isTransmitting ? settings.accentColor : (isDark ? '#1a1a1a' : '#d4d4d4'),
                            boxShadow: isTransmitting
                                ? `0 0 12px ${settings.accentColor}, inset 0 1px 4px rgba(255,255,255,0.8)`
                                : 'inset 0 1px 3px rgba(0,0,0,0.6)'
                        }}>
                    </div>
                    <span className={`text-[9px] font-bold tracking-[0.2em] uppercase ${style.textSecondary} group-hover:text-current transition-colors`}>Signal</span>
                </div>
                <div className={`h-8 w-px ${isDark ? 'bg-white/5' : 'bg-black/5'}`}></div>
                <div className="flex flex-col items-center gap-1.5 group">
                    <div className={`w-3 h-3 rounded-full transition-all duration-500 relative border ${isDark ? 'border-white/5' : 'border-black/10'}`}
                        style={{
                            backgroundColor: isOutputReady ? settings.accentColor : (isDark ? '#1a1a1a' : '#d4d4d4'),
                            boxShadow: isOutputReady
                                ? `0 0 12px ${settings.accentColor}, inset 0 1px 4px rgba(255,255,255,0.8)`
                                : 'inset 0 1px 3px rgba(0,0,0,0.6)'
                        }}>
                    </div>
                    <span className={`text-[9px] font-bold tracking-[0.2em] uppercase ${style.textSecondary} group-hover:text-current transition-colors`}>Output</span>
                </div>
            </div>

            {/* RIGHT CONTROLS */}
            <div className="flex items-center gap-6 no-drag">
                <div className="flex flex-col items-end gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-right opacity-50">Target Output</label>
                    <div className={`relative h-9 w-48 rounded-lg overflow-hidden ${style.inputInset}`}>
                        <select
                            className={`w-full h-full bg-transparent text-xs font-bold px-3 outline-none cursor-pointer appearance-none text-right pr-9 uppercase ${style.textPrimary}`}
                            value={selectedOutputId}
                            onChange={(e) => setSelectedOutputId(e.target.value)}
                        >
                            <option value="">-- No Output --</option>
                            {midiAccess && Array.from(midiAccess.outputs.values()).map((output: any) => (
                                <option key={output.id} value={output.id}>{output.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                            {isOutputReady ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Activity size={14} />}
                        </div>
                    </div>
                </div>
                <button onClick={onOpenSettings}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg border
                   ${isDark ? 'bg-[#222] border-white/5 hover:bg-[#333]' : 'bg-white border-white hover:bg-slate-50'}`}>
                    <SettingsIcon size={20} className={style.textSecondary} />
                </button>
            </div>
        </header>
    );
};

export default Header;
