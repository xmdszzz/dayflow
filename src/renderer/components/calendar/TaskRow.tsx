import type { Task } from '../../../shared/types'
import { useTaskStore } from '@/stores/taskStore'
import { getTaskColor } from '@/utils/colors'

export default function TaskRow({ task }: { task: Task }) {
  const { completeTask, deleteTask } = useTaskStore()
  const done = task.status === 'done'

  return (
    <div className={`flex items-center gap-3 py-1.5 px-2 rounded text-xs ${done ? 'opacity-40 line-through' : 'hover:bg-[#313244]'}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getTaskColor(task.id) }} />
      <span className="w-12 flex-shrink-0 text-[#a6adc8]">{task.time}</span>
      <span className="w-20 truncate">{task.place || '—'}</span>
      <span className="w-16 truncate">{task.person || '—'}</span>
      <span className="flex-1 truncate">{task.event}</span>
      {!done && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => completeTask(task.id)} className="text-[#a6e3a1] hover:bg-[#45475a] px-1 rounded">&#10003;</button>
          <button onClick={() => deleteTask(task.id)} className="text-[#f38ba8] hover:bg-[#45475a] px-1 rounded">&#10005;</button>
        </div>
      )}
    </div>
  )
}
