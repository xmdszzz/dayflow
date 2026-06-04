import { useEffect, useRef } from 'react'
import type { Task } from '../../../shared/types'

interface MentionPopupProps {
  query: string
  tasks: Task[]
  onSelect: (taskId: string, taskName: string) => void
  onClose: () => void
  selectedIndex: number
}

export default function MentionPopup({ query, tasks, onSelect, onClose, selectedIndex }: MentionPopupProps) {
  const filtered = tasks.filter((t) => t.title.includes(query) || t.place.includes(query) || t.person.includes(query))
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-mention-item]')
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  return (
    <div className="absolute bottom-full left-2 right-2 mb-1 bg-[#45475a] rounded-lg shadow-lg max-h-32 overflow-y-auto z-50" ref={listRef}>
      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-xs text-[#6c7086]">无匹配任务</div>
      ) : (
        filtered.map((t, i) => (
          <button key={t.id} data-mention-item
            onClick={() => onSelect(t.id, t.title)}
            className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${
              i === selectedIndex ? 'bg-[#585b70]' : 'hover:bg-[#585b70]'
            }`}>
            <span className="text-[#a6e3a1]">📌</span>
            <span className="text-[#cdd6f4] font-medium">{t.title}</span>
            <span className="text-[#a6adc8] ml-auto">{t.date} {t.start_time}</span>
          </button>
        ))
      )}
    </div>
  )
}
