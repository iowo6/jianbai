import { useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent, Modifier } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store'
import type { ModuleType, ResumeItem, ResumeModule } from '../../types'
import { Button, Input } from '../ui'
import { IconArrowDown, IconArrowUp, IconChevronDown, IconGrip, IconTrash } from '../icons'
import { RichTextEditor } from '../RichTextEditor'

const ITEM_LABELS: Partial<Record<ModuleType, { title: string; subtitle: string }>> = {
  experience: { title: '职位名称', subtitle: '公司名称' },
  education: { title: '学校名称', subtitle: '专业 · 学历' },
  projects: { title: '项目名称', subtitle: '角色 / 链接' },
  skills: { title: '技能类别', subtitle: '说明（可不填）' },
  certificates: { title: '证书名称', subtitle: '颁发机构' },
  custom: { title: '条目标题', subtitle: '副标题' }
}

const BULLET_LABELS: Partial<Record<ModuleType, string>> = {
  experience: '工作内容（支持加粗、列表）',
  education: '在校经历 / 课程（支持列表）',
  projects: '项目描述（支持列表）',
  certificates: '备注（可选）'
}

// 与模块排序一致：条目拖拽只沿纵向移动，避免横向位移撑出滚动区
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

function hasContent(it: ResumeItem): boolean {
  return !!(it.title || it.subtitle || it.start || it.end || it.location || it.bullets || it.tags.length)
}

export function ItemsEditor({ module: m }: { module: ResumeModule }) {
  const addItem = useStore((s) => s.addItem)
  const reorderItem = useStore((s) => s.reorderItem)
  const isSkills = m.type === 'skills'
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const onDragStart = (_e: DragStartEvent) => {
    document.body.classList.add('dnd-drag')
  }

  const onDragEnd = (e: DragEndEvent) => {
    document.body.classList.remove('dnd-drag')
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = m.items.findIndex((x) => x.id === active.id)
    const to = m.items.findIndex((x) => x.id === over.id)
    if (from >= 0 && to >= 0) reorderItem(m.id, from, to)
  }

  return (
    <div className="items-editor">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[verticalOnly]}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => document.body.classList.remove('dnd-drag')}
      >
        <SortableContext items={m.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {m.items.map((it, idx) => (
            <ItemCard key={it.id} module={m} item={it} index={idx} total={m.items.length} />
          ))}
        </SortableContext>
      </DndContext>
      <Button
        className="add-item-btn"
        onClick={() => {
          addItem(m.id)
        }}
      >
        + 添加{ITEM_LABELS[m.type]?.title ?? '条目'}
      </Button>
      {isSkills && (
        <p className="form-hint">
          技能条与胶囊标签默认关闭，可在「设计 → 装饰元素」中开启；默认渲染为「类别：技能 · 技能」的纯文本行。
        </p>
      )}
      <p className="form-hint">拖住条目标题栏左侧的手柄可以上下调整顺序。</p>
    </div>
  )
}

function ItemCard({ module: m, item, index, total }: { module: ResumeModule; item: ResumeItem; index: number; total: number }) {
  const updateItem = useStore((s) => s.updateItem)
  const removeItem = useStore((s) => s.removeItem)
  const moveItem = useStore((s) => s.moveItem)
  const [open, setOpen] = useState(!hasContent(item))
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const labels = ITEM_LABELS[m.type] ?? { title: '标题', subtitle: '副标题' }
  const isSkills = m.type === 'skills'

  const setTags = (raw: string) => {
    updateItem(m.id, item.id, { tags: raw.split(/[,，、;；]/).map((s) => s.trim()).filter(Boolean) })
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`item-card ${open ? 'open' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <div
        className="item-head"
        role="button"
        aria-expanded={open}
        title={open ? '收起' : '展开'}
        onClick={() => setOpen((o) => !o)}
      >
        <button
          className="icon-btn grip"
          title="拖拽排序"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <IconGrip size={13} />
        </button>
        <IconChevronDown size={14} className={`chev ${open ? 'down' : ''}`} />
        <span className="item-title">{item.title || `未命名${labels.title}`}</span>
        {(item.start || item.end) && (
          <span className="item-dates">
            {item.start}
            {item.start && item.end ? ' – ' : ''}
            {item.end}
          </span>
        )}
      </div>
      <div className="item-collapse">
        <div className="item-body" onClick={(e) => e.stopPropagation()}>
          <div className="item-body-inner">
            <div className="grid2">
              <label className="field">
                <span className="field-label">{labels.title}</span>
                <Input value={item.title} onChange={(e) => updateItem(m.id, item.id, { title: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">{labels.subtitle}</span>
                <Input value={item.subtitle} onChange={(e) => updateItem(m.id, item.id, { subtitle: e.target.value })} />
              </label>
            </div>
            <div className="grid3">
              <label className="field">
                <span className="field-label">开始时间</span>
                <Input value={item.start} placeholder="2023.07" onChange={(e) => updateItem(m.id, item.id, { start: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">结束时间</span>
                <Input value={item.end} placeholder="至今" onChange={(e) => updateItem(m.id, item.id, { end: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">地点（可选）</span>
                <Input value={item.location} onChange={(e) => updateItem(m.id, item.id, { location: e.target.value })} />
              </label>
            </div>
            <div className="field">
              <span className="field-label">{BULLET_LABELS[m.type] ?? '描述（支持列表）'}</span>
              <RichTextEditor
                value={item.bullets}
                onChange={(html) => updateItem(m.id, item.id, { bullets: html })}
                placeholder="输入描述，回车分段，可用工具栏插入列表…"
                minHeight={70}
              />
            </div>
            <div className={isSkills ? 'grid2' : 'grid1'}>
              <label className="field">
                <span className="field-label">标签（用逗号分隔）</span>
                <Input value={item.tags.join('、')} onChange={(e) => setTags(e.target.value)} placeholder="React、TypeScript" />
              </label>
              {isSkills && (
                <label className="field">
                  <span className="field-label">熟练度（仅技能条模式使用）：{item.level} / 5</span>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    value={item.level}
                    onChange={(e) => updateItem(m.id, item.id, { level: Number(e.target.value) })}
                    className="slider"
                  />
                </label>
              )}
            </div>
            <div className="item-actions">
              <Button size="sm" disabled={index === 0} onClick={() => moveItem(m.id, item.id, -1)}>
                <IconArrowUp size={13} />
              </Button>
              <Button size="sm" disabled={index === total - 1} onClick={() => moveItem(m.id, item.id, 1)}>
                <IconArrowDown size={13} />
              </Button>
              <span className="flex-spacer" />
              <Button size="sm" variant="danger" onClick={() => removeItem(m.id, item.id)}>
                <IconTrash size={13} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
