// main.js - Main Electron process
const { app, BrowserWindow, screen, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const express = require('express');

let overlayWindow;
let gameStateServer;
let isOverlayVisible = false;

// CS2 Game State Integration server
function startGameStateServer() {
  const server = express();
  server.use(express.json());

  server.post('/', (req, res) => {
    // Receive game state from CS2
    const gameState = req.body;

    console.log('Received game state:', JSON.stringify(gameState, null, 2));

    // Send game state to overlay window
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('game-state-update', gameState);
    }

    res.status(200).send('OK');
  });

  // Add a test endpoint to verify server is working
  server.get('/test', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
  });

  server.listen(3000, () => {
    console.log('Game State Integration server running on port 3000');
    console.log('Test the server at: http://localhost:3000/test');
  });

  return server;
}

// Windows API functions for advanced overlay support
function setupWindowsOverlay() {
  if (process.platform !== 'win32') return;

  try {
    const { exec } = require('child_process');

    // Function to find CS2 window and make overlay work in fullscreen
    const findCS2Window = () => {
      exec('tasklist /FI "IMAGENAME eq cs2.exe" /FO CSV', (error, stdout) => {
        if (!error && stdout.includes('cs2.exe')) {
          console.log('CS2 detected - optimizing overlay for fullscreen');

          // Set overlay window properties for better fullscreen compatibility
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            // Use Windows API level functions for true overlay behavior
            const hwnd = overlayWindow.getNativeWindowHandle();

            // Try to set extended window styles for better fullscreen overlay
            exec(`powershell -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\"user32.dll\\")] public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong); [DllImport(\\"user32.dll\\")] public static extern int GetWindowLong(IntPtr hWnd, int nIndex); }'; [Win32]::SetWindowLong(${hwnd.readBigUInt64LE()}, -20, ([Win32]::GetWindowLong(${hwnd.readBigUInt64LE()}, -20) -bor 0x80000 -bor 0x20))"`, (err) => {
              if (!err) console.log('Applied Windows overlay optimizations');
            });
          }
        }
      });
    };

    // Check for CS2 every 10 seconds
    setInterval(findCS2Window, 10000);
    findCS2Window(); // Initial check

  } catch (e) {
    console.log('Could not setup Windows overlay optimizations:', e.message);
  }
}

function createOverlayWindow() {
  // Get all displays to handle multi-monitor setups
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();

  // Use the primary display bounds
  const { width, height, x, y } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
    width: width,
    height: height,
    x: x,
    y: y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: true, // Allow focus to capture mouse
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false, // Prevent throttling when not focused
    }
  });

  // Advanced Windows-specific overlay setup
  if (process.platform === 'win32') {
    overlayWindow.setSkipTaskbar(true);
    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Hook into Windows for better fullscreen support
    setupWindowsOverlay();
  }

  // Start with click-through enabled
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  overlayWindow.loadFile('overlay.html');

  // Show window after loading
  overlayWindow.once('ready-to-show', () => {
    overlayWindow.show();
    console.log('Overlay window ready');
  });

  // Handle click-through toggle with mouse capture management
  ipcMain.on('toggle-clickthrough', (event, enabled) => {
    console.log('Setting click-through:', enabled);

    if (!enabled) {
      // When enabling interaction, ensure window can capture mouse
      overlayWindow.setIgnoreMouseEvents(false);
      overlayWindow.focus();
      overlayWindow.moveTop();

      // Try to capture mouse from game
      if (process.platform === 'win32') {
        try {
          const { exec } = require('child_process');
          // Release mouse capture from other windows
          exec('powershell -Command "Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\"user32.dll\\")] public static extern bool ReleaseCapture(); }\'; [Win32]::ReleaseCapture()"');
        } catch (e) {
          console.log('Could not release mouse capture:', e.message);
        }
      }

      isOverlayVisible = true;
    } else {
      // When disabling interaction, enable click-through
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
      isOverlayVisible = false;
    }
  });

  // Handle overlay toggle from hotkeys
  ipcMain.on('toggle-overlay', () => {
    overlayWindow.webContents.send('toggle-overlay-from-hotkey');
  });

  // Periodically ensure overlay stays on top for fullscreen games
  setInterval(() => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      if (isOverlayVisible) {
        overlayWindow.moveTop();
        overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      }
    }
  }, 2000);

  // Dev tools for debugging
  if (process.argv.includes('--dev')) {
    overlayWindow.webContents.openDevTools();
  }
}

function registerGlobalHotkeys() {
  // F1 - Main toggle
  const ret1 = globalShortcut.register('F1', () => {
    console.log('F1 pressed - toggling overlay');
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.moveTop();
      overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      overlayWindow.webContents.send('toggle-overlay-from-hotkey');
    }
  });

  // Insert - Alternative toggle
  const ret2 = globalShortcut.register('Insert', () => {
    console.log('Insert pressed - toggling overlay');
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.moveTop();
      overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      overlayWindow.webContents.send('toggle-overlay-from-hotkey');
    }
  });

  // F2 - Force show and grab focus
  const ret3 = globalShortcut.register('F2', () => {
    console.log('F2 pressed - force show overlay with mouse capture');
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.show();
      overlayWindow.focus();
      overlayWindow.moveTop();
      overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);

      // Force enable interaction
      overlayWindow.setIgnoreMouseEvents(false);
      isOverlayVisible = true;

      overlayWindow.webContents.send('force-show-overlay');
    }
  });

  // F3 - Emergency hide (in case mouse gets stuck)
  const ret4 = globalShortcut.register('F3', () => {
    console.log('F3 pressed - emergency hide overlay');
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
      overlayWindow.webContents.send('force-hide-overlay');
      isOverlayVisible = false;
    }
  });

  console.log('Hotkeys registered:');
  console.log('F1/Insert - Toggle overlay');
  console.log('F2 - Force show with mouse capture');
  console.log('F3 - Emergency hide');
}

app.whenReady().then(() => {
  createOverlayWindow();
  gameStateServer = startGameStateServer();
  registerGlobalHotkeys();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
