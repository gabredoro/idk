
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Gamepad2 } from 'lucide-react';
import ControllerVisualizer from './components/ControllerVisualizer';
import Header from './components/Header';
import MappingList from './components/MappingList';
import SettingsModal from './components/SettingsModal';
import { 
  ControllerInputType, 
  MidiMapping, 
  MidiMessageType, 
  XboxState, 
  LogEntry,
  AppSettings
} from './types';
import { DEFAULT_MAPPINGS } from './constants';

// Safely access Electron IPC
// @ts-ignore
const ipcRenderer = (typeof window !== 'undefined' && window.require) 
  // @ts-ignore
  ? window.require('electron').ipcRenderer 
  : { 
      on: () => {}, 
      removeAllListeners: () => {}, 
      send: () => {} 
    };

// --- CHANGELOG DATA ---
const CHANGELOG = [
  {
    version: '0.1.3',
    date: 'Performance Update',
    changes: [
      'Core: Implemented RequestAnimationFrame loop',
      'Core: Decoupled MIDI logic from UI rendering',
      'UX: Improved Deadzone calculation algorithm',
      'Refactor: Modularized components'
    ]
  },
  {
    version: '0.1.2',
    date: 'Bug Fixes',
    changes: [
      'Input: Fixed D-Pad directional parsing (Hat Switch)',
      'System: Improved Native Driver stability',
      'System: Robust packet filtering'
    ]
  },
  {
    version: '0.1.1',
    date: 'Protocol Fix',
    changes: [
      'Fix: Corrected 16-bit Signed Integer parsing for Sticks',
      'Fix: Added header filtering to ignore Battery packets',
      'System: Added Raw Data Inspector for debugging'
    ]
  },
  {
    version: '0.1.0',
    date: 'Native Upgrade',
    changes: [
      'Core: Switched to Native HID Driver',
    ]
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'light', 
  accentColor: '#22d3ee', 
  deadzone: 0.15, // Increased default deadzone for safety
  smoothing: 0.1, // Added slight smoothing by default
};

const PRESET_COLORS = [
  '#22d3ee', // Cyan
  '#f472b6', // Pink
  '#a78bfa', // Purple
  '#4ade80', // Green
  '#fbbf24', // Amber
  '#f87171', // Red
  '#64748b', // Slate
];

// Helper for smoother deadzone
const applyDeadzone = (val: number, deadzone: number) => {
  if (Math.abs(val) < deadzone) return 0;
  // Re-normalize start point after deadzone to 0
  const sign = Math.sign(val);
  return sign * ((Math.abs(val) - deadzone) / (1 - deadzone));
};

const App: React.FC = () => {
  // --- STATE ---
  const [mappings, setMappings] = useState<MidiMapping[]>(() => {
    const saved = localStorage.getItem('xbox_midi_mappings');
    return saved ? JSON.parse(saved) : DEFAULT_MAPPINGS;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('xbox_midi_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  
  const [midiAccess, setMidiAccess] = useState<any>(null);
  const [selectedOutputId, setSelectedOutputId] = useState<string>(() => {
    return localStorage.getItem('xbox_midi_output_id') || '';
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'mappings' | 'logs' | 'debug'>('mappings');
  
  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const [isTransmitting, setIsTransmitting] = useState(false);
  const transmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Theme Logic
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mq.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDark = settings.themeMode === 'auto' ? systemTheme === 'dark' : settings.themeMode === 'dark';

  const [xboxState, setXboxState] = useState<XboxState>({
    buttons: Array(17).fill(false),
    buttonValues: Array(17).fill(0),
    axes: Array(4).fill(0),
    connected: false,
  });

  // --- REFS FOR PERFORMANCE LOOP ---
  // These refs allow the listeners and loops to access latest state without re-binding
  const latestXboxStateRef = useRef<XboxState>(xboxState);
  const processingStateRef = useRef<XboxState>(xboxState); // Previous state for logic diffs
  const mappingsRef = useRef(mappings);
  const settingsRef = useRef(settings);
  const midiAccessRef = useRef(midiAccess);
  const selectedOutputIdRef = useRef(selectedOutputId);

  // Sync refs when React state changes
  useEffect(() => { mappingsRef.current = mappings; }, [mappings]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { midiAccessRef.current = midiAccess; }, [midiAccess]);
  useEffect(() => { selectedOutputIdRef.current = selectedOutputId; }, [selectedOutputId]);

  // --- PERSISTENCE ---
  useEffect(() => { localStorage.setItem('xbox_midi_mappings', JSON.stringify(mappings)); }, [mappings]);
  useEffect(() => { localStorage.setItem('xbox_midi_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { if (selectedOutputId) localStorage.setItem('xbox_midi_output_id', selectedOutputId); }, [selectedOutputId]);

  // --- LOGGING ---
  const addLog = useCallback((message: string, type: 'info' | 'midi' | 'error' = 'info') => {
    setLogs(prev => [
      { id: Date.now().toString() + Math.random(), timestamp: new Date().toLocaleTimeString(), message, type },
      ...prev.slice(0, 49)
    ]);
  }, []);

  const triggerSignal = useCallback(() => {
    if (!isTransmitting) setIsTransmitting(true);
    if (transmitTimeoutRef.current) clearTimeout(transmitTimeoutRef.current);
    transmitTimeoutRef.current = setTimeout(() => setIsTransmitting(false), 80);
  }, [isTransmitting]);

  const sendMidiMessageRef = (status: number, data1: number, data2: number) => {
      const access = midiAccessRef.current;
      const outputId = selectedOutputIdRef.current;
      if (!access || !outputId) return;
      
      const output = access.outputs.get(outputId);
      if (output) output.send([status, data1, data2]);
  };

  // --- HIGH PERFORMANCE LOOP ---
  useEffect(() => {
    // Check if we are in Electron before trying to listen
    if (!(window as any).require) {
        console.warn("Native IPC not available. Running in browser mode?");
    }

    // 1. The Listener updates the REF and handles MIDI (Instant)
    const handleControllerData = (event: any, data: XboxState) => {
      const currentSettings = settingsRef.current;
      const currentMappings = mappingsRef.current;
      const prevProcessing = processingStateRef.current;

      const newState = { 
          ...data, 
          connected: true,
          axes: [...data.axes] 
      };
      
      let hasActivity = false;

      // --- PROCESS AXES (Deadzone & Smoothing) ---
      newState.axes = newState.axes.map((rawVal, index) => {
        // Apply Better Deadzone Math
        const val = applyDeadzone(rawVal, currentSettings.deadzone);
        
        // Apply Smoothing (Low Pass Filter)
        const prevVal = prevProcessing.axes[index] || 0;
        const smoothed = prevVal + (val - prevVal) * (1 - currentSettings.smoothing);
        
        return smoothed;
      });

      // --- MIDI LOGIC ---
      
      // Buttons
      newState.buttons.forEach((pressed, index) => {
        if (pressed !== prevProcessing.buttons[index]) {
          hasActivity = true;
          const mapping = currentMappings.find(m => m.inputType === ControllerInputType.BUTTON && m.controllerInputIndex === index);
          if (mapping) {
            const statusByte = (mapping.midiType === MidiMessageType.NOTE_ON ? 0x90 : 0xB0) + (mapping.channel - 1);
            if (mapping.midiType === MidiMessageType.NOTE_ON) {
              const noteStatus = pressed ? 0x90 + (mapping.channel - 1) : 0x80 + (mapping.channel - 1);
              sendMidiMessageRef(noteStatus, mapping.targetNumber, 127);
            } else if (mapping.midiType === MidiMessageType.CC) {
               sendMidiMessageRef(statusByte, mapping.targetNumber, pressed ? 127 : 0);
            }
          }
        }
      });

      // Axes
      newState.axes.forEach((val, index) => {
        const prevVal = prevProcessing.axes[index] || 0;
        // Only send if changed significantly (to reduce MIDI spam)
        if (Math.abs(val - prevVal) > 0.02) { 
          hasActivity = true;
          const mapping = currentMappings.find(m => m.inputType === ControllerInputType.AXIS && m.controllerInputIndex === index);
          if (mapping) {
            // Map -1..1 to 0..127
            const midiValue = Math.floor(((val + 1) / 2) * 127);
            const statusByte = 0xB0 + (mapping.channel - 1);
            sendMidiMessageRef(statusByte, mapping.targetNumber, midiValue);
          }
        }
      });

      if (hasActivity) triggerSignal();

      // Update refs
      processingStateRef.current = newState;
      latestXboxStateRef.current = newState;
    };

    const handleLog = (event: any, log: LogEntry) => {
        addLog(log.message, log.type);
    };

    ipcRenderer.on('native-controller-data', handleControllerData);
    ipcRenderer.on('native-log', handleLog);
    
    // 2. The Animation Loop updates the UI (Throttled to Monitor Refresh Rate)
    let animationFrameId: number;
    const animate = () => {
        setXboxState(prev => {
            // Only update state if data actually changed significantly to save renders
            if (prev !== latestXboxStateRef.current) {
                return latestXboxStateRef.current;
            }
            return prev;
        });
        animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);

    return () => {
        ipcRenderer.removeAllListeners('native-controller-data');
        ipcRenderer.removeAllListeners('native-log');
        cancelAnimationFrame(animationFrameId);
    };
  }, []); // Empty dependency array ensures we don't re-bind listeners constantly

  // --- MIDI SETUP ---
  useEffect(() => {
    const initMidi = async () => {
      try {
        if (!navigator.requestMIDIAccess) return;
        const access = await navigator.requestMIDIAccess();
        setMidiAccess(access);
        if (access.outputs.size > 0 && !selectedOutputId) setSelectedOutputId(access.outputs.values().next().value.id);
      } catch (e) {}
    };
    initMidi();
  }, []);

  // --- CRUD ---
  const updateMapping = (id: string, field: keyof MidiMapping, value: any) => setMappings(p => p.map(m => m.id === id ? { ...m, [field]: value } : m));
  const deleteMapping = (id: string) => setMappings(p => p.filter(m => m.id !== id));
  const addNewMapping = () => setMappings(p => [...p, { id: Date.now().toString(), controllerInputIndex: 0, inputType: ControllerInputType.BUTTON, midiType: MidiMessageType.NOTE_ON, channel: 1, targetNumber: 60, label: 'New Control' }]);
  const resetMappings = () => { if(confirm('Reset?')) setMappings(DEFAULT_MAPPINGS); }

  // --- STYLING VARIABLES (Glass & Metal) ---
  const style = {
    appBg: isDark ? 'bg-[#0f1012]' : 'bg-[#eef2f6]',
    appGradient: isDark ? 'bg-radial-dark' : 'bg-radial-light',
    panelGlass: isDark 
      ? 'bg-black/40 border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl' 
      : 'bg-white/60 border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl',
  };

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-700 ${style.appBg} ${style.appGradient} ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
      
      <Header 
        settings={settings}
        isDark={isDark}
        isTransmitting={isTransmitting}
        isOutputReady={!!selectedOutputId}
        selectedOutputId={selectedOutputId}
        setSelectedOutputId={setSelectedOutputId}
        midiAccess={midiAccess}
        onOpenSettings={() => { setIsSettingsOpen(true); setShowChangelog(false); }}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden p-8 gap-8 pt-2">
        
        {/* LEFT: VISUALIZER */}
        <div className={`w-[500px] rounded-[2.5rem] flex flex-col relative overflow-hidden transition-colors duration-500 border ${style.panelGlass} `}>
           <div className="absolute top-6 left-6 w-3 h-3 rounded-full border border-current opacity-20 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-current rotate-45"></div></div>
           <div className="absolute top-6 right-6 w-3 h-3 rounded-full border border-current opacity-20 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-current rotate-45"></div></div>
           
           <div className="flex-1 flex flex-col items-center justify-center p-10 relative z-10">
              
              <ControllerVisualizer state={xboxState} accentColor={settings.accentColor} isDark={isDark} />
              
              <div className={`mt-8 flex flex-col items-center gap-3 transition-opacity duration-500 ${xboxState.connected ? 'opacity-0' : 'opacity-100'}`}>
                 <div className={`p-4 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'} animate-pulse`}>
                    <Gamepad2 size={32} className="opacity-50" />
                 </div>
                 <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-50">Searching...</p>
                 <p className="text-[10px] opacity-40">Polling Native HID Driver</p>
              </div>
           </div>

           <div className={`h-14 border-t flex items-center justify-between px-8 ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/20 border-black/5'}`}>
              <div className="flex items-center gap-3">
                 <div className={`h-2 w-2 rounded-full shadow-lg ${xboxState.connected ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-500 shadow-amber-500/50'}`}></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Status: {xboxState.connected ? 'Online' : 'Searching'}</span>
              </div>
           </div>
        </div>

        {/* RIGHT: MAPPINGS */}
        <MappingList 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            mappings={mappings}
            setMappings={setMappings}
            logs={logs}
            xboxState={xboxState}
            settings={settings}
            isDark={isDark}
            addNewMapping={addNewMapping}
            resetMappings={resetMappings}
            updateMapping={updateMapping}
            deleteMapping={deleteMapping}
        />
      </div>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <SettingsModal 
            settings={settings}
            setSettings={setSettings}
            isDark={isDark}
            onClose={() => setIsSettingsOpen(false)}
            showChangelog={showChangelog}
            setShowChangelog={setShowChangelog}
            CHANGELOG={CHANGELOG}
            PRESET_COLORS={PRESET_COLORS}
        />
      )}

    </div>
  );
};

export default App;
