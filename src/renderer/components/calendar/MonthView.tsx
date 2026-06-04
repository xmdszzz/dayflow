import { useEffect, useMemo } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday } from 'date-fns'
import { useViewStore } from '@/stores/viewStore'
import { useTaskStore } from '@/stores/taskStore'
import DayCell from './DayCell'
import DayDetailPanel from './DayDetailPanel'

export default function MonthView() {
  const { currentDate, goNext, goPrev, monthRange } = useViewStore()
  const { tasks, loadTasks, selectedDate } = useTaskStore()
  const range = monthRange()

  useEffect(() => { loadTasks(range.start, range.end) }, [currentDate])

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  const tasksByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) map[t.date] = (map[t.date] || 0) + 1
    return map
  }, [tasks])

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
      <div className="grid grid-cols-7 flex-1 gap-px bg-[#313244] rounded-lg overflow-hidden">
        {days.map((day) => (
          <DayCell key={day.toISOString()} date={day}
            taskCount={tasksByDate[format(day, 'yyyy-MM-dd')] || 0}
            isCurrentMonth={isSameMonth(day, currentDate)} isToday={isToday(day)} />
        ))}
      </div>
      {selectedDate && <DayDetailPanel date={selectedDate} tasks={tasks.filter((t) => t.date === selectedDate)} />}
    </div>
  )
}
