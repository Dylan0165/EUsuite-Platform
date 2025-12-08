const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods die de renderer process kan gebruiken
contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  saveFileAs: (data) => ipcRenderer.invoke('save-file-as', data),
  exportFile: (data) => ipcRenderer.invoke('export-file', data),
  openFile: () => ipcRenderer.invoke('open-file'),
  exportPDF: (htmlContent) => ipcRenderer.invoke('export-pdf', htmlContent)
});
