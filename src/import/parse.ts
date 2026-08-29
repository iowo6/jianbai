import type { BasicsContact, ResumeData, ResumeItem, ResumeModule } from '../types'
import { blankResume, uid } from '../defaults'

/**
 * 简历文本启发式解析：把 PDF / Word / 文本提取出的纯文本，
 * 按「分区标题 → 条目（日期行切分）→ 要点行」的常见版式还原为结构化简历。
 * 属于尽力而为：解析结果交给用户在编辑器里检查修正。
 */

const SECTION_PATTERNS: { type: ResumeModule['type']; re: RegExp }[] = [
  { type: 'experience', re: /^(工作经历|工作经验|实习经历|职业经历|任职经历|工作|实习|experience|work experience|employment)/i },
  { type: 'education', re: /^(教育经历|教育背景|学习经历|教育|学业|education)/i },
  { type: 'projects', re: /^(项目经历|项目经验|项目|projects?)/i },
  { type: 'skills', re: /^(专业技能|技能特长|技能|核心技能|IT技能|skills?|technical skills)/i },
  { type: 'certificates', re: /^(证书荣誉|证书|荣誉奖项|获奖经历|荣誉|奖项|certificates?|honors?|awards?)/i },
  { type: 'summary', re: /^(自我评价|个人评价|个人简介|关于我|自我介绍|summary|about me|profile)/i }
]

const DATE_RE =
  /((19|20)\d{2}\s*[年.\-/~–—至]\s*(\d{1,2}\s*[月.\-/]?)?(\s*(–|—|~|至|到|-)\s*((19|20)\d{2}|今在当当前))?|(19|20)\d{2}\s*[年.\-/]|(至今|现在|目前|present|now))/i

const PHONE_RE = /(1[3-9]\d{9})|(\d{3,4}-\d{7,8})|(\d{3,4}-\d{3,4}-\d{3,4})/
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/
const URL_RE = /(https?:\/\/|www\.)[^\s]+|(github\.com|gitee\.com)\/\S+/i

interface ParsedItem {
  lines: string[]
}

function isSectionHeader(line: string): { type: ResumeModule['type'] } | null {
  const t = line.trim().replace(/[:：\s]+$/, '')
  if (!t || t.length > 24) return null
  for (const p of SECTION_PATTERNS) {
    if (p.re.test(t)) return { type: p.type }
  }
  return null
}

function looksLikeBullet(line: string): boolean {
  return /^\s*([•·▪◦●○◆*]|[-–—]\s|\d{1,2}[.)、]\s)/.test(line)
}

function cleanBullet(line: string): string {
  return line.trim().replace(/^([•·▪◦●○◆*]|[-–—]\s|\d{1,2}[.)、]\s)+\s*/, '')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 从前导行猜测基本信息 */
function parseBasics(headerLines: string[]) {
  const basics = { name: '', headline: '', contacts: [] as BasicsContact[] }
  const rest: string[] = []
  for (const raw of headerLines) {
    const line = raw.trim()
    if (!line) continue
    if (PHONE_RE.test(line) || EMAIL_RE.test(line) || URL_RE.test(line)) {
      const label = PHONE_RE.test(line) ? '电话' : EMAIL_RE.test(line) ? '邮箱' : URL_RE.test(line) ? '链接' : '联系'
      basics.contacts.push({ id: uid(), label, value: line })
      continue
    }
    const kv = line.match(/^([^：:]{1,6})[：:]\s*(.+)$/)
    if (kv && !DATE_RE.test(line) && kv[1].length <= 6) {
      basics.contacts.push({ id: uid(), label: kv[1].trim(), value: kv[2].trim() })
      continue
    }
    rest.push(line)
  }
  if (rest.length > 0) {
    const first = rest[0]
    if (first.length <= 12 && !DATE_RE.test(first)) {
      basics.name = first.replace(/^姓名[：:]?\s*/, '')
      basics.headline = rest[1] && rest[1].length <= 24 && !DATE_RE.test(rest[1]) ? rest[1] : ''
    } else {
      basics.name = ''
      basics.headline = ''
    }
  }
  return basics
}

/** 把一个分区内的行按“日期行/空行”切成条目 */
function splitItems(lines: string[]): ParsedItem[] {
  const items: ParsedItem[] = []
  let cur: string[] | null = null
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      if (cur && cur.length) {
        items.push({ lines: cur })
        cur = null
      }
      continue
    }
    const isHeader = DATE_RE.test(line) && line.length <= 60
    if (isHeader || !cur) {
      if (cur && cur.length) items.push({ lines: cur })
      cur = [line]
    } else {
      cur.push(line)
    }
  }
  if (cur && cur.length) items.push({ lines: cur })
  return items.filter((it) => it.lines.some((l) => l.length > 0))
}

