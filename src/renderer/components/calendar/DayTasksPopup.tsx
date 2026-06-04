import type { Task } from '../../../shared/types'
import TaskRow from './TaskRow'

interface DayTasksPopupProps {
  date: string
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: () => void
  onClose: () => void
}

export default function DayTasksPopup({ date, tasks, onTaskClick, onAddTask, onClose }: DayTasksPopupProps) {
  const handleTaskClick = (t: Task) => {
    onClose()
    onTaskClick(t)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1e1e2e] border border-[#313244] rounded-xl w-[480px] max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#313244]">
          <h3 className="text-sm font-semibold">{date} · {tasks.length} 个任务</h3>
          <button onClick={onClose} className="text-[#6c7086] hover:text-[#cdd6f4] text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {tasks.length === 0 ? (
            <p className="text-xs text-[#6c7086] text-center py-4">暂无日程</p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} onClick={() => handleTaskClick(t)} className="cursor-pointer">
                <TaskRow task={t} />
              </div>
            ))
          )}
        </div>
        {onAddTask && (
          <div className="border-t border-[#313244] p-2">
            <button onClick={onAddTask}
              className="w-full py-1.5 text-xs text-[#89b4fa] hover:bg-[#313244] rounded transition-colors">
              + 添加任务
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
