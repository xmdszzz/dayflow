import { format } from 'date-fns'
import { useTaskStore } from '@/stores/taskStore'

interface DayCellProps {
  date: Date
  taskCount: number
  isCurrentMonth: boolean
  isToday: boolean
}

export default function DayCell({ date, taskCount, isCurrentMonth, isToday }: DayCellProps) {
  const { selectDate } = useTaskStore()
  const dateStr = format(date, 'yyyy-MM-dd')

  return (
    <button onClick={() => dateStr && selectDate(dateStr)}
      className={`bg-[#1e1e2e] p-1.5 flex flex-col items-center gap-0.5 min-h-[60px] transition-colors hover:bg-[#313244] ${!isCurrentMonth ? 'opacity-30' : ''}`}>
      <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#cba6f7] text-[#1e1e2e] font-bold' : 'text-[#cdd6f4]'}`}>
        {format(date, 'd')}
      </span>
      {taskCount > 0 && <span className="text-[10px] text-[#a6adc8] bg-[#313244] px-1 rounded">{taskCount}</span>}
    </button>
  )
}
