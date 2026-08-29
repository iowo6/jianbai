import { useState } from 'react'
import type { ResumeData } from '../types'
import { useStore } from '../store'
import { api } from '../api'
import { parseResumeText } from '../import/parse'
import { Button } from './ui'
import { IconCopy, IconDownload, IconFileImport, IconFilePlus, IconKeyboard, IconSparkles, IconPlus, IconTrash, IconUpload } from './icons'

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function Rail({ resumes, activeId }: { resumes: ResumeData[]; activeId: string | null }) {
  const setActive = useStore((s) => s.setActive)
  const createBlank = useStore((s) => s.createBlank)
  const createSample = useStore((s) => s.createSample)
  const duplicate = useStore((s) => s.duplicate)
  const remove = useStore((s) => s.remove)
  const importResumes = useStore((s) => s.importResumes)
  const showToast = useStore((s) => s.showToast)
  const [helpOpen, setHelpOpen] = useState(false)

  const doImportFile = async () => {
    const res = await api.importParse()
    if (!res) return
    if (res.error) return showToast('导入失败：' + res.error)
    if (res.text !== undefined) {
      const baseName = (res.fileName || '导入的简历').replace(/\.(pdf|docx|txt|md)$/i, '')
      const r = parseResumeText(res.text, baseName)
      importResumes([r])
      showToast('已导入并解析，请检查内容后修正')
    }
  }

  const doImport = async () => {
    const res = await api.importJson()
    if (!res) return
    if (res.error) return showToast('导入失败：' + res.error)
    if (res.resumes?.length) {
      importResumes(res.resumes)
      showToast(`成功导入 ${res.resumes.length} 份简历`)
    }
  }

  const doExport = async () => {
    const state = useStore.getState()
    const res = await api.exportJson({ version: 1, activeId: state.activeId, resumes: state.resumes })
    if (res.ok) showToast('备份已导出：' + res.path)
  }

  const doRemove = (r: ResumeData) => {
    if (window.confirm(`确定删除「${r.name}」？该操作不可恢复。`)) remove(r.id)
  }

  return (
    <>
      <div className="brand">
        <div>
          <div className="brand-name">简白</div>
          <div className="brand-sub">极简简历编辑器</div>
        </div>
      </div>

      <div className="rail-actions">
        <Button variant="soft" onClick={createBlank}>
          <IconFilePlus size={14} /> 空白简历
        </Button>
        <Button variant="soft" onClick={createSample}>
          <IconSparkles size={14} /> 示例简历
        </Button>
      </div>

      <div className="resume-list">
        {resumes.map((r) => (
          <div
            key={r.id}
            className={`resume-item ${r.id === activeId ? 'active' : ''}`}
            onClick={() => setActive(r.id)}
          >
            <div className="resume-item-main">
              <div className="resume-item-name">{r.name || '未命名简历'}</div>
              <div className="resume-item-time">{fmtTime(r.updatedAt)} 修改</div>
            </div>
            <span className="resume-item-ops" onClick={(e) => e.stopPropagation()}>
              <button className="icon-btn" title="复制一份" onClick={() => duplicate(r.id)}>
                <IconCopy size={14} />
              </button>
              <button className="icon-btn danger" title="删除" onClick={() => doRemove(r)}>
                <IconTrash size={14} />
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="rail-footer">
        {helpOpen && (
          <div className="shortcut-panel">
            <div className="shortcut-row">
              <span>撤销 / 重做</span>
              <span className="keys">Ctrl+Z / Ctrl+Y</span>
            </div>
            <div className="shortcut-row">
              <span>立即保存</span>
              <span className="keys">Ctrl+S</span>
            </div>
            <div className="shortcut-row">
              <span>导出 PDF</span>
              <span className="keys">Ctrl+E</span>
            </div>
            <div className="shortcut-row">
              <span>新建简历</span>
              <span className="keys">Ctrl+N</span>
            </div>
            <div className="shortcut-row">
              <span>复制当前简历</span>
              <span className="keys">Ctrl+D</span>
            </div>
          </div>
        )}
        <button className="footer-link" onClick={() => void doImportFile()}>
          <IconFileImport size={13} /> 导入简历文件
        </button>
        <button className="footer-link" onClick={doImport}>
          <IconUpload size={13} /> 导入备份
        </button>
        <button className="footer-link" onClick={doExport}>
          <IconDownload size={13} /> 导出备份
        </button>
        <button className={`footer-link ${helpOpen ? 'active' : ''}`} onClick={() => setHelpOpen((o) => !o)}>
          <IconKeyboard size={13} /> 快捷键
        </button>
      </div>
    </>
  )
}
