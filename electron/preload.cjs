const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  backendUrl: 'http://localhost:3614/api',
  getDesktopAudioSource: () => ipcRenderer.invoke('get-desktop-audio-source'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window-state-changed', (_event, maximized) => callback(maximized));
  },
});
