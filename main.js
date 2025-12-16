
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const HID = require('node-hid');

if (process.platform === 'darwin') {
  HID.setDriverType('hidapi');
}

app.commandLine.appendSwitch('force-color-profile', 'srgb');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

let mainWindow;
let hidDevice = null;
let pollInterval = null;
let lastProtocolDetected = null;

const TARGET_VID = 1118; // Microsoft

function scanForController() {
  if (hidDevice) return;

  try {
    const devices = HID.devices();
    const target = devices.find(d => 
      d.vendorId === TARGET_VID && 
      d.usagePage === 1 && 
      d.usage === 5
    );

    if (target) {
      console.log('NATIVE: Found Xbox Controller:', target.product);
      
      try {
        hidDevice = new HID.HID(target.path);
      } catch (err) {
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
        const data = parseXboxBufferStrict(buffer);
        if (data) {
            mainWindow.webContents.send('native-controller-data', data);
        }
      });

      hidDevice.on('error', (err) => {
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
 * STRICT PARSER - DIGITAL ONLY
 * No Analog Axes calculation whatsoever.
 */
function parseXboxBufferStrict(buf) {
  if (buf.length < 10) return null;

  const state = {
    buttons: Array(17).fill(false),
    buttonValues: Array(17).fill(0),
    axes: [0, 0, 0, 0] // HARDCODED ZERO
  };

  // DETECT PROTOCOL
  // USB Wired starts with 0x00 and usually has length 20 or 64
  const isWired = (buf[0] === 0x00 && buf.length >= 14);

  if (isWired) {
      // === USB WIRED (Strict Buttons) ===
      // Byte 2 & 3 are buttons. 
      // We IGNORE bytes 6+ (Sticks) completely.
      
      const bLow = buf[2];
      const bHigh = buf[3];

      // D-Pad & System
      state.buttons[12] = !!(bLow & 0x01); // Up
      state.buttons[13] = !!(bLow & 0x02); // Down
      state.buttons[14] = !!(bLow & 0x04); // Left
      state.buttons[15] = !!(bLow & 0x08); // Right
      state.buttons[9]  = !!(bLow & 0x10); // Start
      state.buttons[8]  = !!(bLow & 0x20); // Back
      state.buttons[10] = !!(bLow & 0x40); // LClick
      state.buttons[11] = !!(bLow & 0x80); // RClick

      // Face Buttons
      state.buttons[4] = !!(bHigh & 0x01); // LB
      state.buttons[5] = !!(bHigh & 0x02); // RB
      state.buttons[16]= !!(bHigh & 0x04); // Guide
      state.buttons[0] = !!(bHigh & 0x10); // A
      state.buttons[1] = !!(bHigh & 0x20); // B
      state.buttons[2] = !!(bHigh & 0x40); // X
      state.buttons[3] = !!(bHigh & 0x80); // Y

      // Triggers (Digital Threshold Only - 50%)
      state.buttons[6] = (buf[4] / 255) > 0.5; // LT
      state.buttons[7] = (buf[5] / 255) > 0.5; // RT

  } else {
      // === BLUETOOTH (Strict Buttons) ===
      const offset = (buf[0] === 0x01) ? 1 : 0;
      
      // Safety check for short packets
      if (buf.length < offset + 12) return null;

      // Triggers (Digital Threshold - 50%)
      // Standard HID: Triggers at Offset + 8/9
      state.buttons[6] = (buf[offset + 8] / 255) > 0.5; // LT
      state.buttons[7] = (buf[offset + 9] / 255) > 0.5; // RT

      // Hat Switch (D-Pad) - Strict Check
      const hatVal = buf[offset + 10] & 0x0F;
      // Only accept 0-7. 8 is center. Anything else is noise.
      if (hatVal <= 7) {
          state.buttons[12] = (hatVal === 0 || hatVal === 1 || hatVal === 7); // Up
          state.buttons[13] = (hatVal === 3 || hatVal === 4 || hatVal === 5); // Down
          state.buttons[14] = (hatVal === 5 || hatVal === 6 || hatVal === 7); // Left
          state.buttons[15] = (hatVal === 1 || hatVal === 2 || hatVal === 3); // Right
      }

      // Buttons
      const btn1 = buf[offset + 11];
      state.buttons[0] = !!(btn1 & 0x01); // A
      state.buttons[1] = !!(btn1 & 0x02); // B
      state.buttons[2] = !!(btn1 & 0x04); // X 
      state.buttons[3] = !!(btn1 & 0x08); // Y 
      state.buttons[4] = !!(btn1 & 0x10); // LB
      state.buttons[5] = !!(btn1 & 0x20); // RB
      state.buttons[8] = !!(btn1 & 0x40); // Back
      state.buttons[9] = !!(btn1 & 0x80); // Start
      
      // Optional extra buttons (Guide etc)
      if (buf.length > offset + 12) {
          const btn2 = buf[offset + 12];
          state.buttons[10] = !!(btn2 & 0x01); // LClick
          state.buttons[11] = !!(btn2 & 0x02); // RClick
          state.buttons[16] = !!(btn2 & 0x04); // Guide
      }
  }

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
      contextIsolation: false, 
      webSecurity: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile('dist/index.html');
  pollInterval = setInterval(scanForController, 2000); 
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pollInterval) clearInterval(pollInterval);
  if (hidDevice) try { hidDevice.close(); } catch(e){}
  if (process.platform !== 'darwin') app.quit();
});
