import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ResumeData } from '../types'
import { ResumeRender } from '../templates/render'
import { IconMaximize, IconMinus, IconPlus } from './icons'

const MIN_SCALE = 0.25
const MAX_SCALE = 2

export function PreviewPane({ resume }: { resume: ResumeData }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.6)
  const [fit, setFit] = useState(true)
  const [docH, setDocH] = useState(0)
  const [docW, setDocW] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [panning, setPanning] = useState(false)
  const prevScale = useRef(scale)
  const pendingZoom = useRef(false)
  const panState = useRef<{ x: number; y: number; sl: number; st: number } | null>(null)

  useEffect(() => {
    const stage = stageRef.current
    const paper = paperRef.current
    if (!stage || !paper) return

    const recompute = () => {
      setDocH(paper.offsetHeight)
      setDocW(paper.offsetWidth)
      setPageCount(Math.max(1, paper.querySelectorAll('.rz-paper').length))
      if (fit) {
        const w = stage.clientWidth - 48
        // 适应宽度不允许超过 100%，避免横向裁切
        setScale(Math.min(1, Math.max(MIN_SCALE, w / paper.offsetWidth)))
      }
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(stage)
    ro.observe(paper)
    return () => ro.disconnect()
  }, [fit, resume.page.size])

  /* 滚轮缩放（原生监听，避免 React passive 警告） */
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setFit(false)
      setScale((s) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
        if (next !== s) pendingZoom.current = true
        return next
      })
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [])

  /* 缩放后以视口中心为锚点修正滚动，保证缩放不“漂移” */
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (stage && pendingZoom.current) {
      const ratio = scale / prevScale.current
      stage.scrollLeft = (stage.scrollLeft + stage.clientWidth / 2) * ratio - stage.clientWidth / 2
      stage.scrollTop = (stage.scrollTop + stage.clientHeight / 2) * ratio - stage.clientHeight / 2
      pendingZoom.current = false
    }
    prevScale.current = scale
  }, [scale])

  /* 左键拖拽平移 */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const stage = stageRef.current
    if (!stage) return
    panState.current = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop }
    stage.setPointerCapture(e.pointerId)
    setPanning(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current
    const p = panState.current
    if (!stage || !p) return
    stage.scrollLeft = p.sl - (e.clientX - p.x)
    stage.scrollTop = p.st - (e.clientY - p.y)
  }

  const endPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panState.current) return
    stageRef.current?.releasePointerCapture(e.pointerId)
    panState.current = null
    setPanning(false)
  }

  const zoom = (dir: 1 | -1) => {
    setFit(false)
    pendingZoom.current = true
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + dir * 0.1)))
  }

  return (
    <div className="preview-pane">
      <div className="preview-toolbar">
        <span className="page-info">
          {resume.page.size} · 共 {pageCount} 页
        </span>
        <span className="preview-hint">滚轮缩放 · 拖拽移动 · 双击复位</span>
        <span className="flex-spacer" />
        <button className="icon-btn" title="缩小" onClick={() => zoom(-1)}>
          <IconMinus size={14} />
        </button>
        <span className="zoom-val">{Math.round(scale * 100)}%</span>
        <button className="icon-btn" title="放大" onClick={() => zoom(1)}>
          <IconPlus size={14} />
        </button>
        <button className={`fit-btn ${fit ? 'active' : ''}`} onClick={() => setFit(true)} title="适应宽度">
          <IconMaximize size={12} /> 适应宽度
        </button>
      </div>
      <div
        className={`preview-stage ${panning ? 'panning' : ''}`}
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onDoubleClick={() => setFit(true)}
      >
        <div className="paper-scaler" style={{ width: docW * scale, height: docH * scale }}>
          <div ref={paperRef} className="paper-scaled" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <ResumeRender resume={resume} />
          </div>
        </div>
      </div>
    </div>
  )
}
