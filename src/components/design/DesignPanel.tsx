import type { ReactNode } from 'react'
import type { ResumeData, TemplateId } from '../../types'
import { ACCENT_PRESETS, FONT_PRESETS } from '../../defaults'
import { useStore } from '../../store'
import { Input, Select, Slider, Switch, Textarea } from '../ui'
import { IconCode, IconDroplet, IconFile, IconLayout, IconSliders, IconSparkles, IconType } from '../icons'

export function DesignPanel({ resume }: { resume: ResumeData }) {
  const t = resume.theme
  const setTemplate = useStore((s) => s.setTemplate)
  const patchTheme = useStore((s) => s.patchTheme)
  const setPage = useStore((s) => s.setPage)
  const setCustomCss = useStore((s) => s.setCustomCss)

  return (
    <div className="design-panel">
      <Group title="模板" icon={<IconLayout size={13} />}>
        <div className="template-cards">
          <TemplateCard
            active={resume.template === 'single'}
            title="简约单栏"
            desc="纯文本 · 推荐投递使用"
            onClick={() => setTemplate('single' as TemplateId)}
            wire={<rect x="4" y="4" width="52" height="72" rx="2" />}
          />
          <TemplateCard
            active={resume.template === 'sidebar'}
            title="双栏侧边"
            desc="主栏 + 侧栏分区"
            onClick={() => setTemplate('sidebar' as TemplateId)}
            wire={
              <>
                <rect x="4" y="4" width="34" height="72" rx="2" />
                <rect x="42" y="4" width="14" height="72" rx="2" />
              </>
            }
          />
        </div>
      </Group>

      <Group title="页面" icon={<IconFile size={13} />}>
        <div className="row-between">
          <Select value={resume.page.size} onChange={(e) => setPage(e.target.value as 'A4' | 'Letter')}>
            <option value="A4">A4（210 × 297 mm）</option>
            <option value="Letter">Letter（8.5 × 11 in）</option>
          </Select>
          <Select
            value={t.headerAlign}
            onChange={(e) => patchTheme({ headerAlign: e.target.value as 'left' | 'center' })}
          >
            <option value="left">头部靠左</option>
            <option value="center">头部居中</option>
          </Select>
        </div>
      </Group>

      <Group title="颜色" icon={<IconDroplet size={13} />}>
        <div className="accent-row">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              className={`accent-dot ${t.accent.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
              style={{ background: c }}
              title={c}
              onClick={() => patchTheme({ accent: c })}
            />
          ))}
          <label className="accent-custom" title="自定义颜色">
            <input type="color" value={t.accent} onChange={(e) => patchTheme({ accent: e.target.value })} />
          </label>
        </div>
        <p className="form-hint">默认纯黑最稳重；强调色用于姓名、区块标题等。极简风格建议低饱和色。</p>
      </Group>

      <Group title="字体与排版" icon={<IconType size={13} />}>
        <Select value={t.font} onChange={(e) => patchTheme({ font: e.target.value })}>
          {FONT_PRESETS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </Select>
        <SliderRow label={`字号 ${t.fontSize}pt`} min={9} max={12.5} step={0.5} value={t.fontSize} onChange={(v) => patchTheme({ fontSize: v })} />
        <SliderRow label={`行距 ${t.lineHeight.toFixed(2)}`} min={1.2} max={1.9} step={0.05} value={t.lineHeight} onChange={(v) => patchTheme({ lineHeight: v })} />
        <SliderRow label={`页边距 ${t.margin}mm`} min={10} max={28} step={1} value={t.margin} onChange={(v) => patchTheme({ margin: v })} />
        <SliderRow label={`模块间距 ${t.sectionGap}mm`} min={3} max={12} step={1} value={t.sectionGap} onChange={(v) => patchTheme({ sectionGap: v })} />
      </Group>

      <Group title="装饰元素" icon={<IconSparkles size={13} />}>
        <Switch label="细分隔线" checked={t.divider} onChange={(v) => patchTheme({ divider: v })} />
        <Switch label="小图标（联系方式 / 区块）" checked={t.icons} onChange={(v) => patchTheme({ icons: v })} />
        <Switch label="显示照片" checked={t.photo} onChange={(v) => patchTheme({ photo: v })} />
        <Switch label="标签胶囊样式" checked={t.tagsPill} onChange={(v) => patchTheme({ tagsPill: v })} />
        <Switch label="技能熟练度条" checked={t.skillBars} onChange={(v) => patchTheme({ skillBars: v })} />
        <Switch label="英文标题全大写" checked={t.uppercaseHeadings} onChange={(v) => patchTheme({ uppercaseHeadings: v })} />
      </Group>

      <Group title="自定义 CSS（高级）" icon={<IconCode size={13} />}>
        <Textarea
          rows={5}
          value={resume.customCss}
          placeholder={'例如：\n.rz-name { letter-spacing: 2px; }'}
          onChange={(e) => setCustomCss(e.target.value)}
        />
        <p className="form-hint">作用于简历根元素 .rz-root，改坏了可清空恢复。仅在当前简历生效。</p>
      </Group>
    </div>
  )
}

function Group({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="design-group">
      <h3 className="group-title">
        {icon}
        <span>{title}</span>
      </h3>
      {children}
    </section>
  )
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="slider-row">
      <span className="slider-label">{label}</span>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} />
    </div>
  )
}

function TemplateCard({
  active,
  title,
  desc,
  wire,
  onClick
}: {
  active: boolean
  title: string
  desc: string
  wire: React.ReactNode
  onClick: () => void
}) {
  return (
    <button className={`template-card ${active ? 'active' : ''}`} onClick={onClick}>
      <svg viewBox="0 0 60 80" width={60} height={80} className="template-wire" aria-hidden="true">
        {wire}
        <line x1="9" y1="16" x2="35" y2="16" strokeWidth="3" strokeLinecap="round" className="wire-line" />
        <line x1="9" y1="26" x2="51" y2="26" strokeWidth="2" strokeLinecap="round" className="wire-line thin" />
        <line x1="9" y1="32" x2="51" y2="32" strokeWidth="2" strokeLinecap="round" className="wire-line thin" />
        <line x1="9" y1="44" x2="35" y2="44" strokeWidth="3" strokeLinecap="round" className="wire-line" />
        <line x1="9" y1="54" x2="51" y2="54" strokeWidth="2" strokeLinecap="round" className="wire-line thin" />
        <line x1="9" y1="60" x2="51" y2="60" strokeWidth="2" strokeLinecap="round" className="wire-line thin" />
        <line x1="9" y1="66" x2="44" y2="66" strokeWidth="2" strokeLinecap="round" className="wire-line thin" />
      </svg>
      <span className="template-name">{title}</span>
      <span className="template-desc">{desc}</span>
    </button>
  )
}
