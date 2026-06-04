import type { Task } from '../../../shared/types'
import { useTaskStore } from '@/stores/taskStore'

const COLORS = ['#f38ba8', '#89b4fa', '#a6e3a1', '#fab387', '#cba6f7', '#f9e2af']

export default function TaskCard({ task }: { task: Task }) {
  const { completeTask } = useTaskStore()
  const colorIdx = task.id.charCodeAt(0) % COLORS.length
  const done = task.status === 'done'

  return (
    <div className={`bg-[#313244] rounded-lg p-3 border-l-2 ${done ? 'opacity-40' : ''}`} style={{ borderLeftColor: COLORS[colorIdx] }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">{task.time}</span>
        {!done && <button onClick={() => completeTask(task.id)} className="text-xs text-[#a6e3a1] bg-[#45475a] hover:bg-[#585b70] px-2 py-0.5 rounded">&#10003; 完成</button>}
      </div>
      <h4 className="font-medium mb-1">{task.event}</h4>
      <div className="text-xs text-[#a6adc8] flex gap-4">
        {task.place && <span>&#128205; {task.place}</span>}
        {task.person && <span>&#128100; {task.person}</span>}
      </div>
    </div>
  )
}
