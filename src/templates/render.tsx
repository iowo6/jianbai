import type { CSSProperties, ReactNode } from 'react'
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { BasicsData, ResumeData, ResumeItem, ResumeModule, ThemeSettings } from '../types'
import { fontStack } from '../defaults'
import { ContactIcon, ModuleIcon } from '../components/icons'

const MM_TO_PX = 96 / 25.4

/* ---------- 工具 ---------- */

function dateRange(it: ResumeItem): string {
  const s = it.start?.trim()
  const e = it.end?.trim()
  if (s && e) return `${s} – ${e}`
  return s || e || ''
}

function isLatin(s: string): boolean {
  return /^[\x00-\x7F\s&/+,.-]+$/.test(s)
}

function moduleHasContent(m: ResumeModule): boolean {
  if (m.type === 'summary' || m.type === 'custom') return !!m.text?.trim()
  return m.items.some((it) => it.title || it.subtitle || it.location || it.bullets || it.tags.length > 0)
}

/* ---------- 分页块模型：把简历切成可独立安置的“块” ---------- */

type Block =
  | { key: string; kind: 'basics'; module: ResumeModule }
  | { key: string; kind: 'section'; module: ResumeModule; items: ResumeItem[] }
  | { key: string; kind: 'cont'; module: ResumeModule; items: ResumeItem[] }

function buildBlocks(resume: ResumeData): Block[] {
  const blocks: Block[] = []
  const basics = resume.modules.find((m) => m.type === 'basics')
  if (basics && basics.visible && (basics.data.name || basics.data.headline || basics.data.contacts.length)) {
    blocks.push({ key: 'basics', kind: 'basics', module: basics })
  }
  for (const m of resume.modules) {
    if (m.type === 'basics' || !m.visible || !moduleHasContent(m)) continue
    if (m.type === 'summary' || m.type === 'custom' || m.type === 'skills') {
      // 文字型 / 技能型模块整体成块（标题与内容不拆分）
      blocks.push({ key: `${m.id}-s`, kind: 'section', module: m, items: m.items })
    } else {
      // 经历型模块：标题+第一条为一块，其余条目各自成块（可跨页续排，不带标题）
      const [first, ...rest] = m.items
      if (!first) continue
      blocks.push({ key: `${m.id}-s`, kind: 'section', module: m, items: [first] })
      for (const it of rest) blocks.push({ key: `${m.id}-${it.id}`, kind: 'cont', module: m, items: [it] })
    }
  }
  return blocks
}

/* ---------- 头部（基本信息） ---------- */

function Header({ data, theme }: { data: BasicsData; theme: ThemeSettings }) {
  const { name, headline, contacts, photo } = data
  const centered = theme.headerAlign === 'center'
  const showPhoto = theme.photo && !!photo
  const contactList = contacts.filter((c) => c.label || c.value)

  return (
    <div className={`rz-header ${centered ? 'rz-center' : ''}`}>
      {centered && showPhoto && <img className="rz-photo rz-photo-center" src={photo} alt="" />}
      <div className="rz-header-main">
        {name && <h1 className="rz-name">{name}</h1>}
        {headline && <div className="rz-headline">{headline}</div>}
        {contactList.length > 0 && (
          <div className="rz-contacts">
            {contactList.map((c) => (
              <span className="rz-contact" key={c.id}>
                {theme.icons && <ContactIcon label={c.label} />}
                {c.label && <span className="rz-contact-label">{c.label}</span>}
                {c.label && c.value ? '：' : ''}
                {c.value}
              </span>
            ))}
          </div>
        )}
      </div>
      {!centered && showPhoto && <img className="rz-photo" src={photo} alt="" />}
    </div>
  )
}

/* ---------- 条目（经历类） ---------- */

function Entry({ item, theme }: { item: ResumeItem; theme: ThemeSettings }) {
  const range = dateRange(item)
  return (
    <div className="rz-entry">
      <div className="rz-entry-head">
        {item.title && <span className="rz-e-title">{item.title}</span>}
        {item.subtitle && <span className="rz-e-sub">{item.subtitle}</span>}
        {item.location && <span className="rz-e-loc">{item.location}</span>}
        {range && <span className="rz-e-date">{range}</span>}
      </div>
      {item.bullets && <div className="rz-rich" dangerouslySetInnerHTML={{ __html: item.bullets }} />}
      {item.tags.length > 0 && (
        <div className={`rz-tags ${theme.tagsPill ? 'rz-tags-pill' : ''}`}>
          {theme.tagsPill
            ? item.tags.map((t, i) => (
                <span className="rz-pill" key={i}>
                  {t}
                </span>
              ))
            : item.tags.join(' · ')}
        </div>
      )}
    </div>
  )
}

