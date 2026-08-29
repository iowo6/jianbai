import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { exportActivePdf } from '../exporter'
import { Button, Input } from './ui'
import { IconCheck, IconDownload, IconMoon, IconRedo, IconSun, IconUndo } from './icons'

export function TopBar() {
  const activeId = useStore((s) => s.activeId)
  const resumes = useStore((s) => s.resumes)
  const rename = useStore((s) => s.rename)
  const savedAt = useStore((s) => s.savedAt)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const pastCount = useStore((s) => s.histories[s.activeId ?? '']?.past.length ?? 0)
  const futureCount = useStore((s) => s.histories[s.activeId ?? '']?.future.length ?? 0)
  const [theme, setTheme] = useState(() => (localStorage.getItem('ui-theme') === 'dark' ? 'dark' : 'light'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('ui-theme', theme)
  }, [theme])

  const resume = resumes.find((r) => r.id === activeId)

  return (
    <header className="topbar">
      <Input
        className="name-input"
        value={resume?.name ?? ''}
        placeholder="简历名称"
        onChange={(e) => resume && rename(resume.id, e.target.value)}
      />
      <span className="save-hint">
        {savedAt ? (
          <>
            <IconCheck key={savedAt} size={13} /> 已自动保存 {new Date(savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </>
        ) : (
          '自动保存已开启'
        )}
      </span>
      <span className="flex-spacer" />
      <button
        className="icon-btn"
        title={theme === 'light' ? '切换深色模式' : '切换浅色模式'}
        onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      >
        {theme === 'light' ? <IconMoon size={15} /> : <IconSun size={15} />}
      </button>
      <span className="topbar-divider" />
      <button className="icon-btn" title="撤销 (Ctrl+Z)" disabled={!pastCount} onClick={undo}>
        <IconUndo size={15} />
      </button>
      <button className="icon-btn" title="重做 (Ctrl+Y)" disabled={!futureCount} onClick={redo}>
        <IconRedo size={15} />
      </button>
      <span className="topbar-divider" />
      <Button variant="primary" onClick={() => void exportActivePdf()} disabled={!resume} title="导出 PDF (Ctrl+E)">
        <IconDownload size={14} /> 导出 PDF
      </Button>
    </header>
  )
}
