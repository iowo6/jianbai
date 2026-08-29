import { useEffect, useState } from 'react'
import type { ResumeData } from './types'
import { api } from './api'
import { ResumeRender } from './templates/render'

/** 打印/导出窗口：只渲染简历本身，由主进程调用 printToPDF */
export function PrintView() {
  const [resume, setResume] = useState<ResumeData | null>(null)
  const params = new URLSearchParams(window.location.search)

  useEffect(() => {
    ;(async () => {
      const data = await api.load()
      const id = params.get('id')
      const r = (id ? data?.resumes.find((x) => x.id === id) : null) ?? data?.resumes[0]
      if (r) {
        document.title = r.name || '简历'
        setResume(r)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!resume) return
    const ready = async () => {
      try {
        await document.fonts.ready
      } catch {
        /* ignore */
      }
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          api.printReady({ id: resume.id, size: resume.page.size })
        })
      )
    }
    ready()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume])

  if (!resume) return null

  return (
    <div className="print-root">
      <style>{`@page { size: ${resume.page.size === 'Letter' ? 'letter' : 'A4'}; margin: 0; }`}</style>
      <ResumeRender resume={resume} />
    </div>
  )
}
