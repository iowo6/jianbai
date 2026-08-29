import { create } from 'zustand'
import type { ModuleType, ResumeData, ResumeModule, StorageFile, ThemeSettings } from './types'
import { MODULE_META, blankResume, emptyItem, newModule, sampleResume, uid } from './defaults'

interface AppState {
  loaded: boolean
  resumes: ResumeData[]
  activeId: string | null
  savedAt: number | null
  toast: string | null
  histories: Record<string, { past: ResumeData[]; future: ResumeData[] }>
  init(): Promise<void>
  setActive(id: string): void
  createBlank(): void
  createSample(): void
  duplicate(id: string): void
  remove(id: string): void
  rename(id: string, name: string): void
  importResumes(list: ResumeData[]): void
  showToast(msg: string): void
  clearToast(): void
  setSaved(): void
  undo(): void
  redo(): void

  // 针对当前简历的操作
  setTemplate(t: ResumeData['template']): void
  patchTheme(p: Partial<ThemeSettings>): void
  setPage(size: ResumeData['page']['size']): void
  setCustomCss(css: string): void
  renameModule(moduleId: string, title: string): void
  updateModuleColumn(moduleId: string, column: 'main' | 'side'): void
  toggleModuleCollapsed(moduleId: string): void
  toggleModuleVisible(moduleId: string): void
  removeModule(moduleId: string): void
  addModule(type: ModuleType): void
  moveModule(from: number, to: number): void
  updateBasics(patch: Partial<ResumeModule['data']>): void
  addContact(label?: string): void
  updateContact(cid: string, patch: { label?: string; value?: string }): void
  removeContact(cid: string): void
  setModuleText(moduleId: string, text: string): void
  addItem(moduleId: string): void
  updateItem(moduleId: string, itemId: string, patch: Partial<ResumeModule['items'][number]>): void
  removeItem(moduleId: string, itemId: string): void
  moveItem(moduleId: string, itemId: string, dir: -1 | 1): void
  reorderItem(moduleId: string, from: number, to: number): void
}

function clone<T>(v: T): T {
  return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v))
}

