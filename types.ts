export enum MidiMessageType {
  NOTE_ON = 'NOTE_ON',
  NOTE_OFF = 'NOTE_OFF',
  CC = 'CC', // Control Change
}

export enum ControllerInputType {
  BUTTON = 'BUTTON',
  AXIS = 'AXIS',
}

export interface MidiMapping {
  id: string;
  controllerInputIndex: number; // Button index (0-16) or Axis index (0-3)
  inputType: ControllerInputType;
  midiType: MidiMessageType;
  channel: number; // 1-16
  targetNumber: number; // Note number (0-127) or CC number (0-127)
  label: string;
  minVal?: number; // For scaling axes
  maxVal?: number; // For scaling axes
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'midi' | 'error';
}

export interface XboxState {
  buttons: boolean[];
  buttonValues: number[]; // Added for analog triggers
  axes: number[];
  connected: boolean;
}

export type ThemeMode = 'dark' | 'light' | 'auto';

export interface AppSettings {
  themeMode: ThemeMode;
  accentColor: string;
  deadzone: number; // 0.0 to 0.5
  smoothing: number; // 0.0 to 0.9
}