const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('storage:load'),
  saveAll: (data) => ipcRenderer.invoke('storage:save', data),
  exportPdf: (payload) => ipcRenderer.invoke('export:pdf', payload),
  importJson: () => ipcRenderer.invoke('data:import'),
  exportJson: (data) => ipcRenderer.invoke('data:export', data),
  importParse: () => ipcRenderer.invoke('import:parse'),
  printReady: (payload) => ipcRenderer.send('print:ready', payload),
  showItem: (p) => ipcRenderer.invoke('shell:show-item', p),
  focusWindow: () => ipcRenderer.invoke('focus-window')
})
