import { Send } from 'lucide-react'
import { useRef, useCallback, useState } from 'react'

interface ChatInputProps {
  value: string
  onChange: (value: string, cursor: number) => void
  onSend: () => void
  disabled: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean
}

const MIN_H = 60
const MAX_H = 300

export default function ChatInput({ value, onChange, onSend, disabled, onKeyDown }: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [height, setHeight] = useState(90)
  const [dragging, setDragging] = useState(false)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value, e.target.selectionStart || 0)
  }, [onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (onKeyDown?.(e)) return
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
  }

  const onHandleDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    const startY = e.clientY
    const startH = height

    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY
      setHeight(Math.max(MIN_H, Math.min(MAX_H, startH + delta)))
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="border-t border-[#313244]">
      {/* Resize handle — top edge, same style as chat panel width handle */}
      <div
        onMouseDown={onHandleDown}
        className={`h-[6px] cursor-row-resize transition-colors ${dragging ? 'bg-[#cba6f7]' : 'bg-transparent hover:bg-[#cba6f7]'}`}
      />
      <div className="flex items-center gap-1 px-2 pb-2" style={{ height }}>
        <textarea ref={ref} value={value} onChange={handleChange} onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="输入日程，如 @项目评审会 改到3点... 或 /help"
          className="flex-1 bg-[#313244] text-[#cdd6f4] text-xs rounded px-2 py-1.5 resize-none outline-none placeholder:text-[#6c7086] disabled:opacity-50 h-full"
        />
        <button onClick={onSend} disabled={disabled || !value.trim()}
          className="p-2 text-[#cba6f7] hover:bg-[#313244] rounded disabled:opacity-30 self-end mb-1">
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
