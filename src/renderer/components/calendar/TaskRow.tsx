import type { Task } from '../../../shared/types'
import { useTaskStore } from '@/stores/taskStore'

const STATUS_COLORS: Record<string, string> = {
  pending: '#f9e2af',
  done: '#a6e3a1',
  cancelled: '#f38ba8',
  expired: '#f38ba8',
}

export default function TaskRow({ task }: { task: Task }) {
  const { completeTask, cancelTask, deleteTask } = useTaskStore()
  const done = task.status === 'done'
  const cancelled = task.status === 'cancelled'
  const active = !done && !cancelled

  return (
    <div className={`flex items-center gap-3 py-1.5 px-2 rounded text-xs ${done || cancelled ? 'opacity-40 line-through' : 'hover:bg-[#313244]'}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[task.status] || '#f9e2af' }} />
      <span className="w-20 flex-shrink-0 text-[#a6adc8]">{task.start_time}-{task.end_time}</span>
      <span className="flex-1 truncate font-medium">{task.title}</span>
      <span className="w-16 truncate">{task.place || '—'}</span>
      <span className="w-14 truncate">{task.person || '—'}</span>
      {active && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); completeTask(task.id) }} title="完成" className="text-[#a6e3a1] hover:bg-[#45475a] px-1 rounded">&#10003;</button>
          <button onClick={(e) => { e.stopPropagation(); cancelTask(task.id) }} title="取消" className="text-[#f9e2af] hover:bg-[#45475a] px-1 rounded">&#8855;</button>
          <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }} title="删除" className="text-[#f38ba8] hover:bg-[#45475a] px-1 rounded">&#10005;</button>
        </div>
      )}
    </div>
  )
}
