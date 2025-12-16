
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
      version: '0.1.5',
      date: 'Analog Removal',
      changes: [
        'Input: Completely removed Analog Stick support (Digital Only)',
        'UI: Simplified Settings (Removed Deadzone/Smoothing)',
        'Core: Optimized MIDI loop for Buttons only'
      ]
  },
  {
    version: '0.1.4',
    date: 'Debug Update',
    changes: [
      'Debug: Added Verbose Logging for MIDI Events',
      'Debug: Added Protocol Detection Logging',
      'System: Enhanced USB Wired support'
    ]
  },
  {
    version: '0.1.3',
    date: 'Performance Update',
    changes: [
      'Core: Implemented RequestAnimationFrame loop',
      'Core: Decoupled MIDI logic from UI rendering',
      'UX: Improved Deadzone calculation algorithm',
      'Refactor: Modularized components'
    ]
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'light', 
  accentColor: '#22d3ee', 
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

const App: React.FC = () => {
  // --- STATE ---
  const [mappings, setMappings] = useState<MidiMapping[]>(() => {
    const saved = localStorage.getItem('xbox_midi_mappings');
    // Sanitize saved mappings to remove any old AXIS mappings
    const loaded = saved ? JSON.parse(saved) : DEFAULT_MAPPINGS;
    return loaded.filter((m: MidiMapping) => m.inputType === ControllerInputType.BUTTON);
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('xbox_midi_settings');
    // Fallback to default if old settings format
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
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
  const latestXboxStateRef = useRef<XboxState>(xboxState);
  const processingStateRef = useRef<XboxState>(xboxState); 
  const mappingsRef = useRef(mappings);
  const settingsRef = useRef(settings);
  const midiAccessRef = useRef(midiAccess);
  const selectedOutputIdRef = useRef(selectedOutputId);

  useEffect(() => { mappingsRef.current = mappings; }, [mappings]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { midiAccessRef.current = midiAccess; }, [midiAccess]);
  useEffect(() => { selectedOutputIdRef.current = selectedOutputId; }, [selectedOutputId]);

  useEffect(() => { localStorage.setItem('xbox_midi_mappings', JSON.stringify(mappings)); }, [mappings]);
  useEffect(() => { localStorage.setItem('xbox_midi_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { 
      if (selectedOutputId) {
          localStorage.setItem('xbox_midi_output_id', selectedOutputId);
          addLog(`Output Preferences Saved: ${selectedOutputId}`, 'info');
      }
  }, [selectedOutputId]);

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
      if (output) {
          try {
              output.send([status, data1, data2]);
              const hexStatus = status.toString(16).toUpperCase();
              addLog(`MIDI TX: [${hexStatus}, ${data1}, ${data2}]`, 'midi');
          } catch(e) {
              console.error(e);
              addLog(`MIDI Error: ${e}`, 'error');
          }
      } else {
          addLog(`MIDI Error: Output ${outputId} not found`, 'error');
      }
  };

  // --- HIGH PERFORMANCE LOOP ---
  useEffect(() => {
    addLog('System: Starting Native Listeners...', 'info');

    if (!(window as any).require) {
        console.warn("Native IPC not available. Running in browser mode?");
        addLog('Warning: Native IPC not detected (Browser Mode?)', 'error');
    }

    const handleControllerData = (event: any, data: XboxState) => {
      const currentMappings = mappingsRef.current;
      const prevProcessing = processingStateRef.current;

      const newState = { 
          ...data, 
          connected: true,
          axes: [0,0,0,0] // Ensure axes are ignored
      };
      
      let hasActivity = false;

      // --- MIDI LOGIC (Buttons Only) ---
      
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

      // Analog Axes Processing Removed

      if (hasActivity) triggerSignal();

      processingStateRef.current = newState;
      latestXboxStateRef.current = newState;
    };

    const handleLog = (event: any, log: LogEntry) => {
        addLog(log.message, log.type);
    };

    ipcRenderer.on('native-controller-data', handleControllerData);
    ipcRenderer.on('native-log', handleLog);
    
    let animationFrameId: number;
    const animate = () => {
        setXboxState(prev => {
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
  }, []);

  useEffect(() => {
    const initMidi = async () => {
      try {
        if (!navigator.requestMIDIAccess) {
            addLog('WebMIDI API not supported in this environment', 'error');
            return;
        }
        addLog('Requesting MIDI Access...', 'info');
        const access = await navigator.requestMIDIAccess();
        setMidiAccess(access);
        addLog(`MIDI Access Granted. Inputs: ${access.inputs.size}, Outputs: ${access.outputs.size}`, 'info');
        
        if (access.outputs.size > 0 && !selectedOutputId) {
            const firstId = access.outputs.values().next().value.id;
            setSelectedOutputId(firstId);
            addLog(`Auto-selected Output: ${firstId}`, 'info');
        } else if (access.outputs.size === 0) {
            addLog('No MIDI Outputs found (IAC Driver enabled?)', 'error');
        }
      } catch (e) {
          addLog(`MIDI Init Error: ${e}`, 'error');
      }
    };
    initMidi();
  }, []);

  // --- CRUD ---
  const updateMapping = (id: string, field: keyof MidiMapping, value: any) => {
      setMappings(p => p.map(m => m.id === id ? { ...m, [field]: value } : m));
      if (field !== 'label' && field !== 'targetNumber') {
        addLog(`Mapping Updated: ${field} -> ${value}`, 'info');
      }
  };
  
  const deleteMapping = (id: string) => {
      setMappings(p => p.filter(m => m.id !== id));
      addLog('Mapping Deleted', 'info');
  };
  
  const addNewMapping = () => {
      setMappings(p => [...p, { id: Date.now().toString(), controllerInputIndex: 0, inputType: ControllerInputType.BUTTON, midiType: MidiMessageType.NOTE_ON, channel: 1, targetNumber: 60, label: 'New Control' }]);
      addLog('New Mapping Added', 'info');
  };
  
  const resetMappings = () => { 
      if(confirm('Reset?')) {
          setMappings(DEFAULT_MAPPINGS);
          addLog('Mappings Reset to Defaults', 'info');
      }
  }

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
        setSelectedOutputId={(id) => {
            setSelectedOutputId(id);
            addLog(`Manual Output Switch: ${id}`, 'info');
        }}
        midiAccess={midiAccess}
        onOpenSettings={() => { setIsSettingsOpen(true); setShowChangelog(false); }}
      />

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
