import type { Api } from './types'

declare global {
  interface Window {
    api?: Api
  }
}

const fallback: Api = {
  load: async () => {
    try {
      const raw = localStorage.getItem('resume-maker-data')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  saveAll: async (data) => {
    localStorage.setItem('resume-maker-data', JSON.stringify(data))
    return true
  },
  exportPdf: async () => ({ ok: false, error: '请在桌面版中使用 PDF 导出' }),
  importJson: async () => ({ error: '请在桌面版中使用导入功能' }),
  exportJson: async () => ({ ok: false, error: '请在桌面版中使用导出功能' }),
  importParse: async () => ({ error: '请在桌面版中使用导入功能' }),
  printReady: () => {},
  showItem: () => {},
  focusWindow: () => {}
}

export const api: Api = window.api ?? fallback
