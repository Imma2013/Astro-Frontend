import { ipcRenderer, contextBridge, type IpcRendererEvent } from 'electron';

console.debug('Astro Preload Initialized');

const ipc = {
  invoke(channel: string, ...args: any[]) {
    return ipcRenderer.invoke(channel, ...args);
  },
  on(channel: string, func: (...args: any[]) => void) {
    const subscription = (event: IpcRendererEvent, ...args: any[]) => func(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
};

// High-performance API for Astro Desktop
const astroNative = {
  // Engine Control
  startEngine: (modelPath: string, options: any) => ipcRenderer.invoke('start-engine', modelPath, options),
  stopEngine: () => ipcRenderer.invoke('stop-engine'),
  checkHealth: () => ipcRenderer.invoke('check-engine-health'),
  
  // Model Management
  downloadModel: (url: string, filename: string) => ipcRenderer.invoke('download-model', url, filename),
  onDownloadProgress: (callback: (progress: any) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('download-progress', subscription);
    return () => ipcRenderer.removeListener('download-progress', subscription);
  },

  // Filesystem (Cursor-like)
  openDirectory: () => ipcRenderer.invoke('open-directory'),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
  
  // System
  getHardwareInfo: () => ipcRenderer.invoke('get-hardware-info'),
};

contextBridge.exposeInMainWorld('ipc', ipc);
contextBridge.exposeInMainWorld('astroNative', astroNative);
