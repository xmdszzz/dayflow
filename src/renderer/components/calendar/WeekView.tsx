import { useEffect, useMemo, useState } from 'react'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday } from 'date-fns'
import { useViewStore } from '@/stores/viewStore'
import { useTaskStore } from '@/stores/taskStore'
import { useChatStore } from '@/stores/chatStore'
import TaskDetailDialog from './TaskDetailDialog'
import DayTasksPopup from './DayTasksPopup'
import TaskCreateDialog from './TaskCreateDialog'
import type { Task } from '../../../shared/types'

const STATUS_COLORS: Record<string, string> = {
  pending: '#f9e2af',
  done: '#a6e3a1',
  cancelled: '#f38ba8',
  expired: '#f38ba8',
}

export default function WeekView() {
  const { currentDate, goNext, goPrev, weekRange } = useViewStore()
  const { tasks, loadTasks } = useTaskStore()
  const range = weekRange()
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadTasks(range.start, range.end) }, [currentDate])
  const chatLen = useChatStore((s) => s.messages.length)
  useEffect(() => { loadTasks(range.start, range.end) }, [chatLen])

  const days = useMemo(() => {
    const s = startOfWeek(currentDate, { weekStartsOn: 1 })
    const e = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: s, end: e })
  }, [currentDate])

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof tasks> = {}
    for (const d of days) map[format(d, 'yyyy-MM-dd')] = []
    for (const t of tasks) { const key = t.date; if (map[key]) map[key].push(t) }
    return map
  }, [tasks, days])

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={goPrev} className="text-[#a6adc8] hover:text-[#cdd6f4] text-lg">&#9664;</button>
        <h2 className="text-lg font-semibold">{format(days[0], 'M月d日')} — {format(days[6], 'M月d日')}</h2>
        <button onClick={goNext} className="text-[#a6adc8] hover:text-[#cdd6f4] text-lg">&#9654;</button>
      </div>
      <div className="flex-1 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDate[key] || []
          return (
            <div key={key} className={`flex flex-col rounded-lg p-2 ${isToday(day) ? 'bg-[#313244] border border-[#cba6f7]' : 'bg-[#181825]'}`}>
              <div className="text-xs text-[#6c7086] mb-2 cursor-pointer" onClick={() => setSelectedDate(key)}>
                <span>{format(day, 'EEE')}</span>
                <span className={`ml-1 font-bold ${isToday(day) ? 'text-[#cba6f7]' : 'text-[#cdd6f4]'}`}>{format(day, 'd')}</span>
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {dayTasks.map((t) => (
                  <button key={t.id} onClick={() => setEditingTask(t)}
                    className="w-full text-left text-[10px] rounded px-1.5 py-1 truncate border-l-[3px] transition-colors hover:opacity-80"
                    style={{ backgroundColor: STATUS_COLORS[t.status] + '22', borderColor: STATUS_COLORS[t.status] }}>
                    <span className={t.status === 'done' ? 'line-through opacity-60' : ''}>
                      <span className="text-[#cdd6f4]">{t.start_time}</span>
                      <span className="text-[#a6adc8] ml-1">{t.title}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {selectedDate && (
        <DayTasksPopup
          date={selectedDate}
          tasks={tasksByDate[selectedDate] || []}
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
