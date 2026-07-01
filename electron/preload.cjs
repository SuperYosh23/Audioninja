const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  backendUrl: 'http://localhost:3614/api',
  getDesktopAudioSource: () => ipcRenderer.invoke('get-desktop-audio-source'),
});
