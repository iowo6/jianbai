import type {
  BasicsData,
  ModuleType,
  ResumeData,
  ResumeItem,
  ResumeModule,
  StorageFile,
  ThemeSettings
} from './types'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/* ---------------- 字体与颜色预设 ---------------- */

export const FONT_PRESETS: { id: string; label: string; stack: string }[] = [
  {
    id: 'system',
    label: '系统默认（无衬线）',
    stack: '"Segoe UI", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif'
  },
  {
    id: 'yahei',
    label: '微软雅黑',
    stack: '"Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif'
  },
  {
    id: 'song',
    label: '宋体（衬线）',
    stack: 'Georgia, "Times New Roman", Songti, SimSun, serif'
  },
  {
    id: 'kai',
    label: '楷体',
    stack: 'KaiTi, Kaiti, STKaiti, serif'
  },
  {
    id: 'fangsong',
    label: '仿宋',
    stack: 'FangSong, STFangsong, serif'
  }
]

export function fontStack(id: string): string {
  return FONT_PRESETS.find((f) => f.id === id)?.stack ?? FONT_PRESETS[0].stack
}

export const ACCENT_PRESETS = [
  '#1f2328', // 纯黑（默认·极简）
  '#2f6fed', // 蓝
  '#0e7490', // 青
  '#065f46', // 墨绿
  '#9a3412', // 赭
  '#6d28d9', // 紫
  '#b91c1c' // 红
]

/* ---------------- 默认主题（极简：纯文本、装饰全关） ---------------- */

export function defaultTheme(): ThemeSettings {
  return {
    accent: '#1f2328',
    font: 'system',
    fontSize: 10.5,
    lineHeight: 1.5,
    margin: 16,
    sectionGap: 6,
    headerAlign: 'left',
    divider: true, // 细分隔线：唯一的默认装饰，贴合极简排版
    icons: false,
    photo: false,
    tagsPill: false,
    skillBars: false,
    uppercaseHeadings: false
  }
}

/* ---------------- 模块工厂 ---------------- */

export const MODULE_META: Record<ModuleType, { label: string; addable: boolean }> = {
  basics: { label: '基本信息', addable: false },
  summary: { label: '自我评价', addable: true },
  experience: { label: '工作经历', addable: true },
  education: { label: '教育经历', addable: true },
  projects: { label: '项目经历', addable: true },
  skills: { label: '专业技能', addable: true },
  certificates: { label: '证书荣誉', addable: true },
  custom: { label: '自定义模块', addable: true }
}

export function emptyItem(): ResumeItem {
  return { id: uid(), title: '', subtitle: '', start: '', end: '', location: '', bullets: '', tags: [], level: 0 }
}

function emptyBasics(): BasicsData {
  return { name: '', headline: '', photo: '', contacts: [] }
}

export function newModule(type: ModuleType, title?: string): ResumeModule {
  const m: ResumeModule = {
    id: uid(),
    type,
    title: title ?? MODULE_META[type].label,
    visible: true,
    collapsed: false,
    column: type === 'skills' || type === 'certificates' || type === 'summary' ? 'side' : 'main',
    text: '',
    items: [],
    data: emptyBasics()
  }
  if (type !== 'basics' && type !== 'summary' && type !== 'custom') m.items = [emptyItem()]
  return m
}

/* ---------------- 新建简历 ---------------- */

export function blankResume(name = '我的简历'): ResumeData {
  const now = Date.now()
  return {
    id: uid(),
    name,
    template: 'single',
    theme: defaultTheme(),
    page: { size: 'A4' },
    customCss: '',
    modules: [
      newModule('basics'),
      newModule('education'),
      newModule('experience'),
      newModule('projects'),
      newModule('skills'),
      newModule('summary')
    ],
    createdAt: now,
    updatedAt: now
  }
}

export function sampleResume(): ResumeData {
  const r = blankResume('示例简历 · 前端开发工程师')
  const basics = r.modules.find((m) => m.type === 'basics')!
  basics.data = {
    name: '李明',
    headline: '前端开发工程师',
    photo: '',
    contacts: [
      { id: uid(), label: '电话', value: '138-0000-0000' },
      { id: uid(), label: '邮箱', value: 'liming@example.com' },
      { id: uid(), label: '城市', value: '上海' },
      { id: uid(), label: 'GitHub', value: 'github.com/liming' }
    ]
  }

  const list = (pairs: Partial<ResumeItem>[]): ResumeItem[] => pairs.map((p) => ({ ...emptyItem(), ...p }))

  const edu = r.modules.find((m) => m.type === 'education')!
  edu.items = list([
    {
      title: '华东师范大学',
      subtitle: '计算机科学与技术 · 本科',
      start: '2019.09',
      end: '2023.06',
      location: '上海',
      bullets: '<ul><li>GPA 3.7 / 4.0，连续三年获校级奖学金</li><li>主修课程：数据结构、操作系统、计算机网络、数据库原理</li></ul>'
    }
  ])

  const exp = r.modules.find((m) => m.type === 'experience')!
  exp.items = list([
    {
      title: '前端开发工程师',
      subtitle: '某科技有限公司',
      start: '2023.07',
      end: '至今',
      location: '上海',
      bullets:
        '<ul><li>负责公司核心 SaaS 平台的前端架构与迭代，服务 10 万+ 企业用户</li><li>主导首屏性能优化专项，页面加载时间从 3.2s 降至 1.1s</li><li>搭建团队组件库与工程化体系，需求平均交付周期缩短 40%</li></ul>',
      tags: ['React', 'TypeScript', 'Vite']
    },
    {
      title: '前端开发实习生',
      subtitle: '某互联网公司',
      start: '2022.06',
      end: '2022.12',
      location: '上海',
      bullets: '<ul><li>参与营销活动页开发，独立交付 10+ 个活动页面</li><li>封装埋点 SDK，统一 20+ 个业务的埋点上报</li></ul>'
    }
  ])

  const proj = r.modules.find((m) => m.type === 'projects')!
  proj.items = list([
    {
      title: '简历制作机',
      subtitle: '个人开源项目',
      start: '2024.01',
      end: '至今',
      bullets: '<ul><li>一款高度自定义的简历编辑器，支持模板、主题定制与 PDF 导出</li><li>采用内容与样式分离的数据结构，一份内容可套用任意模板</li></ul>',
      tags: ['Electron', 'React', 'TypeScript']
    },
    {
      title: '实时数据可视化大屏',
      subtitle: '校级创新项目 · 负责人',
      start: '2022.03',
      end: '2022.06',
      bullets: '<ul><li>基于 ECharts 开发实时数据大屏，支持 30+ 种图表配置</li><li>获校级优秀创新项目</li></ul>'
    }
  ])

  const skills = r.modules.find((m) => m.type === 'skills')!
  skills.items = list([
    { title: '前端开发', tags: ['React', 'Vue', 'TypeScript', 'HTML / CSS'] },
    { title: '工程化', tags: ['Vite', 'Webpack', 'CI / CD', '单元测试'] },
    { title: '其他', tags: ['Node.js', 'Git', 'Docker', 'MySQL'] }
  ])

  const summary = r.modules.find((m) => m.type === 'summary')!
  summary.text =
    '<p>三年前端开发经验，熟悉 React 技术栈与前端工程化体系，关注性能优化与研发效率；有从 0 到 1 搭建前端基础设施的经验，具备良好的沟通协作与技术分享习惯。</p>'

  return r
}

export function emptyStorage(): StorageFile {
  return { version: 1, activeId: null, resumes: [] }
}
