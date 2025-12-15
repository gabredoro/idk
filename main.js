
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const HID = require('node-hid');

// --- CRITICAL MACOS FIX ---
// Force HIDAPI driver which is more stable for gamepads on macOS
if (process.platform === 'darwin') {
  HID.setDriverType('hidapi');
}

// --- OPTIMIZATION FLAGS ---
app.commandLine.appendSwitch('force-color-profile', 'srgb');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

let mainWindow;
let hidDevice = null;
let pollInterval = null;

// XBOX CONTROLLER IDENTIFIERS
const TARGET_VID = 1118; // Microsoft (0x045E)

function scanForController() {
  if (hidDevice) return;

  try {
    const devices = HID.devices();
    
    // FILTRO RIGOROSO PER MAC
    const target = devices.find(d => 
      d.vendorId === TARGET_VID && 
      d.usagePage === 1 && 
      d.usage === 5
    );

    if (target) {
      console.log('NATIVE: Found Xbox Controller Interface:', target.product, target.path);
      
      try {
        hidDevice = new HID.HID(target.path);
      } catch (err) {
        console.error("Could not open device:", err);
        if (mainWindow && !mainWindow.isDestroyed()) {
             mainWindow.webContents.send('native-log', { message: `HID Error: ${err.message}`, type: 'error' });
        }
        return;
      }
      
      if(mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('native-log', { message: `Connected: ${target.product}`, type: 'info' });
      }

      hidDevice.on('data', (buffer) => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        
        // --- 1. VISUAL DIAGNOSIS LOG (Per il debug dei byte) ---
        // Stampa i byte per vedere l'allineamento. Commenta in produzione se troppo verboso.
        // const hex = [...buffer].map(b => b.toString(16).padStart(2,'0')).join(' ');
        // console.log(`LEN:${buffer.length} | ${hex}`);

        // Parsing Intelligente (Wired vs Bluetooth)
        const data = parseXboxBufferSmart(buffer);
        
        if (data) {
            mainWindow.webContents.send('native-controller-data', data);
        }
      });

      hidDevice.on('error', (err) => {
        console.error('NATIVE: HID Connection Lost', err);
        if(mainWindow && !mainWindow.isDestroyed()) {
             mainWindow.webContents.send('native-log', { message: `Connection Lost`, type: 'error' });
        }
        try { hidDevice.close(); } catch(e){}
        hidDevice = null;
      });
    }
  } catch (e) {
    console.error('NATIVE: Scan Error', e);
  }
}

/**
 * SMART PARSER: Gestisce sia Bluetooth (Offset 0/1) che USB Wired (Offset 3+)
 */
