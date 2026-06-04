import { Send } from 'lucide-react'
import { useRef, useCallback } from 'react'

interface ChatInputProps {
  value: string
  onChange: (value: string, cursor: number) => void
  onSend: () => void
  disabled: boolean
}

export default function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value, e.target.selectionStart || 0)
  }, [onChange])

  return (
    <div className="flex items-center gap-1 p-2 border-t border-[#313244]">
      <textarea ref={ref} value={value} onChange={handleChange}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
        disabled={disabled}
        placeholder="输入日程，如 @项目评审会 改到3点... 或 /help"
        rows={2}
        className="flex-1 bg-[#313244] text-[#cdd6f4] text-xs rounded px-2 py-1.5 resize-none outline-none placeholder:text-[#6c7086] disabled:opacity-50"
      />
      <button onClick={onSend} disabled={disabled || !value.trim()}
        className="p-2 text-[#cba6f7] hover:bg-[#313244] rounded disabled:opacity-30">
        <Send size={16} />
      </button>
    </div>
  )
}
