/**
 * PDF 导出链路端到端测试（开发用）
 * 用法：npm run build && npx electron scripts/test-export.cjs [输出文件路径]
 * 在隔离的临时 userData 中写入一份示例简历，走真实渲染管线生成 PDF。
 */
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

const outPath = process.argv[2] || path.join(__dirname, '..', 'test-output.pdf')

// 使用独立临时目录，避免污染真实用户数据
const tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-maker-test-'))
app.setPath('userData', tmpUserData)

const sample = {
  version: 1,
  activeId: 'test1',
  resumes: [
    {
      id: 'test1',
      name: '测试简历',
      template: 'single',
      page: { size: 'A4' },
      customCss: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      theme: {
        accent: '#1f2328',
        font: 'system',
        fontSize: 10.5,
        lineHeight: 1.5,
        margin: 16,
        sectionGap: 6,
        headerAlign: 'left',
        divider: true,
        icons: false,
        photo: false,
        tagsPill: false,
        skillBars: false,
        uppercaseHeadings: false
      },
      modules: [
        {
          id: 'm0',
          type: 'basics',
          title: '基本信息',
          visible: true,
          column: 'main',
          text: '',
          items: [],
          data: {
            name: '李明',
            headline: '前端开发工程师',
            photo: '',
            contacts: [
              { id: 'c1', label: '电话', value: '138-0000-0000' },
              { id: 'c2', label: '邮箱', value: 'liming@example.com' },
              { id: 'c3', label: '城市', value: '上海' }
            ]
          }
        },
        {
          id: 'm1',
          type: 'experience',
          title: '工作经历',
          visible: true,
          column: 'main',
          text: '',
          data: { name: '', headline: '', photo: '', contacts: [] },
          items: [
            {
              id: 'i1',
              title: '前端开发工程师',
              subtitle: '某科技有限公司',
              start: '2023.07',
              end: '至今',
              location: '上海',
              bullets:
                '<ul><li>负责公司核心 SaaS 平台的前端架构与迭代，服务 10 万+ 企业用户</li><li>主导首屏性能优化专项，页面加载时间从 3.2s 降至 1.1s</li></ul>',
              tags: ['React', 'TypeScript'],
              level: 0
            },
            {
              id: 'i2',
              title: '前端开发实习生',
              subtitle: '某互联网公司',
              start: '2022.06',
              end: '2022.12',
              location: '',
              bullets: '<ul><li>参与营销活动页开发，独立交付 10+ 个活动页面</li></ul>',
              tags: [],
              level: 0
            }
          ]
        },
        {
          id: 'm2',
          type: 'education',
          title: '教育经历',
          visible: true,
          column: 'main',
          text: '',
          data: { name: '', headline: '', photo: '', contacts: [] },
          items: [
            {
              id: 'i3',
              title: '华东师范大学',
              subtitle: '计算机科学与技术 · 本科',
              start: '2019.09',
              end: '2023.06',
              location: '上海',
              bullets: '<ul><li>GPA 3.7 / 4.0，连续三年获校级奖学金</li></ul>',
              tags: [],
              level: 0
            }
          ]
        },
        {
          id: 'm3',
          type: 'skills',
          title: '专业技能',
          visible: true,
          column: 'main',
          text: '',
          data: { name: '', headline: '', photo: '', contacts: [] },
          items: [
            { id: 'i4', title: '前端开发', subtitle: '', start: '', end: '', location: '', bullets: '', tags: ['React', 'Vue', 'TypeScript'], level: 0 },
            { id: 'i5', title: '工程化', subtitle: '', start: '', end: '', location: '', bullets: '', tags: ['Vite', 'CI / CD'], level: 0 }
          ]
        },
        {
          id: 'm4',
          type: 'summary',
          title: '自我评价',
          visible: true,
          column: 'main',
          text: '<p>三年前端开发经验，熟悉 React 技术栈与前端工程化体系。</p>',
          data: { name: '', headline: '', photo: '', contacts: [] },
          items: []
        }
      ]
    }
  ]
}

fs.writeFileSync(path.join(tmpUserData, 'resumes.json'), JSON.stringify(sample), 'utf-8')

// 测试脚本独立于 electron/main.cjs 运行，需自行注册打印窗口用到的 IPC
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
    await win.loadURL('file://' + dist + '?view=print&id=test1')

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
    console.log('PDF_EXPORT_OK size=' + buf.length + ' path=' + outPath)
    win.destroy()
    app.exit(0)
  } catch (err) {
    console.error('PDF_EXPORT_FAIL', err)
    app.exit(1)
  }
})
