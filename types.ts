
export enum MidiMessageType {
  NOTE_ON = 'NOTE_ON',
  NOTE_OFF = 'NOTE_OFF',
  CC = 'CC', // Control Change
}

export enum ControllerInputType {
  BUTTON = 'BUTTON',
  AXIS = 'AXIS', // Deprecated but kept for type safety in existing logic until full cleanup
}

export interface MidiMapping {
  id: string;
  controllerInputIndex: number; // Button index (0-16)
  inputType: ControllerInputType;
  midiType: MidiMessageType;
  channel: number; // 1-16
  targetNumber: number; // Note number (0-127) or CC number (0-127)
  label: string;
  minVal?: number; // Deprecated
  maxVal?: number; // Deprecated
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'midi' | 'error';
}

export interface XboxState {
  buttons: boolean[];
  buttonValues: number[]; 
  axes: number[];
  connected: boolean;
}

export type ThemeMode = 'dark' | 'light' | 'auto';

export interface AppSettings {
  themeMode: ThemeMode;
  accentColor: string;
  // removed deadzone and smoothing
}
