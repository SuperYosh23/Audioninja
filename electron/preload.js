import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  backendUrl: 'http://localhost:5000',
});