/* ---------- 技能 ---------- */

function SkillRow({ item, theme }: { item: ResumeItem; theme: ThemeSettings }) {
  const tags = item.tags.join(' · ')
  return (
    <div className="rz-entry rz-skill">
      <div className="rz-skill-line">
        {item.title && <span className="rz-e-title">{item.title}</span>}
        {item.title && tags && <span className="rz-skill-sep">：</span>}
        {tags && <span className="rz-skill-tags">{tags}</span>}
        {theme.skillBars && item.level > 0 && (
          <span className="rz-skillbar" aria-hidden="true">
            <i style={{ width: `${(item.level / 5) * 100}%` }} />
          </span>
        )}
      </div>
    </div>
  )
}

/* ---------- 模块区块 ---------- */

function Section({
  module: m,
  theme,
  noTitle = false,
  children
}: {
  module: ResumeModule
  theme: ThemeSettings
  noTitle?: boolean
  children: ReactNode
}) {
  const title = theme.uppercaseHeadings && isLatin(m.title) ? m.title.toUpperCase() : m.title
  return (
    <section className="rz-section">
      {!noTitle && (
        <h2 className="rz-sec-title">
          {theme.icons && <ModuleIcon type={m.type} size={12} />}
          <span>{title}</span>
        </h2>
      )}
      {children}
    </section>
  )
}

function SectionBody({ m, items, theme }: { m: ResumeModule; items?: ResumeItem[]; theme: ThemeSettings }) {
  const list = items ?? m.items
  if (m.type === 'summary' || m.type === 'custom') {
    return <div className="rz-rich" dangerouslySetInnerHTML={{ __html: m.text }} />
  }
  if (m.type === 'skills') {
    return (
      <>
        {list.map((it) =>
          it.bullets ? (
            // 描述型技能条目：直接渲染富文本
            <div className="rz-entry rz-skill" key={it.id}>
              <div className="rz-rich" dangerouslySetInnerHTML={{ __html: it.bullets }} />
            </div>
          ) : (
            // 兼容旧数据：标题+标签写法的「类别：技能 · 技能」行
            <SkillRow key={it.id} item={it} theme={theme} />
          )
        )}
      </>
    )
  }
  return (
    <>
      {list.map((it) => (
        <Entry key={it.id} item={it} theme={theme} />
      ))}
    </>
  )
}

function renderBlock(b: Block, theme: ThemeSettings): ReactNode {
  if (b.kind === 'basics') return <Header data={b.module.data} theme={theme} />
  if (b.kind === 'section')
    return (
      <Section module={b.module} theme={theme}>
        <SectionBody m={b.module} items={b.items} theme={theme} />
      </Section>
    )
  // 跨页续排的条目：不带模块标题
  return (
    <Section module={b.module} theme={theme} noTitle>
      <SectionBody m={b.module} items={b.items} theme={theme} />
    </Section>
  )
}

/* ---------- 分页主体：测量块高 → 贪心装页（单栏模板） ---------- */

