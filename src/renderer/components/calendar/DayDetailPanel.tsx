import type { Task } from '../../../shared/types'
import TaskRow from './TaskRow'

interface DayDetailPanelProps { date: string; tasks: Task[] }

export default function DayDetailPanel({ date, tasks }: DayDetailPanelProps) {
  return (
    <div className="border-t border-[#313244] mt-3 pt-3">
      <h3 className="text-sm font-semibold mb-2">{date}</h3>
      {tasks.length === 0 ? <p className="text-xs text-[#6c7086]">暂无日程</p>
        : tasks.map((t) => <TaskRow key={t.id} task={t} />)}
    </div>
  )
}
