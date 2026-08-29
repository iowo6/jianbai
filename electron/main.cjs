const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

// 数据统一存放在 %APPDATA%/简白，开发与打包版共用，便于备份
// 兼容迁移：旧版本目录名为「简历制作机」，首次启动自动搬迁数据
const APP_DATA_DIR = path.join(app.getPath('appData'), '简白')
const LEGACY_DATA_DIR = path.join(app.getPath('appData'), '简历制作机')
try {
  if (!fs.existsSync(path.join(APP_DATA_DIR, 'resumes.json')) && fs.existsSync(path.join(LEGACY_DATA_DIR, 'resumes.json'))) {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true })
    fs.copyFileSync(path.join(LEGACY_DATA_DIR, 'resumes.json'), path.join(APP_DATA_DIR, 'resumes.json'))
  }
} catch {
  /* 迁移失败则沿用新目录（空数据） */
}
app.setPath('userData', APP_DATA_DIR)

let mainWindow = null
let printWaiter = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1160,
    minHeight: 700,
    backgroundColor: '#f3f4f6',
    title: '简白',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  Menu.setApplicationMenu(null)

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 简历内的外部链接改用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/* ---------------- 本地存储 ---------------- */

function storageFile() {
  return path.join(app.getPath('userData'), 'resumes.json')
}

ipcMain.handle('storage:load', () => {
  try {
    const raw = fs.readFileSync(storageFile(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
})

ipcMain.handle('storage:save', (_e, data) => {
  const file = storageFile()
  const tmp = file + '.tmp'
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(tmp, JSON.stringify(data), 'utf-8')
  fs.renameSync(tmp, file)
  return true
})

/* ---------------- PDF 导出（隐藏窗口渲染 → printToPDF） ---------------- */

ipcMain.on('print:ready', () => {
  if (printWaiter) {
    printWaiter()
    printWaiter = null
  }
})

function waitPrintReady(timeout = 15000) {
  return new Promise((resolve, reject) => {
    printWaiter = resolve
    setTimeout(() => {
      if (printWaiter) {
        printWaiter = null
        reject(new Error('渲染超时'))
      }
    }, timeout)
  })
}

async function renderResumePdf(id) {
  const pwin = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  const base = VITE_DEV_SERVER_URL
    ? VITE_DEV_SERVER_URL
    : 'file://' + path.join(__dirname, '../dist/index.html').replace(/\\/g, '/')
  await pwin.loadURL(`${base}?view=print&id=${encodeURIComponent(id)}`)
  await waitPrintReady()
  const buf = await pwin.webContents.printToPDF({
    printBackground: true,
    preferCSSPageSize: true,
    margins: { top: 0, bottom: 0, left: 0, right: 0 }
  })
  pwin.destroy()
  return buf
}

ipcMain.handle('export:pdf', async (_e, { id, name }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '导出 PDF',
      defaultPath: `${name || '简历'}.pdf`,
      filters: [{ name: 'PDF 文档', extensions: ['pdf'] }]
    })
    if (canceled || !filePath) return { ok: false, canceled: true }
    const buf = await renderResumePdf(id)
    fs.writeFileSync(filePath, buf)
    return { ok: true, path: filePath }
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) }
  }
})

/* ---------------- JSON 备份 / 恢复 ---------------- */

ipcMain.handle('data:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '导入简历备份',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (canceled || !filePaths.length) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'))
    const list = Array.isArray(parsed) ? parsed : parsed.resumes
    if (!Array.isArray(list)) return { error: '文件格式不正确' }
    return { resumes: list }
  } catch (err) {
    return { error: '文件解析失败：' + err.message }
  }
})

ipcMain.handle('data:export', async (_e, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '导出简历备份',
    defaultPath: '简历备份.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (canceled || !filePath) return { ok: false, canceled: true }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  return { ok: true, path: filePath }
})

ipcMain.handle('shell:show-item', (_e, p) => {
  if (p && fs.existsSync(p)) shell.showItemInFolder(p)
})

// 把窗口拉回前台并赋予焦点（修复新建/切换简历后输入框不响应键盘的问题）
ipcMain.on('focus-window', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
  mainWindow.webContents.focus()
})

/* ---------------- 简历文件导入解析（PDF / DOCX / TXT / MD → 纯文本） ---------------- */

ipcMain.handle('import:parse', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '导入简历文件',
    filters: [{ name: '简历文件', extensions: ['pdf', 'docx', 'txt', 'md'] }],
    properties: ['openFile']
  })
  if (canceled || !filePaths.length) return null
  const file = filePaths[0]
  const ext = path.extname(file).toLowerCase()
  try {
    let text = ''
    if (ext === '.pdf') {
      const { PDFParse } = require('pdf-parse')
      const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(file)) })
      try {
        const res = await parser.getText()
        text = res.text || ''
      } finally {
        await parser.destroy()
      }
    } else if (ext === '.docx') {
      const mammoth = require('mammoth')
      const res = await mammoth.extractRawText({ path: file })
      text = res.value || ''
    } else {
      text = fs.readFileSync(file, 'utf-8')
    }
    if (!text.trim()) return { error: '未能从文件中提取到文字（可能是图片型 PDF）' }
    return { text, fileName: path.basename(file) }
  } catch (err) {
    return { error: String(err && err.message ? err.message : err) }
  }
})

/* ---------------- 生命周期 ---------------- */

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
