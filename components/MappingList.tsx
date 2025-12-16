
import React from 'react';
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import { AppSettings, MidiMapping, LogEntry, XboxState, ControllerInputType, MidiMessageType } from '../types';
import { XBOX_BUTTON_NAMES } from '../constants';

interface MappingListProps {
    activeTab: 'mappings' | 'logs' | 'debug';
    setActiveTab: (tab: 'mappings' | 'logs' | 'debug') => void;
    mappings: MidiMapping[];
    setMappings: React.Dispatch<React.SetStateAction<MidiMapping[]>>;
    logs: LogEntry[];
    xboxState: XboxState;
    settings: AppSettings;
    isDark: boolean;
    addNewMapping: () => void;
    resetMappings: () => void;
    updateMapping: (id: string, field: keyof MidiMapping, value: any) => void;
    deleteMapping: (id: string) => void;
}

const MappingList: React.FC<MappingListProps> = ({
    activeTab,
    setActiveTab,
    mappings,
    logs,
    xboxState,
    settings,
    isDark,
    addNewMapping,
    resetMappings,
    updateMapping,
    deleteMapping
}) => {
    const style = {
        panelGlass: isDark
            ? 'bg-black/40 border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl'
            : 'bg-white/60 border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl',
        inputInset: isDark
            ? 'bg-[#050505] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border-b border-white/10'
            : 'bg-[#e2e8f0] shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border-b border-white/50',
        textPrimary: isDark ? 'text-slate-200' : 'text-slate-700',
        card: isDark
            ? 'bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] border-t border-white/10 shadow-lg'
            : 'bg-gradient-to-b from-[#ffffff] to-[#f8fafc] border-t border-white/80 shadow-md',
    };

    return (
        <div className="flex-1 flex flex-col gap-4">
            <div className="flex gap-4 px-4">
                {(['mappings', 'logs', 'debug'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 shadow-lg border
                     ${activeTab === tab
                                ? `${isDark ? 'bg-[#2a2a2a] border-white/10 text-white' : 'bg-white border-white text-slate-800'} translate-y-0`
                                : `${isDark ? 'bg-transparent border-transparent text-slate-600' : 'bg-transparent border-transparent text-slate-400'} hover:bg-white/5 translate-y-1`}`}
                    >
                        {tab === 'mappings' ? 'Patch Bay' : tab === 'logs' ? 'Event Log' : 'Raw Data'}
                    </button>
                ))}
            </div>

            <div className={`flex-1 rounded-[2.5rem] flex flex-col overflow-hidden border relative transition-colors duration-500 ${style.panelGlass}`}>
                {activeTab === 'mappings' && (
                    <div className={`h-16 flex items-center justify-between px-8 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Active Patches</span>
                            <div className={`px-3 py-1 rounded-md font-mono text-lg font-black tracking-tight border flex items-center justify-center min-w-[3rem]
                           ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white/60 border-black/5 text-slate-800'} shadow-inner`}>
                                {mappings.length}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={resetMappings} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors"><RefreshCw size={14} /></button>
                            <button onClick={addNewMapping} className={`flex items-center gap-2 px-5 py-2 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all`}
                                style={{ backgroundColor: settings.accentColor }}>
                                <Plus size={14} strokeWidth={3} className={isDark ? 'text-black' : 'text-white'} />
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-black' : 'text-white'}`}>New Patch</span>
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    {activeTab === 'mappings' ? (
                        <div className="space-y-3">
                            {mappings.map(map => (
                                <div key={map.id} className={`group relative rounded-2xl p-3 flex items-center gap-4 transition-all hover:-translate-y-0.5 duration-300 ${style.card}`}>
                                    <div className="w-1.5 h-10 rounded-full opacity-80 shadow-sm" style={{ backgroundColor: settings.accentColor }}></div>
                                    <div className="flex flex-col w-36">
                                        <label className="text-[8px] font-bold uppercase opacity-40 mb-1 ml-1">Input Source</label>
                                        <div className={`h-8 rounded-lg flex items-center px-2 relative ${style.inputInset}`}>
                                            <select
                                                className={`w-full bg-transparent text-[10px] font-bold uppercase outline-none appearance-none cursor-pointer ${style.textPrimary}`}
                                                value={`${map.inputType}-${map.controllerInputIndex}`}
                                                onChange={(e) => {
                                                    const [type, idx] = e.target.value.split('-');
                                                    updateMapping(map.id, 'inputType', type as ControllerInputType);
                                                    updateMapping(map.id, 'controllerInputIndex', parseInt(idx));
                                                }}
                                            >
                                                {/* Only showing Buttons now */}
                                                <optgroup label="Buttons">{XBOX_BUTTON_NAMES.map((n, i) => <option key={i} value={`BUTTON-${i}`}>{n}</option>)}</optgroup>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="w-24">
                                        <label className="text-[8px] font-bold uppercase opacity-40 mb-1 ml-1">Midi Type</label>
                                        <div className={`h-8 rounded-lg flex items-center px-2 relative ${style.inputInset}`}>
                                            <select
                                                className={`w-full bg-transparent text-[10px] font-bold uppercase outline-none cursor-pointer ${style.textPrimary}`}
                                                value={map.midiType}
                                                onChange={(e) => updateMapping(map.id, 'midiType', e.target.value)}
                                            >
                                                <option value={MidiMessageType.NOTE_ON}>NOTE</option>
                                                <option value={MidiMessageType.CC}>CC</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="w-20">
                                        <label className="text-[8px] font-bold uppercase opacity-40 mb-1 ml-1">Value</label>
                                        <div className={`h-8 rounded-lg flex items-center px-2 relative ${style.inputInset}`}>
                                            <input
                                                type="number"
                                                className="w-full bg-transparent text-xs font-mono font-bold text-center outline-none"
                                                style={{ color: settings.accentColor }}
                                                value={map.targetNumber}
                                                onChange={(e) => updateMapping(map.id, 'targetNumber', parseInt(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[8px] font-bold uppercase opacity-40 mb-1 ml-1">Track Label</label>
                                        <div className={`h-8 rounded-lg flex items-center px-3 relative ${style.inputInset}`}>
                                            <input
                                                type="text"
                                                className={`w-full bg-transparent text-[10px] font-bold uppercase outline-none placeholder-opacity-30 ${style.textPrimary}`}
                                                value={map.label}
                                                placeholder="UNTITLED"
                                                onChange={(e) => updateMapping(map.id, 'label', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button onClick={() => deleteMapping(map.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : activeTab === 'logs' ? (
                        <div className="font-mono text-[10px] space-y-2">
                            {logs.map(log => (
                                <div key={log.id} className="flex gap-4 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="opacity-40 w-16">{log.timestamp}</span>
                                    <span className={log.type === 'error' ? 'text-red-500' : log.type === 'midi' ? 'text-emerald-500' : 'opacity-70'}>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // DEBUG VIEW (Removed Raw Axes)
                        <div className="grid grid-cols-1 gap-4 font-mono text-[10px]">
                            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                                <h3 className="font-bold uppercase opacity-50 mb-4">Buttons State</h3>
                                <div className="grid grid-cols-4 gap-4">
                                    {xboxState.buttons.map((b, i) => (
                                        <div key={i} className={`flex items-center gap-2 ${b ? 'opacity-100 text-emerald-400' : 'opacity-30'}`}>
                                            <div className={`w-2 h-2 rounded-full ${b ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>
                                            <span>{XBOX_BUTTON_NAMES[i] || `B${i}`}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MappingList;
