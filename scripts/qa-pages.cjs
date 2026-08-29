/**
 * QA：验证内容超出 A4 时自动分页
 * 在隔离的临时 userData 中写入长简历 → 走真实渲染管线 → 输出 PDF 页数
 */
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

const outPath = process.argv[2] || path.join(os.tmpdir(), 'qa-pages.pdf')
const tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-maker-pages-'))
app.setPath('userData', tmpUserData)

const item = (id, n) => ({
  id,
  title: `岗位经历条目 ${n}`,
  subtitle: '某科技有限公司',
  start: '2020.01',
  end: '2021.01',
  location: '上海',
  bullets: `<ul><li>负责核心系统的设计与开发，条目 ${n} 的第一点描述内容。</li><li>优化性能与稳定性，条目 ${n} 的第二点描述内容，用于增加高度测试分页。</li><li>编写测试用例与文档，条目 ${n} 的第三点描述内容。</li></ul>`,
  tags: ['React', 'TypeScript'],
  level: 0
})

const blank = { title: '', subtitle: '', start: '', end: '', location: '', bullets: '', tags: [], level: 0 }
const mod = (id, type, title, items, text) => ({
  id,
  type,
  title,
  visible: true,
  collapsed: false,
  column: 'main',
  text: text || '',
  items,
  data: { name: '', headline: '', photo: '', contacts: [] }
})

const sample = {
  version: 1,
  activeId: 'p1',
  resumes: [
    {
      id: 'p1',
      name: '分页测试',
      template: 'single',
      page: { size: 'A4' },
      customCss: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      theme: {
        accent: '#1f2328', font: 'system', fontSize: 10.5, lineHeight: 1.5, margin: 16,
        sectionGap: 6, headerAlign: 'left', divider: true, icons: false, photo: false,
        tagsPill: false, skillBars: false, uppercaseHeadings: false
      },
      modules: [
        mod('m0', 'basics', '基本信息', [], ''),
        mod('m1', 'experience', '工作经历', Array.from({ length: 12 }, (_, i) => item('i' + i, i + 1)))
      ]
    }
  ]
}
sample.resumes[0].modules[0].data = {
  name: '分页测试',
  headline: '自动化验证',
  photo: '',
  contacts: [
    { id: 'c1', label: '电话', value: '138-0000-0000' },
    { id: 'c2', label: '邮箱', value: 'test@example.com' }
  ]
}

fs.writeFileSync(path.join(tmpUserData, 'resumes.json'), JSON.stringify(sample), 'utf-8')

ipcMain.handle('storage:load', () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(tmpUserData, 'resumes.json'), 'utf-8'))
  } catch {
    return null
  }
})

app.whenReady().then(async () => {
  try {
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
    await win.loadURL('file://' + dist + '?view=print&id=p1')
    await new Promise((resolve, reject) => {
      ipcMain.once('print:ready', resolve)
      setTimeout(() => reject(new Error('print:ready 超时')), 15000)
    })
    await new Promise((r) => setTimeout(r, 300))
    const info = await win.webContents.executeJavaScript(`(() => {
      const m = document.querySelector('.rz-measure')
      const blocks = m ? Array.from(m.children).map(n => n.offsetHeight) : []
      const doc = document.querySelector('.rz-doc')
      return {
        blocks,
        measureWidth: m ? getComputedStyle(m).width : null,
        docPages: doc ? doc.querySelectorAll('.rz-paper').length : 0,
        pageHeights: doc ? Array.from(doc.querySelectorAll('.rz-paper')).map(p => p.offsetHeight) : []
      }
    })()`)
    console.log('MEASURE ' + JSON.stringify(info))
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
