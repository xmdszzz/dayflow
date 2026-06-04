import { useEffect, useMemo, useState } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday } from 'date-fns'
import { useViewStore } from '@/stores/viewStore'
import { useTaskStore } from '@/stores/taskStore'
import { useChatStore } from '@/stores/chatStore'
import DayTasksPopup from './DayTasksPopup'
import TaskDetailDialog from './TaskDetailDialog'
import TaskCreateDialog from './TaskCreateDialog'
import type { Task } from '../../../shared/types'

export default function MonthView() {
  const { currentDate, goNext, goPrev, monthRange } = useViewStore()
  const { tasks, loadTasks } = useTaskStore()
  const range = monthRange()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadTasks(range.start, range.end) }, [currentDate])

  const chatLen = useChatStore((s) => s.messages.length)
  useEffect(() => { loadTasks(range.start, range.end) }, [chatLen])

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const d of days) map[format(d, 'yyyy-MM-dd')] = []
    for (const t of tasks) { const k = t.date; if (map[k]) map[k].push(t) }
    return map
  }, [tasks, days])

  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] || []) : []

  const dotColor = (status: string) => {
    switch (status) {
      case 'done': return '#a6e3a1'
      case 'expired':
      case 'cancelled': return '#f38ba8'
      default: return '#f9e2af'
    }
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={goPrev} className="text-[#a6adc8] hover:text-[#cdd6f4] text-lg">&#9664;</button>
        <h2 className="text-lg font-semibold">{format(currentDate, 'yyyy年M月')}</h2>
        <button onClick={goNext} className="text-[#a6adc8] hover:text-[#cdd6f4] text-lg">&#9654;</button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-[#6c7086] mb-1">
        {['一','二','三','四','五','六','日'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-px bg-[#313244] rounded-lg overflow-hidden">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDate[key] || []
          return (
            <button key={key} onClick={() => setSelectedDate(key)}
              className={`bg-[#1e1e2e] p-1.5 flex flex-col items-center gap-0.5 transition-colors hover:bg-[#313244] cursor-pointer ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}`}>
              <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-[#cba6f7] text-[#1e1e2e] font-bold' : 'text-[#cdd6f4]'}`}>
                {format(day, 'd')}
              </span>
              {dayTasks.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5">
                  {dayTasks.map((t) => (
                    <span key={t.id} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor(t.status) }} title={t.title} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Day tasks popup → click to see all tasks for the day */}
      {selectedDate && (
        <DayTasksPopup
          date={selectedDate}
          tasks={selectedTasks}
          onTaskClick={setEditingTask}
          onAddTask={() => setShowCreate(true)}
          onClose={() => setSelectedDate(null)}
        />
      )}

      <TaskCreateDialog open={showCreate} onClose={() => setShowCreate(false)} defaultDate={selectedDate || undefined} />
      <TaskDetailDialog task={editingTask} open={!!editingTask} onClose={() => setEditingTask(null)} />
    </div>
  )
}
