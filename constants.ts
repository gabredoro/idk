import { MidiMapping, ControllerInputType, MidiMessageType } from './types';

export const XBOX_BUTTON_NAMES = [
  'A', 'B', 'X', 'Y', 
  'LB', 'RB', 'LT (Digital)', 'RT (Digital)',
  'View', 'Menu', 
  'L-Stick Click', 'R-Stick Click', 
  'D-Pad Up', 'D-Pad Down', 'D-Pad Left', 'D-Pad Right', 
  'Guide'
];

export const XBOX_AXIS_NAMES = [
  'L-Stick X', 'L-Stick Y', 
  'R-Stick X', 'R-Stick Y'
];

// Default configuration to get sound immediately
export const DEFAULT_MAPPINGS: MidiMapping[] = [
  {
    id: 'btn-a',
    controllerInputIndex: 0, // A
    inputType: ControllerInputType.BUTTON,
    midiType: MidiMessageType.NOTE_ON,
    channel: 1,
    targetNumber: 60, // C4
    label: 'Kick (C4)',
  },
  {
    id: 'btn-b',
    controllerInputIndex: 1, // B
    inputType: ControllerInputType.BUTTON,
    midiType: MidiMessageType.NOTE_ON,
    channel: 1,
    targetNumber: 62, // D4
    label: 'Snare (D4)',
  },
  {
    id: 'btn-x',
    controllerInputIndex: 2, // X
    inputType: ControllerInputType.BUTTON,
    midiType: MidiMessageType.NOTE_ON,
    channel: 1,
    targetNumber: 64, // E4
    label: 'Hi-Hat (E4)',
  },
  {
    id: 'btn-y',
    controllerInputIndex: 3, // Y
    inputType: ControllerInputType.BUTTON,
    midiType: MidiMessageType.NOTE_ON,
    channel: 1,
    targetNumber: 65, // F4
    label: 'Crash (F4)',
  },
  {
    id: 'axis-lx',
    controllerInputIndex: 0, // L-Stick X
    inputType: ControllerInputType.AXIS,
    midiType: MidiMessageType.CC,
    channel: 1,
    targetNumber: 1, // Modulation Wheel
    label: 'Mod Wheel',
  },
  {
    id: 'axis-ly',
    controllerInputIndex: 1, // L-Stick Y
    inputType: ControllerInputType.AXIS,
    midiType: MidiMessageType.CC,
    channel: 1,
    targetNumber: 7, // Volume
    label: 'Volume',
  }
];