function parseXboxBufferSmart(buf) {
  // Sicurezza buffer minimo
  if (buf.length < 10) return null;

  const state = {
    buttons: Array(17).fill(false),
    buttonValues: Array(17).fill(0),
    axes: [0, 0, 0, 0]
  };

  let btnOffset = 0;
  let isWired = false;
  
  // RILEVAMENTO PROTOCOLLO
  if (buf.length >= 20 && buf[0] === 0x00) {
      // PROBABILE USB WIRED MAC
      // I dati iniziano spesso dopo un header di padding
      isWired = true;
      btnOffset = 3; // Offset suggerito per USB
  } else if (buf[0] === 0x01) {
      // Bluetooth Standard
      btnOffset = 1;
  } else {
      // Bluetooth Stripped (driver custom)
      btnOffset = 0;
  }

  // --- PARSING ---

  if (isWired) {
      // === LAYOUT USB WIRED (Mac) ===
      // Byte 2: Possibile Hat/D-Pad? O Byte 3?
      // Byte 3: A, B, X, Y, LB, RB
      // Byte 4: Start, Back, Click
      // Byte 5: Trig L (8-bit?)
      // Byte 6: Trig R (8-bit?)
      // Byte 7-8: LX ...

      // Verifica confini
      if (buf.length < btnOffset + 12) return null;

      const b1 = buf[btnOffset];     // Byte 3
      const b2 = buf[btnOffset + 1]; // Byte 4

      // Buttons Main
      state.buttons[0] = !!(b1 & 0x10); // A
      state.buttons[1] = !!(b1 & 0x20); // B
      state.buttons[2] = !!(b1 & 0x40); // X
      state.buttons[3] = !!(b1 & 0x80); // Y
      state.buttons[4] = !!(b1 & 0x01); // LB
      state.buttons[5] = !!(b1 & 0x02); // RB

      // Buttons Secondary
      state.buttons[8] = !!(b2 & 0x04); // View/Back
      state.buttons[9] = !!(b2 & 0x08); // Menu/Start
      state.buttons[10] = !!(b2 & 0x20); // LClick
      state.buttons[11] = !!(b2 & 0x40); // RClick

      // D-Pad (Hat) - Spesso su USB è il byte precedente ai bottoni (Byte 2)
      // Ipotizziamo sia a btnOffset - 1
      const hat = buf[btnOffset - 1] & 0x0F;
      // Valori Hat standard: 1=N, 2=NE, 3=E... o 0=N, 1=NE...
      // Se non funziona, il D-Pad potrebbe essere bitmask su b2.
      // Implementiamo lo standard 1-8
      state.buttons[12] = (hat === 1 || hat === 2 || hat === 8); // Up
      state.buttons[13] = (hat === 4 || hat === 5 || hat === 6); // Down
      state.buttons[14] = (hat === 6 || hat === 7 || hat === 8); // Left
      state.buttons[15] = (hat === 2 || hat === 3 || hat === 4); // Right

      // Triggers (8-bit su Wired?)
      state.buttonValues[6] = buf[btnOffset + 2] / 255; // LT
      state.buttonValues[7] = buf[btnOffset + 3] / 255; // RT
      state.buttons[6] = state.buttonValues[6] > 0.1;
      state.buttons[7] = state.buttonValues[7] > 0.1;

      // Axes (16-bit LE)
      try {
        const stickStart = btnOffset + 4;
        state.axes[0] = buf.readInt16LE(stickStart) / 32768;      // LX
        state.axes[1] = -(buf.readInt16LE(stickStart + 2) / 32768); // LY
        state.axes[2] = buf.readInt16LE(stickStart + 4) / 32768;    // RX
        state.axes[3] = -(buf.readInt16LE(stickStart + 6) / 32768); // RY
      } catch(e) {}

  } else {
      // === LAYOUT BLUETOOTH ===
      const hat = buf[btnOffset] & 0x0F;
      const btn = buf[btnOffset + 1];

      // D-Pad
      if (hat <= 7) {
        state.buttons[12] = (hat === 0 || hat === 1 || hat === 7);
        state.buttons[13] = (hat === 3 || hat === 4 || hat === 5);
        state.buttons[14] = (hat === 5 || hat === 6 || hat === 7);
        state.buttons[15] = (hat === 1 || hat === 2 || hat === 3);
      }

      // Buttons
      state.buttons[0] = !!(btn & 0x10); // A
      state.buttons[1] = !!(btn & 0x20); // B
      state.buttons[2] = !!(btn & 0x40); // X
      state.buttons[3] = !!(btn & 0x80); // Y
      state.buttons[4] = !!(btn & 0x01); // LB
      state.buttons[5] = !!(btn & 0x02); // RB
      state.buttons[8] = !!(btn & 0x04); // View
      state.buttons[9] = !!(btn & 0x08); // Menu

      // Axes & Triggers
      try {
        state.axes[0] = buf.readInt16LE(btnOffset + 2) / 32768;
        state.axes[1] = -(buf.readInt16LE(btnOffset + 4) / 32768);
        state.axes[2] = buf.readInt16LE(btnOffset + 6) / 32768;
        state.axes[3] = -(buf.readInt16LE(btnOffset + 8) / 32768);

        const rawLT = buf.readUInt16LE(btnOffset + 10);
        const rawRT = buf.readUInt16LE(btnOffset + 12);
        state.buttonValues[6] = rawLT / 65535;
        state.buttonValues[7] = rawRT / 65535;
        state.buttons[6] = state.buttonValues[6] > 0.1;
        state.buttons[7] = state.buttonValues[7] > 0.1;
      } catch(e) {}
  }

  // Clamp finale
  for(let i=0; i<4; i++) state.axes[i] = Math.max(-1, Math.min(1, state.axes[i]));

  return state;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'fullscreen-ui', 
    backgroundMaterial: 'acrylic',
    backgroundColor: '#00000000',
    trafficLightPosition: { x: 20, y: 20 },
    icon: path.join(__dirname, 'icon.icns'), 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Required for window.require
      webSecurity: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile('dist/index.html');
  
  // Start Native Poll
  pollInterval = setInterval(scanForController, 2000); 
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (pollInterval) clearInterval(pollInterval);
  if (hidDevice) {
      try { hidDevice.close(); } catch(e){}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
