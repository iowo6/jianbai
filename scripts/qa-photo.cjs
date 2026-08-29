/**
 * QA：验证照片按原始宽高比渲染（不裁剪）
 * 只读真实用户数据 → 隐藏窗口渲染 → printToPDF → 输出到临时目录
 */
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

const outPath = process.argv[2] || path.join(os.tmpdir(), 'qa-photo.pdf')
const realUserData = path.join(app.getPath('appData'), '简历制作机')
app.setPath('userData', realUserData)

ipcMain.handle('storage:load', () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(realUserData, 'resumes.json'), 'utf-8'))
  } catch {
    return null
  }
})

app.whenReady().then(async () => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(realUserData, 'resumes.json'), 'utf-8'))
    const id = data.resumes[0].id
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '..', 'electron', 'preload.cjs'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false
      }
    })
    const dist = path.join(__dirname, '..', 'dist', 'index.html').replace(/\\/g, '/')
    await win.loadURL('file://' + dist + '?view=print&id=' + encodeURIComponent(id))
    await new Promise((resolve, reject) => {
      ipcMain.once('print:ready', resolve)
      setTimeout(() => reject(new Error('print:ready 超时')), 15000)
    })
    const buf = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    })
    fs.writeFileSync(outPath, buf)
    console.log('QA_PDF_OK ' + outPath)
    win.destroy()
    app.exit(0)
  } catch (err) {
    console.error('QA_PDF_FAIL', err)
    app.exit(1)
  }
})
