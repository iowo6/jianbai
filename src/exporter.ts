import { useStore } from './store'
import { api } from './api'

/** 原生保存对话框关闭后恢复编辑焦点（否则 TSF 输入上下文损坏，键盘失效） */
function restoreEditorFocus(): void {
  api.focusWindow().then(() => {
    const ae = document.activeElement as HTMLElement | null
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) {
      ae.blur()
      ae.focus()
    } else {
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.module-card .field input'))
      inputs.find((el) => el.offsetParent !== null)?.focus()
    }
  })
}

/** 将当前简历导出为 PDF（先落盘再渲染，保证导出内容与编辑一致） */
export async function exportActivePdf(): Promise<void> {
  const state = useStore.getState()
  const resume = state.resumes.find((r) => r.id === state.activeId)
  if (!resume) return
  await api.saveAll({ version: 1, activeId: state.activeId, resumes: state.resumes })
  const res = await api.exportPdf({ id: resume.id, name: resume.name })
  restoreEditorFocus()
  if (res.ok && res.path) {
    state.showToast('PDF 已导出：' + res.path)
  } else if (res.error) {
    state.showToast('导出失败：' + res.error)
  }
}
