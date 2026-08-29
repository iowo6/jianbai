import { useRef } from 'react'
import { useStore } from '../../store'
import { Button, Input } from '../ui'
import { IconPlus, IconTrash, IconX } from '../icons'
import type { BasicsData } from '../../types'

const QUICK_LABELS = ['电话', '邮箱', '城市', '微信', 'GitHub', '个人主页']

export function BasicsEditor({ data }: { data: BasicsData }) {
  const updateBasics = useStore((s) => s.updateBasics)
  const addContact = useStore((s) => s.addContact)
  const updateContact = useStore((s) => s.updateContact)
  const removeContact = useStore((s) => s.removeContact)
  const fileRef = useRef<HTMLInputElement>(null)

  const onPhoto = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateBasics({ photo: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <div className="edit-form">
      <div className="grid2">
        <label className="field">
          <span className="field-label">姓名</span>
          <Input value={data.name} onChange={(e) => updateBasics({ name: e.target.value })} placeholder="张三" />
        </label>
        <label className="field">
          <span className="field-label">求职意向</span>
          <Input
            value={data.headline}
            onChange={(e) => updateBasics({ headline: e.target.value })}
            placeholder="前端开发工程师"
          />
        </label>
      </div>

      <div className="photo-row">
        <span className="field-label">照片（需在「设计 → 装饰」中开启显示）</span>
        {data.photo ? (
          <span className="photo-actions">
            <img src={data.photo} alt="" className="photo-thumb" />
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              更换
            </Button>
            <Button size="sm" variant="danger" onClick={() => updateBasics({ photo: '' })}>
              <IconTrash size={13} />
            </Button>
          </span>
        ) : (
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <IconPlus size={13} /> 上传照片
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onPhoto(e.target.files?.[0])}
        />
      </div>

      <div className="contact-list">
        <div className="list-head">
          <span className="field-label">联系方式</span>
          <Button size="sm" onClick={() => addContact()}>
            <IconPlus size={13} /> 添加
          </Button>
        </div>
        {data.contacts.map((c) => (
          <div className="contact-row" key={c.id}>
            <Input
              className="contact-label"
              value={c.label}
              placeholder="如：电话"
              onChange={(e) => updateContact(c.id, { label: e.target.value })}
            />
            <Input value={c.value} placeholder="内容" onChange={(e) => updateContact(c.id, { value: e.target.value })} />
            <button className="icon-btn" title="删除" onClick={() => removeContact(c.id)}>
              <IconX size={14} />
            </button>
          </div>
        ))}
        {data.contacts.length === 0 && <div className="empty-hint">尚未添加联系方式</div>}
      </div>

      <div className="quick-labels">
        <span className="field-label">快捷填入：</span>
        {QUICK_LABELS.map((l) => (
          <Button key={l} size="sm" onClick={() => addContact(l)} title={`添加一条「${l}」`}>
            {l}
          </Button>
        ))}
      </div>
      <p className="form-hint">快捷填入会新增一条空白联系方式，选择标签后填入内容即可。</p>
    </div>
  )
}
