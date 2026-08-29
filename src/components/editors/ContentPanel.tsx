import { useEffect, useRef, useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, Modifier } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ModuleType, ResumeData, ResumeModule } from '../../types'
import { MODULE_META } from '../../defaults'
import { useStore } from '../../store'
import { api } from '../../api'
import { Button, Input, Select } from '../ui'
import { IconChevronDown, IconEye, IconEyeOff, IconGrip, IconPlus, IconTrash, ModuleIcon } from '../icons'
import { BasicsEditor } from './BasicsEditor'
import { ItemsEditor } from './ItemsEditor'
import { RichTextEditor } from '../RichTextEditor'

const stop = (e: React.SyntheticEvent) => e.stopPropagation()

// 模块排序只需纵向移动：锁死横向位移，避免拖拽把编辑区内容撑出横向滚动区
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

export function ContentPanel({ resume }: { resume: ResumeData }) {
  const addModule = useStore((s) => s.addModule)
  const moveModule = useStore((s) => s.moveModule)
  const [addOpen, setAddOpen] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const prevResumeId = useRef<string | null>(resume.id)

  // 新建/切换简历后，显式把焦点交给第一个输入框（姓名）。
  // 先 await focusWindow 确保窗口获得 OS 级键盘焦点，再聚焦 DOM 元素，
  // 否则 IME/TSF 可能吞掉键盘输入（表现为无法输入，Alt+Tab 后恢复）。
  useEffect(() => {
    if (prevResumeId.current !== resume.id) {
      prevResumeId.current = resume.id
      const focusFirst = () => {
        const el = document.querySelector<HTMLInputElement>('.module-card .field input')
        if (el && document.activeElement !== el) el.focus()
      }
      api.focusWindow().then(() => {
        focusFirst()
        // 再补一次延迟聚焦，确保输入法状态稳定
        setTimeout(focusFirst, 120)
      })
    }
  }, [resume.id])

  const modules = resume.modules
  const basics = modules.find((m) => m.type === 'basics')
  const rest = modules.filter((m) => m.type !== 'basics')

  return (
    <div className="content-panel">
      {basics && <ModuleCard key={basics.id} module={basics} resume={resume} locked />}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[verticalOnly]}
        onDragStart={() => document.body.classList.add('dnd-drag')}
        onDragEnd={(e) => {
          document.body.classList.remove('dnd-drag')
          const { active, over } = e
          if (!over || active.id === over.id) return
          const from = modules.findIndex((m) => m.id === active.id)
          const to = modules.findIndex((m) => m.id === over.id)
          if (from >= 0 && to >= 0) moveModule(from, to)
        }}
        onDragCancel={() => document.body.classList.remove('dnd-drag')}
      >
        <SortableContext items={rest.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          {rest.map((m) => (
            <SortableModuleCard key={m.id} module={m} resume={resume} />
          ))}
        </SortableContext>
      </DndContext>

      <div className="add-module-wrap">
        {addOpen && (
          <div className="add-module-menu">
            {(Object.keys(MODULE_META) as ModuleType[])
              .filter((t) => MODULE_META[t].addable)
              .map((t) => (
                <button
                  key={t}
                  className="add-module-item"
                  onClick={() => {
                    addModule(t)
                    setAddOpen(false)
                  }}
                >
                  <ModuleIcon type={t} size={14} />
                  {MODULE_META[t].label}
                </button>
              ))}
          </div>
        )}
        <Button className="add-module-btn" onClick={() => setAddOpen((o) => !o)}>
          <IconPlus size={14} /> 添加模块
        </Button>
      </div>
    </div>
  )
}

function SortableModuleCard({ module: m, resume }: { module: ResumeModule; resume: ResumeData }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`module-card ${m.collapsed ? 'collapsed' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <ModuleHead module={m} resume={resume} gripAttrs={attributes} gripListeners={listeners} />
      <CollapseBox>
        <ModuleBody module={m} />
      </CollapseBox>
    </div>
  )
}

function ModuleCard({ module: m, resume, locked = false }: { module: ResumeModule; resume: ResumeData; locked?: boolean }) {
  return (
    <div className={`module-card ${m.collapsed ? 'collapsed' : ''}`}>
      <ModuleHead module={m} resume={resume} locked={locked} />
      <CollapseBox>
        <ModuleBody module={m} />
      </CollapseBox>
    </div>
  )
}

/** 折叠动画容器：grid-template-rows 0fr → 1fr */
function CollapseBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mod-collapse">
      <div className="mod-collapse-inner">{children}</div>
    </div>
  )
}

function ModuleHead({
  module: m,
  resume,
  locked = false,
  gripAttrs,
  gripListeners
}: {
  module: ResumeModule
  resume: ResumeData
  locked?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gripAttrs?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gripListeners?: any
}) {
  const renameModule = useStore((s) => s.renameModule)
  const toggleModuleVisible = useStore((s) => s.toggleModuleVisible)
  const removeModule = useStore((s) => s.removeModule)
  const updateModuleColumn = useStore((s) => s.updateModuleColumn)
  const toggleModuleCollapsed = useStore((s) => s.toggleModuleCollapsed)

  return (
    <div
      className="module-head"
      title={m.collapsed ? '展开模块' : '折叠模块'}
      onClick={() => toggleModuleCollapsed(m.id)}
    >
      <button className={`icon-btn chev-btn ${m.collapsed ? 'collapsed' : ''}`} title={m.collapsed ? '展开' : '折叠'}>
        <IconChevronDown size={15} />
      </button>
      {!locked ? (
        <button className="icon-btn grip" title="拖拽排序" onClick={stop} {...gripAttrs} {...gripListeners}>
          <IconGrip size={15} />
        </button>
      ) : (
        <span className="icon-btn placeholder" />
      )}
      <span className="mod-type-icon">
        <ModuleIcon type={m.type} size={14} />
      </span>
      <Input className="mod-title" value={m.title} onChange={(e) => renameModule(m.id, e.target.value)} onClick={stop} />
      {resume.template === 'sidebar' && !locked && (
        <Select
          className="col-select"
          value={m.column}
          title="所在列（双栏模板）"
          onClick={stop}
          onChange={(e) => updateModuleColumn(m.id, e.target.value as 'main' | 'side')}
        >
          <option value="main">主栏</option>
          <option value="side">侧栏</option>
        </Select>
      )}
      {!locked && (
        <button
          className={`icon-btn ${m.visible ? '' : 'mod-hidden'}`}
          title={m.visible ? '在简历中隐藏此模块' : '在简历中显示此模块'}
          onClick={(e) => {
            stop(e)
            toggleModuleVisible(m.id)
          }}
        >
          {m.visible ? <IconEye size={15} /> : <IconEyeOff size={15} />}
        </button>
      )}
      {!locked && (
        <button
          className="icon-btn danger"
          title="删除模块"
          onClick={(e) => {
            stop(e)
            removeModule(m.id)
          }}
        >
          <IconTrash size={15} />
        </button>
      )}
    </div>
  )
}

function ModuleBody({ module: m }: { module: ResumeModule }) {
  const setModuleText = useStore((s) => s.setModuleText)
  return (
    <div className="module-body">
      {m.type === 'basics' ? (
        <BasicsEditor data={m.data} />
      ) : m.type === 'summary' || m.type === 'custom' ? (
        <RichTextEditor value={m.text} onChange={(html) => setModuleText(m.id, html)} placeholder="输入内容，支持加粗与列表…" minHeight={80} />
      ) : (
        <ItemsEditor module={m} />
      )}
    </div>
  )
}
