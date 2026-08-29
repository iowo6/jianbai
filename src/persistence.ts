import { useStore } from './store'
import { api } from './api'

let timer: ReturnType<typeof setTimeout> | null = null

/** 内容变化后防抖保存 */
export function scheduleSave(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    void flushSave()
  }, 400)
}

/** 立即保存（Ctrl+S / 导出前） */
export async function flushSave(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  const s = useStore.getState()
  if (!s.loaded) return
  await api.saveAll({ version: 1, activeId: s.activeId, resumes: s.resumes })
  useStore.getState().setSaved()
}

export function cancelPendingSave(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}
