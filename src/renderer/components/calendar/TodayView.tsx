import { useEffect } from 'react'
import { format } from 'date-fns'
import { useTaskStore } from '@/stores/taskStore'
import TaskCard from './TaskCard'

export default function TodayView() {
  const { tasks, loadTasks } = useTaskStore()
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => { loadTasks(today, today) }, [])

  const todayTasks = tasks.filter((t) => t.date === today).sort((a, b) => a.time.localeCompare(b.time))
  const pending = todayTasks.filter((t) => t.status === 'pending')
  const done = todayTasks.filter((t) => t.status === 'done')

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold">{format(new Date(), 'yyyy年M月d日')}<span className="text-sm font-normal text-[#a6adc8] ml-2">{format(new Date(), 'EEEE')}</span></h2>
        <p className="text-xs text-[#6c7086] mt-1">{pending.length} 个待办</p>
      </div>
      <div className="space-y-3">{pending.map((t) => <TaskCard key={t.id} task={t} />)}</div>
      {done.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm text-[#6c7086] mb-3">已完成 ({done.length})</h3>
          <div className="space-y-2 opacity-60">{done.map((t) => <TaskCard key={t.id} task={t} />)}</div>
        </div>
      )}
      {todayTasks.length === 0 && <p className="text-[#6c7086] text-sm mt-20 text-center">今天没有日程，在聊天面板里添加吧</p>}
    </div>
  )
}
