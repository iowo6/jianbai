import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { api } from './api'
import { flushSave, scheduleSave } from './persistence'
import { exportActivePdf } from './exporter'
import { Rail } from './components/Rail'
import { TopBar } from './components/TopBar'
import { ContentPanel } from './components/editors/ContentPanel'
import { DesignPanel } from './components/design/DesignPanel'
import { PreviewPane } from './components/PreviewPane'
import { PrintView } from './PrintView'
import { Button, Toast } from './components/ui'
import { IconFileText, IconSliders } from './components/icons'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function loadW(key: string, def: number): number {
  const v = Number(localStorage.getItem(key))
  return Number.isFinite(v) && v > 0 ? v : def
}

export default function App() {
  const isPrint = new URLSearchParams(window.location.search).get('view') === 'print'
  if (isPrint) return <PrintView />
  return <Shell />
}

/** 面板边界拖拽条：拖动调整宽度，双击复位 */
function Resizer({ onDelta, onReset, label }: { onDelta: (dx: number) => void; onReset: () => void; label: string }) {
  const last = useRef(0)
  // 用显式状态而非 hasPointerCapture 判断：捕获状态异常残留时不会误触发
  const active = useRef(false)

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active.current) return
    active.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* 捕获可能已隐式释放 */
    }
    document.body.classList.remove('resizing')
  }

  return (
    <div
      className="resizer"
      role="separator"
      aria-label={label}
      title={`${label}：拖拽调整宽度，双击复位`}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        active.current = true
        last.current = e.clientX
        e.currentTarget.setPointerCapture(e.pointerId)
        document.body.classList.add('resizing')
      }}
      onPointerMove={(e) => {
        if (!active.current) return
        onDelta(e.clientX - last.current)
        last.current = e.clientX
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onDoubleClick={onReset}
    />
  )
}

function Shell() {
  const loaded = useStore((s) => s.loaded)
  const resumes = useStore((s) => s.resumes)
  const activeId = useStore((s) => s.activeId)
  const init = useStore((s) => s.init)
  const [tab, setTab] = useState<'content' | 'design'>('content')
  const [railW, setRailW] = useState(() => loadW('ui-rail-w', 224))
  const [editorW, setEditorW] = useState(() => loadW('ui-editor-w', 430))
  const initedRef = useRef(false)

  useEffect(() => {
    if (!initedRef.current) {
      initedRef.current = true
      void init()
    }
  }, [init])

  useEffect(() => {
    localStorage.setItem('ui-rail-w', String(railW))
  }, [railW])

  useEffect(() => {
    localStorage.setItem('ui-editor-w', String(editorW))
  }, [editorW])

  // 自动保存：内容变化 400ms 防抖后写入磁盘
  useEffect(() => {
    if (!loaded) return
    const unsub = useStore.subscribe((s, prev) => {
      if (s.resumes !== prev.resumes || s.activeId !== prev.activeId) {
        scheduleSave()
      }
    })
    const onBeforeUnload = () => {
      void flushSave()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      unsub()
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [loaded])

  // 全局快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      const store = useStore.getState()
      if (k === 'z') {
        e.preventDefault()
        if (e.shiftKey) store.redo()
        else store.undo()
      } else if (k === 'y') {
        e.preventDefault()
        store.redo()
      } else if (k === 's') {
        e.preventDefault()
        void flushSave().then(() => store.showToast('已保存'))
      } else if (k === 'e') {
        e.preventDefault()
        void exportActivePdf()
      } else if (k === 'n') {
        e.preventDefault()
        store.createBlank()
      } else if (k === 'd') {
        e.preventDefault()
        if (store.activeId) store.duplicate(store.activeId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!loaded) {
    return (
      <div className="splash">
        <div>简白 · 正在加载…</div>
      </div>
    )
  }

  const resume = resumes.find((r) => r.id === activeId)

  return (
    <div className="app">
      <aside className="rail" style={{ width: railW }}>
        <RailInner />
      </aside>
      <Resizer
        label="调整侧栏宽度"
        onDelta={(dx) => setRailW((w) => clamp(w + dx, 176, 340))}
        onReset={() => setRailW(224)}
      />
      <div className="main">
        <TopBar />
        {resume ? (
          <div className="workspace">
            <div className="editor-panel" style={{ width: editorW }}>
              <div className="tabs">
                <button className={`tab ${tab === 'content' ? 'active' : ''}`} onClick={() => setTab('content')}>
                  <IconFileText size={14} /> 内容
                </button>
                <button className={`tab ${tab === 'design' ? 'active' : ''}`} onClick={() => setTab('design')}>
                  <IconSliders size={14} /> 设计
                </button>
              </div>
              <div className="tab-body">
                {tab === 'content' ? <ContentPanel key="content" resume={resume} /> : <DesignPanel key="design" resume={resume} />}
              </div>
            </div>
            <Resizer
              label="调整编辑区宽度"
              onDelta={(dx) => setEditorW((w) => clamp(w + dx, 340, 800))}
              onReset={() => setEditorW(430)}
            />
            <PreviewPane key={resume.id} resume={resume} />
          </div>
        ) : (
          <EmptyHome />
        )}
      </div>
      <Toast />
    </div>
  )
}

function RailInner() {
  const resumes = useStore((s) => s.resumes)
  const activeId = useStore((s) => s.activeId)
  return <Rail resumes={resumes} activeId={activeId} />
}

function EmptyHome() {
  const createBlank = useStore((s) => s.createBlank)
  const createSample = useStore((s) => s.createSample)
  const start = (fn: () => void) => {
    fn()
    api.focusWindow()
  }
  return (
    <div className="empty-home">
      <h2>还没有简历</h2>
      <p>创建一份新简历开始编辑，数据只保存在你自己的电脑上。</p>
      <div className="empty-actions">
        <Button variant="primary" onClick={() => start(createBlank)}>
          新建空白简历
        </Button>
        <Button onClick={() => start(createSample)}>用示例看看效果</Button>
      </div>
    </div>
  )
}