function PaginatedBody({ resume }: { resume: ResumeData }) {
  const single = resume.template === 'single'
  const blocks = useMemo(() => buildBlocks(resume), [resume])
  const [groups, setGroups] = useState<number[][] | null>(null)
  const [tick, setTick] = useState(0)
  const sigRef = useRef('')
  const measureRef = useRef<HTMLDivElement>(null)

  const contentH = ((resume.page.size === 'Letter' ? 279.4 : 297) - 2 * resume.theme.margin) * MM_TO_PX - 2
  const paperClass = resume.page.size === 'Letter' ? 'rz-letter' : 'rz-a4'
  const pageW = resume.page.size === 'Letter' ? '216mm' : '210mm'

  // 字体就绪后重新测量
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => {
      if (alive) setTick((t) => t + 1)
    })
    return () => {
      alive = false
    }
  }, [])

  // 内容/图片尺寸变化后重新测量
  useEffect(() => {
    if (!single) return
    const el = measureRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setTick((t) => t + 1))
    ro.observe(el)
    return () => ro.disconnect()
  }, [single])

  useLayoutEffect(() => {
    if (!single) return
    const container = measureRef.current
    if (!container || blocks.length === 0) return
    const nodes = Array.from(container.children) as HTMLElement[]

    // 图片等异步资源加载会改变块高，观察各块尺寸变化后重测
    const ro = new ResizeObserver(() => setTick((t) => t + 1))
    nodes.forEach((n) => ro.observe(n))

    // 用 offsetTop 差值算块占位（含块间距），纯 offsetHeight 会漏掉 margin 导致溢页
    const tops = nodes.map((n) => n.offsetTop)
    const spanOf = (i: number) => (i + 1 < nodes.length ? tops[i + 1] - tops[i] : nodes[i].offsetHeight)

    const next: number[][] = []
    let cur: number[] = []
    let used = 0
    for (let i = 0; i < nodes.length; i++) {
      const h = spanOf(i)
      if (cur.length === 0) {
        cur = [i]
        used = h
      } else if (used + h > contentH) {
        next.push(cur)
        cur = [i]
        used = h
      } else {
        cur.push(i)
        used += h
      }
    }
    if (cur.length) next.push(cur)
    const sig = next.map((g) => g.join(',')).join('|')
    if (sig !== sigRef.current) {
      sigRef.current = sig
      setGroups(next)
    }
    return () => ro.disconnect()
  })

  /* 双栏模板：内容连续排布，打印时由引擎分页 */
  if (!single) {
    const basics = resume.modules.find((m) => m.type === 'basics')
    const sections = resume.modules.filter((m) => m.type !== 'basics' && m.visible && moduleHasContent(m))
    const header =
      basics && (basics.data.name || basics.data.headline || basics.data.contacts.length) ? (
        <div className="rz-blk">
          <Header data={basics.data} theme={resume.theme} />
        </div>
      ) : null
    const renderSection = (m: ResumeModule) => (
      <div className="rz-blk" key={m.id}>
        <Section module={m} theme={resume.theme}>
          <SectionBody m={m} theme={resume.theme} />
        </Section>
      </div>
    )
    const side = sections.filter((m) => m.column === 'side')
    const main = sections.filter((m) => m.column !== 'side')
    return (
      <div className="rz-doc">
        <div className={`rz-paper ${paperClass}`}>
          <div className="rz-body">
            {header}
            {sections.length > 0 && (
              <div className="rz-cols">
                <div className="rz-col-main">{main.map(renderSection)}</div>
                <div className="rz-col-side">{side.map(renderSection)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* 单栏模板：真实分页 */
  // 块数量变化（增删模块/条目）后旧分组索引会失效，先退回“全部单页”再由测量效果重算，
  // 否则用过期索引取 blocks[i] 会渲染崩溃（白屏）
  const safeGroups =
    groups && groups.every((g) => g.length > 0 && g.every((i) => Number.isInteger(i) && i >= 0 && i < blocks.length))
      ? groups
      : null
  const idxGroups = safeGroups ?? [blocks.map((_, i) => i)]
  return (
    <>
      {/* 隐藏测量层：与正式渲染同宽，逐块量高 */}
      <div
        className="rz-measure"
        ref={measureRef}
        aria-hidden="true"
        style={{ width: `calc(${pageW} - 2 * ${resume.theme.margin}mm)` }}
      >
        {blocks.map((b) => (
          <div className="rz-blk" key={b.key}>
            {renderBlock(b, resume.theme)}
          </div>
        ))}
      </div>
      <div className="rz-doc">
        {idxGroups.map((idxs, p) => (
          <div className={`rz-paper ${paperClass}`} key={p} data-page={p + 1}>
            <div className="rz-body">
              {idxs.map((i) => (
                <div className="rz-blk" key={blocks[i].key}>
                  {renderBlock(blocks[i], resume.theme)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------- 简历渲染入口 ---------- */

export const ResumeRender = memo(function ResumeRender({ resume }: { resume: ResumeData }) {
  const t = resume.theme
  const style = {
    '--rz-accent': t.accent,
    '--rz-font': fontStack(t.font),
    '--rz-fs': `${t.fontSize}pt`,
    '--rz-lh': String(t.lineHeight),
    '--rz-pad': `${t.margin}mm`,
    '--rz-gap': `${t.sectionGap}mm`
  } as CSSProperties

  return (
    <div className={`rz-root ${t.divider ? 'rz-divider-on' : ''}`} style={style}>
      {resume.customCss?.trim() && <style>{resume.customCss}</style>}
      <PaginatedBody resume={resume} />
    </div>
  )
})
