import type { Task } from '../../../shared/types'

interface MentionPopupProps {
  query: string
  tasks: Task[]
  onSelect: (taskId: string, taskName: string) => void
  onClose: () => void
}

export default function MentionPopup({ query, tasks, onSelect }: MentionPopupProps) {
  const filtered = tasks.filter((t) => t.event.includes(query) || t.place.includes(query) || t.person.includes(query))

  return (
    <div className="absolute bottom-full left-2 right-2 mb-1 bg-[#45475a] rounded-lg shadow-lg max-h-32 overflow-y-auto z-50">
      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-xs text-[#6c7086]">无匹配任务</div>
      ) : (
        filtered.map((t) => (
          <button key={t.id} onClick={() => onSelect(t.id, t.event)}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#585b70] flex items-center gap-2">
            <span className="text-[#a6e3a1]">📌</span>
            <span className="text-[#cdd6f4] font-medium">{t.event}</span>
            <span className="text-[#a6adc8] ml-auto">{t.date} {t.time}</span>
          </button>
        ))
      )}
    </div>
  )
}
