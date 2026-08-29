export type PageSize = 'A4' | 'Letter'
export type TemplateId = 'single' | 'sidebar'
export type ModuleType =
  | 'basics'
  | 'summary'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'certificates'
  | 'custom'

export interface BasicsContact {
  id: string
  label: string
  value: string
}

export interface BasicsData {
  name: string
  headline: string
  photo: string // dataURL，可为空
  contacts: BasicsContact[]
}

export interface ResumeItem {
  id: string
  title: string
  subtitle: string
  start: string
  end: string
  location: string
  bullets: string // 富文本 HTML
  tags: string[]
  level: number // 0-5，仅技能模块使用
}

export interface ResumeModule {
  id: string
  type: ModuleType
  title: string
  visible: boolean
  collapsed?: boolean // 编辑器中是否折叠（仅影响编辑界面）
  column: 'main' | 'side' // 双栏模板下该模块所在列
  text: string // summary / custom 的富文本 HTML
  items: ResumeItem[]
  data: BasicsData // 仅 basics 使用
}

export interface ThemeSettings {
  accent: string
  font: string
  fontSize: number // pt
  lineHeight: number
  margin: number // mm
  sectionGap: number // mm
  headerAlign: 'left' | 'center'
  divider: boolean
  icons: boolean
  photo: boolean
  tagsPill: boolean
  skillBars: boolean
  uppercaseHeadings: boolean
}

export interface ResumeData {
  id: string
  name: string
  template: TemplateId
  theme: ThemeSettings
  page: { size: PageSize }
  customCss: string
  modules: ResumeModule[]
  createdAt: number
  updatedAt: number
}

export interface StorageFile {
  version: 1
  activeId: string | null
  resumes: ResumeData[]
}

export interface Api {
  load(): Promise<StorageFile | null>
  saveAll(data: StorageFile): Promise<boolean>
  exportPdf(p: { id: string; name: string }): Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
  importJson(): Promise<{ resumes?: ResumeData[]; error?: string } | null>
  exportJson(data: StorageFile): Promise<{ ok: boolean; path?: string; canceled?: boolean }>
  importParse(): Promise<{ text?: string; fileName?: string; error?: string } | null>
  printReady(p: { id: string; size: PageSize }): void
  showItem(p: string): void
  focusWindow(): void
}
