import { useEffect, useRef, useState } from 'react'
import { Button } from './ui'

interface Props {
  value: string
  onChange: (html: string) => void
  minHeight?: number
  placeholder?: string
}

/**
 * 轻量富文本编辑器：contentEditable + execCommand
 * 粘贴自动转为纯文本，保证简历内容干净可控
 */
export function RichTextEditor({ value, onChange, minHeight = 90, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const lastHtml = useRef(value)
  const savedRange = useRef<Range | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = value || ''
      lastHtml.current = value
      document.execCommand('defaultParagraphSeparator', false, 'p')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (ref.current && value !== lastHtml.current) {
      ref.current.innerHTML = value || ''
      lastHtml.current = value
    }
  }, [value])

  const emit = () => {
    if (!ref.current) return
    const html = ref.current.innerHTML
    const clean = html === '<br>' || html === '<div><br></div>' ? '' : html
    lastHtml.current = clean
    onChange(clean)
  }

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
  }

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  const openLink = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange()
    setLinkUrl('https://')
    setLinkOpen(true)
  }

  const applyLink = () => {
    const url = linkUrl.trim()
    if (url && url !== 'https://') {
      const sel = window.getSelection()
      if (savedRange.current && sel) {
        sel.removeAllRanges()
        sel.addRange(savedRange.current)
      }
      exec('createLink', url)
    }
    setLinkOpen(false)
  }

  const toolBtn = (label: React.ReactNode, title: string, fn: () => void) => (
    <button
      type="button"
      className="rte-btn"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        fn()
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="rte">
      <div className="rte-bar">
        {toolBtn(<b>B</b>, '加粗', () => exec('bold'))}
        {toolBtn(<i>I</i>, '斜体', () => exec('italic'))}
        {toolBtn(<u>U</u>, '下划线', () => exec('underline'))}
        {toolBtn('• 列表', '无序列表', () => exec('insertUnorderedList'))}
        {toolBtn('1. 列表', '有序列表', () => exec('insertOrderedList'))}
        {toolBtn('链接', '插入链接', openLink)}
        {toolBtn('清除', '清除格式', () => exec('removeFormat'))}
      </div>
      {linkOpen && (
        <div className="rte-link">
          <input
            className="input"
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyLink()
              if (e.key === 'Escape') setLinkOpen(false)
            }}
            placeholder="https://"
          />
          <Button size="sm" variant="primary" onClick={applyLink}>
            确定
          </Button>
          <Button size="sm" onClick={() => setLinkOpen(false)}>
            取消
          </Button>
        </div>
      )}
      <div
        ref={ref}
        className="rte-area"
        style={{ minHeight }}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
      />
    </div>
  )
}