function itemFromLines(m: ResumeModule, lines: string[]): ResumeItem {
  const it: ResumeItem = {
    id: uid(),
    title: '',
    subtitle: '',
    start: '',
    end: '',
    location: '',
    bullets: '',
    tags: [],
    level: 0
  }
  void m
  const body: string[] = []
  const bullets: string[] = []
  let headFound = false
  for (const line of lines) {
    if (looksLikeBullet(line)) {
      bullets.push(cleanBullet(line))
      continue
    }
    if (!headFound) {
      // 第一行：拆出时间范围与标题
      const mRange = line.match(
        /((19|20)\d{2}\s*[年.\-/]\s*(\d{1,2})?\s*[月]?\s*(–|—|~|至|到|-)\s*((19|20)\d{2}(\s*[年.\-/]\s*\d{1,2}\s*[月]?)?|至今|现在|目前))/i
      )
      if (mRange) {
        // “至今”里的“至”会被分隔符切散，先用占位符保护
        const range = mRange[1].replace(/至今|现在|目前/g, '@NOW@')
        const parts = range.split(/\s*[–—~到-]\s*|\s*至\s*/)
        it.start = parts[0].replace('@NOW@', '至今').trim()
        it.end = (parts[1] || '').replace('@NOW@', '至今').trim()
        const remainder = (line.slice(0, mRange.index ?? 0) + ' ' + line.slice((mRange.index ?? 0) + mRange[1].length)).trim()
        headFound = true
        if (remainder) body.push(remainder)
        continue
      }
      if (DATE_RE.test(line) && line.length <= 40) {
        it.start = line.replace(/^[^\d]*/, '')
        headFound = true
        continue
      }
      body.push(line)
      headFound = true
      continue
    }
    body.push(line)
  }
  if (bullets.length) {
    it.bullets = '<ul>' + bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('') + '</ul>'
  }
  if (body.length >= 1) it.title = body[0]
  if (body.length >= 2) it.subtitle = body[1]
  if (body.length >= 3) it.location = body[body.length - 1].length <= 8 ? body[body.length - 1] : ''
  return it
}

function linesToHtml(lines: string[]): string {
  return lines.filter((l) => l.trim()).map((l) => `<p>${escapeHtml(l.trim())}</p>`).join('')
}

export function parseResumeText(text: string, name = '导入的简历'): ResumeData {
  const resume = blankResume(name)
  const allLines = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())

  // 找出分区标题行
  const sections: { type: ResumeModule['type']; title: string; lines: string[] }[] = []
  let current: { type: ResumeModule['type']; title: string; lines: string[] } | null = null
  const headerLines: string[] = []
  const leftovers: string[] = []

  for (const line of allLines) {
    const sec = line ? isSectionHeader(line) : null
    if (sec) {
      current = { type: sec.type, title: line.replace(/[:：\s]+$/, ''), lines: [] }
      sections.push(current)
      continue
    }
    if (current) current.lines.push(line)
    else if (line) headerLines.push(line)
  }

  // 基本信息
  const basics = resume.modules.find((m) => m.type === 'basics')!
  const parsedBasics = parseBasics(headerLines)
  basics.data = {
    name: parsedBasics.name,
    headline: parsedBasics.headline,
    photo: '',
    contacts: parsedBasics.contacts
  }

  // 各分区 → 模块
  const typeToModule = new Map<ResumeModule['type'], ResumeModule>()
  for (const sec of sections) {
    if (sec.type === 'summary') {
      let target = typeToModule.get('summary')
      if (!target) {
        target = resume.modules.find((m) => m.type === 'summary')!
        typeToModule.set('summary', target)
      }
      target.text = linesToHtml(sec.lines)
      continue
    }
    if (sec.type === 'skills') {
      let target = typeToModule.get('skills')
      if (!target) {
        target = resume.modules.find((m) => m.type === 'skills')!
        target.items = []
        typeToModule.set('skills', target)
      }
      for (const line of sec.lines) {
        if (!line.trim()) continue
        const kv = line.match(/^([^：:]{1,20})[：:]\s*(.+)$/)
        if (kv) {
          target.items.push({
            ...({} as ResumeItem),
            id: uid(),
            title: kv[1].trim(),
            subtitle: '',
            start: '',
            end: '',
            location: '',
            bullets: '',
            tags: kv[2].split(/[,，、;；/|]/).map((s) => s.trim()).filter(Boolean),
            level: 0
          })
        } else {
          target.items.push({
            id: uid(),
            title: '',
            subtitle: '',
            start: '',
            end: '',
            location: '',
            bullets: '',
            tags: [line.trim()],
            level: 0
          })
        }
      }
      continue
    }
    // experience / education / projects / certificates → 条目型
    let target = typeToModule.get(sec.type)
    if (!target) {
      const existing = resume.modules.find((m) => m.type === sec.type)
      target = existing ?? resume.modules.find((m) => m.type === 'custom' && m.items.length === 0 && !m.text)
      if (!target) {
        // 新建一个自定义模块承接
        const m: ResumeModule = {
          id: uid(),
          type: sec.type === 'certificates' ? 'certificates' : 'custom',
          title: sec.title,
          visible: true,
          collapsed: false,
          column: sec.type === 'certificates' ? 'side' : 'main',
          text: '',
          items: [],
          data: { name: '', headline: '', photo: '', contacts: [] }
        }
        resume.modules.push(m)
        target = m
      } else {
        target.title = sec.title
      }
      typeToModule.set(sec.type, target)
    }
    if (target.items.length === 1 && !hasAny(target.items[0])) target.items = []
    for (const parsed of splitItems(sec.lines)) {
      target.items.push(itemFromLines(target, parsed.lines))
    }
  }

  return resume
}

function hasAny(it: ResumeItem): boolean {
  return !!(it.title || it.subtitle || it.start || it.end || it.location || it.bullets || it.tags.length)
}

function moduleUsed(m: ResumeModule): boolean {
  return m.items.length > 0 || !!m.text
}
