import type { Task } from '../../../shared/types'
import { useTaskStore } from '@/stores/taskStore'

const STATUS_COLORS: Record<string, string> = {
  pending: '#f9e2af',
  done: '#a6e3a1',
  cancelled: '#f38ba8',
  expired: '#f38ba8',
}

export default function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  const { completeTask, cancelTask, deleteTask } = useTaskStore()
  const done = task.status === 'done'
  const cancelled = task.status === 'cancelled'
  const active = !done && !cancelled

  return (
    <div
      onClick={onClick}
      className={`bg-[#313244] rounded-lg p-3 border-l-2 ${done || cancelled ? 'opacity-40' : 'cursor-pointer hover:bg-[#45475a] transition-colors'}`}
      style={{ borderLeftColor: STATUS_COLORS[task.status] || '#f9e2af' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">{task.start_time} — {task.end_time}</span>
        {active && (
          <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); completeTask(task.id) }} title="完成" className="text-xs text-[#a6e3a1] bg-[#45475a] hover:bg-[#585b70] px-2 py-0.5 rounded">&#10003;</button>
            <button onClick={(e) => { e.stopPropagation(); cancelTask(task.id) }} title="取消" className="text-xs text-[#f9e2af] bg-[#45475a] hover:bg-[#585b70] px-2 py-0.5 rounded">&#8855;</button>
            <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }} title="删除" className="text-xs text-[#f38ba8] bg-[#45475a] hover:bg-[#585b70] px-2 py-0.5 rounded">&#10005;</button>
          </div>
        )}
      </div>
      <h4 className={`font-medium mb-1 ${done || cancelled ? 'line-through' : ''}`}>{task.title}</h4>
      {task.notes && <p className="text-[10px] text-[#6c7086] mb-1 line-clamp-2">{task.notes}</p>}
      <div className="text-xs text-[#a6adc8] flex gap-4">
        {task.place && <span>&#128205; {task.place}</span>}
        {task.person && <span>&#128100; {task.person}</span>}
      </div>
    </div>
  )
}
