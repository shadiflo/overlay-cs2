// preload.js - Bridge between main and renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onGameStateUpdate: (callback) => {
    ipcRenderer.on('game-state-update', callback);
  },
  toggleClickthrough: (enabled) => {
    ipcRenderer.send('toggle-clickthrough', enabled);
  },
  onHotkeyToggle: (callback) => {
    ipcRenderer.on('toggle-overlay-from-hotkey', callback);
  },
  onForceShow: (callback) => {
    ipcRenderer.on('force-show-overlay', callback);
  },
  onForceHide: (callback) => {
    ipcRenderer.on('force-hide-overlay', callback);
  }
});
