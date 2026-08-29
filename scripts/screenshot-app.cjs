/**
 * 生成软件工作区截图（docs/app-screenshot.png）
 * 在隔离的临时 userData 中加载示例简历，离屏窗口渲染后捕获页面，不触碰真实用户数据
 */
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

const outPath = path.join(__dirname, '..', 'docs', 'app-screenshot.png')
const tmpUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-shot-'))
app.setPath('userData', tmpUserData)

const blank = { title: '', subtitle: '', start: '', end: '', location: '', bullets: '', tags: [], level: 0 }
const item = (id, title, subtitle, start, end, bullets, tags) => ({
  id, title, subtitle, start, end, location: '上海', bullets, tags: tags || [], level: 0
})
const mod = (id, type, title, items, text) => ({
  id, type, title, visible: true, collapsed: false, column: 'main', text: text || '', items, data: { name: '', headline: '', photo: '', contacts: [] }
})

const sample = {
  version: 1,
  activeId: 's1',
  resumes: [
    {
      id: 's1',
      name: '示例简历 · 前端开发工程师',
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
        mod('m1', 'experience', '工作经历', [
          item('i1', '前端开发工程师', '某科技有限公司', '2023.07', '至今',
            '<ul><li>负责公司核心 SaaS 平台的前端架构与迭代，服务 10 万+ 企业用户</li><li>主导首屏性能优化专项，页面加载时间从 3.2s 降至 1.1s</li><li>搭建团队组件库与工程化体系，需求平均交付周期缩短 40%</li></ul>', ['React', 'TypeScript', 'Vite']),
          item('i2', '前端开发实习生', '某互联网公司', '2022.06', '2022.12',
            '<ul><li>参与营销活动页开发，独立交付 10+ 个活动页面</li><li>封装埋点 SDK，统一 20+ 个业务的埋点上报</li></ul>')
        ]),
        mod('m2', 'education', '教育经历', [
          item('i3', '华东师范大学', '计算机科学与技术 · 本科', '2019.09', '2023.06',
            '<ul><li>GPA 3.7 / 4.0，连续三年获校级奖学金</li><li>主修课程：数据结构、操作系统、计算机网络</li></ul>')
        ]),
        mod('m3', 'skills', '专业技能', [
          { ...blank, id: 'i4', title: '前端开发', tags: ['React', 'Vue', 'TypeScript'] },
          { ...blank, id: 'i5', title: '工程化', tags: ['Vite', 'CI / CD'] }
        ]),
        mod('m4', 'summary', '自我评价', [], '<p>三年前端开发经验，熟悉 React 技术栈与前端工程化体系。</p>')
      ]
    }
  ]
}
sample.resumes[0].modules[0].data = {
  name: '李明',
  headline: '前端开发工程师',
  photo: '',
  contacts: [
    { id: 'c1', label: '电话', value: '138-0000-0000' },
    { id: 'c2', label: '邮箱', value: 'liming@example.com' },
    { id: 'c3', label: '城市', value: '上海' },
    { id: 'c4', label: 'GitHub', value: 'github.com/liming' }
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
      width: 1500,
      height: 940,
      x: -2400,
      y: 0,
      show: true,
      backgroundColor: '#f3f4f6',
      webPreferences: {
        preload: path.join(__dirname, '..', 'electron', 'preload.cjs'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    })
    const dist = path.join(__dirname, '..', 'dist', 'index.html').replace(/\\/g, '/')
    await win.loadURL('file://' + dist)
    // 等渲染层完成加载、字体与预览分页稳定
    await new Promise((r) => setTimeout(r, 3000))
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1500, height: 940 })
    fs.writeFileSync(outPath, image.toPNG())
    console.log('SHOT_OK ' + outPath)
    win.destroy()
    app.exit(0)
  } catch (err) {
    console.error('SHOT_FAIL', err)
    app.exit(1)
  }
})