export const useStore = create<AppState>()((set, get) => {
  let lastPushAt = 0
  let applyingHistory = false

  // 撤销历史：连续输入（<400ms）合并为一步
  const pushHistory = (id: string) => {
    if (applyingHistory) return
    const now = Date.now()
    const cur = get().resumes.find((r) => r.id === id)
    if (!cur) return
    if (now - lastPushAt > 400) {
      const h = get().histories[id] ?? { past: [], future: [] }
      set({
        histories: {
          ...get().histories,
          [id]: { past: [...h.past.slice(-49), clone(cur)], future: [] }
        }
      })
    }
    lastPushAt = now
  }

  const commit = (updater: (r: ResumeData) => void) => {
    const { activeId, resumes } = get()
    if (!activeId) return
    pushHistory(activeId)
    set({
      resumes: resumes.map((r) => {
        if (r.id !== activeId) return r
        const c = clone(r)
        updater(c)
        c.updatedAt = Date.now()
        return c
      })
    })
  }

  const mutateModule = (moduleId: string, fn: (m: ResumeModule) => void) => {
    commit((r) => {
      const m = r.modules.find((x) => x.id === moduleId)
      if (m) fn(m)
    })
  }

  return {
    loaded: false,
    resumes: [],
    activeId: null,
    savedAt: null,
    toast: null,
    histories: {},

    async init() {
      let data: StorageFile | null = null
      try {
        data = await (window.api ? window.api.load() : fallbackLoad())
      } catch {
        data = null
      }
      if (data && Array.isArray(data.resumes) && data.resumes.length > 0) {
        set({ resumes: data.resumes, activeId: data.activeId ?? data.resumes[0].id, loaded: true })
      } else {
        const sample = sampleResume()
        set({ resumes: [sample], activeId: sample.id, loaded: true })
      }
    },

    setActive(id) {
      set({ activeId: id })
    },

    createBlank() {
      const r = blankResume()
      set({ resumes: [...get().resumes, r], activeId: r.id })
    },

    createSample() {
      const r = sampleResume()
      set({ resumes: [...get().resumes, r], activeId: r.id })
    },

    duplicate(id) {
      const src = get().resumes.find((r) => r.id === id)
      if (!src) return
      const copy = clone(src)
      copy.id = uid()
      copy.name = src.name + ' 副本'
      copy.updatedAt = Date.now()
      set({ resumes: [...get().resumes, copy], activeId: copy.id })
    },

    remove(id) {
      const rest = get().resumes.filter((r) => r.id !== id)
      const activeId = get().activeId === id ? rest[0]?.id ?? null : get().activeId
      const histories = { ...get().histories }
      delete histories[id]
      set({ resumes: rest, activeId, histories })
    },

    rename(id, name) {
      pushHistory(id)
      set({
        resumes: get().resumes.map((r) => (r.id === id ? { ...r, name, updatedAt: Date.now() } : r))
      })
    },

    undo() {
      const id = get().activeId
      if (!id) return
      const h = get().histories[id]
      if (!h || h.past.length === 0) return
      const prev = h.past[h.past.length - 1]
      const current = get().resumes.find((r) => r.id === id)
      if (!current) return
      applyingHistory = true
      set({
        resumes: get().resumes.map((r) => (r.id === id ? clone(prev) : r)),
        histories: {
          ...get().histories,
          [id]: { past: h.past.slice(0, -1), future: [...h.future.slice(-49), clone(current)] }
        }
      })
      applyingHistory = false
      lastPushAt = 0
    },

    redo() {
      const id = get().activeId
      if (!id) return
      const h = get().histories[id]
      if (!h || h.future.length === 0) return
      const next = h.future[h.future.length - 1]
      const current = get().resumes.find((r) => r.id === id)
      if (!current) return
      applyingHistory = true
      set({
        resumes: get().resumes.map((r) => (r.id === id ? clone(next) : r)),
        histories: {
          ...get().histories,
          [id]: { past: [...h.past.slice(-49), clone(current)], future: h.future.slice(0, -1) }
        }
      })
      applyingHistory = false
      lastPushAt = 0
    },

    importResumes(list) {
      const imported = list
        .filter((r) => r && typeof r === 'object' && Array.isArray(r.modules))
        .map((r) => ({ ...r, id: uid() }))
      if (!imported.length) return
      set({ resumes: [...get().resumes, ...imported], activeId: imported[0].id })
    },

    showToast(msg) {
      set({ toast: msg })
    },

    clearToast() {
      set({ toast: null })
    },

    setSaved() {
      set({ savedAt: Date.now() })
    },

    setTemplate(t) {
      commit((r) => {
        r.template = t
        // 切到双栏时，把常见侧栏模块自动归到侧栏
        if (t === 'sidebar') {
          for (const m of r.modules) {
            if (['skills', 'certificates', 'summary'].includes(m.type)) m.column = 'side'
          }
        }
      })
    },

    patchTheme(p) {
      commit((r) => {
        r.theme = { ...r.theme, ...p }
      })
    },

    setPage(size) {
      commit((r) => {
        r.page.size = size
      })
    },

    setCustomCss(css) {
      commit((r) => {
        r.customCss = css
      })
    },

    renameModule(moduleId, title) {
      mutateModule(moduleId, (m) => {
        m.title = title
      })
    },

    updateModuleColumn(moduleId, column) {
      mutateModule(moduleId, (m) => {
        m.column = column
      })
    },

    toggleModuleCollapsed(moduleId) {
      mutateModule(moduleId, (m) => {
        m.collapsed = !m.collapsed
      })
    },

    toggleModuleVisible(moduleId) {
      mutateModule(moduleId, (m) => {
        if (m.type === 'basics') return // 基本信息固定显示，不可隐藏
        m.visible = !m.visible
      })
    },

    removeModule(moduleId) {
      commit((r) => {
        const m = r.modules.find((x) => x.id === moduleId)
        if (m && m.type === 'basics') return
        r.modules = r.modules.filter((x) => x.id !== moduleId)
      })
    },

    addModule(type) {
      if (!MODULE_META[type].addable) return
      commit((r) => {
        r.modules.push(newModule(type))
      })
    },

    moveModule(from, to) {
      commit((r) => {
        if (from < 0 || to < 0 || from >= r.modules.length || to >= r.modules.length) return
        const [m] = r.modules.splice(from, 1)
        r.modules.splice(to, 0, m)
      })
    },

    updateBasics(patch) {
      const { activeId } = get()
      if (!activeId) return
      const active = get().resumes.find((r) => r.id === activeId)
      const basics = active?.modules.find((m) => m.type === 'basics')
      if (!basics) return
      mutateModule(basics.id, (m) => {
        m.data = { ...m.data, ...patch }
      })
    },

    addContact(label?: string) {
      const basics = get().resumes.find((r) => r.id === get().activeId)?.modules.find((m) => m.type === 'basics')
      if (!basics) return
      mutateModule(basics.id, (m) => {
        m.data.contacts.push({ id: uid(), label: label ?? '', value: '' })
      })
    },

    updateContact(cid, patch) {
      const basics = get().resumes.find((r) => r.id === get().activeId)?.modules.find((m) => m.type === 'basics')
      if (!basics) return
      mutateModule(basics.id, (m) => {
        const c = m.data.contacts.find((x) => x.id === cid)
        if (c) Object.assign(c, patch)
      })
    },

    removeContact(cid) {
      const basics = get().resumes.find((r) => r.id === get().activeId)?.modules.find((m) => m.type === 'basics')
      if (!basics) return
      mutateModule(basics.id, (m) => {
        m.data.contacts = m.data.contacts.filter((x) => x.id !== cid)
      })
    },

    setModuleText(moduleId, text) {
      mutateModule(moduleId, (m) => {
        m.text = text
      })
    },

    addItem(moduleId) {
      mutateModule(moduleId, (m) => {
        m.items.push(emptyItem())
      })
    },

    updateItem(moduleId, itemId, patch) {
      mutateModule(moduleId, (m) => {
        const it = m.items.find((x) => x.id === itemId)
        if (it) Object.assign(it, patch)
      })
    },

    removeItem(moduleId, itemId) {
      mutateModule(moduleId, (m) => {
        m.items = m.items.filter((x) => x.id !== itemId)
      })
    },

    moveItem(moduleId, itemId, dir) {
      mutateModule(moduleId, (m) => {
        const i = m.items.findIndex((x) => x.id === itemId)
        const j = i + dir
        if (i < 0 || j < 0 || j >= m.items.length) return
        const [it] = m.items.splice(i, 1)
        m.items.splice(j, 0, it)
      })
    },

    reorderItem(moduleId, from, to) {
      mutateModule(moduleId, (m) => {
        if (from < 0 || to < 0 || from >= m.items.length || to >= m.items.length) return
        const [it] = m.items.splice(from, 1)
        m.items.splice(to, 0, it)
      })
    }
  }
})

/* 浏览器开发模式下的本地兜底（与 api.ts 相同逻辑） */
function fallbackLoad(): Promise<StorageFile | null> {
  try {
    const raw = localStorage.getItem('resume-maker-data')
    return Promise.resolve(raw ? JSON.parse(raw) : null)
  } catch {
    return Promise.resolve(null)
  }
}
