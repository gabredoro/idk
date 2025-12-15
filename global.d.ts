
declare interface Navigator {
  requestMIDIAccess(options?: WebMidi.MIDIOptions): Promise<WebMidi.MIDIAccess>;
}

declare namespace WebMidi {
    interface MIDIOptions {
        sysex?: boolean;
        software?: boolean;
    }
    interface MIDIAccess {
        inputs: MIDIInputMap;
        outputs: MIDIOutputMap;
        onstatechange: ((this: MIDIAccess, ev: MIDIConnectionEvent) => any) | null;
    }
    interface MIDIInputMap extends Map<string, MIDIInput> {}
    interface MIDIOutputMap extends Map<string, MIDIOutput> {}
    interface MIDIPort {
        id: string;
        manufacturer?: string;
        name?: string;
        type: "input" | "output";
        version?: string;
        state: "disconnected" | "connected";
        connection: "open" | "closed" | "pending";
        onstatechange: ((this: MIDIPort, ev: MIDIConnectionEvent) => any) | null;
        open(): Promise<MIDIPort>;
        close(): Promise<MIDIPort>;
    }
    interface MIDIInput extends MIDIPort {
        onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => any) | null;
    }
    interface MIDIOutput extends MIDIPort {
        send(data: number[] | Uint8Array, timestamp?: number): void;
        clear(): void;
    }
    interface MIDIMessageEvent extends Event {
        data: Uint8Array;
    }
    interface MIDIConnectionEvent extends Event {
        port: MIDIPort;
    }
}
