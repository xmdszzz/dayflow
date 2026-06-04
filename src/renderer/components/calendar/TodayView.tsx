import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { useTaskStore } from '@/stores/taskStore'
import { useChatStore } from '@/stores/chatStore'
import TaskDetailDialog from './TaskDetailDialog'
import TaskCreateDialog from './TaskCreateDialog'
import type { Task } from '../../../shared/types'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function timeToMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const COLORS: Record<string, string> = { pending: '#f9e2af', done: '#a6e3a1', cancelled: '#f38ba8', expired: '#f38ba8' }

export default function TodayView() {
  const { tasks, loadTasks } = useTaskStore()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadTasks(today, today) }, [])
  const chatLen = useChatStore((s) => s.messages.length)
  useEffect(() => { loadTasks(today, today) }, [chatLen])

  const todayTasks = useMemo(() =>
    tasks.filter((t) => t.date === today).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [tasks, today])

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  // Pending tasks past their start_time are visually expired
  const pending = todayTasks.filter((t) => t.status === 'pending' && timeToMin(t.start_time) > nowMin)
  const expired = todayTasks.filter((t) =>
    t.status === 'expired' ||
    t.status === 'cancelled' ||
    (t.status === 'pending' && timeToMin(t.start_time) <= nowMin)
  )
  const done = todayTasks.filter((t) => t.status === 'done')
  const totalMin = pending.reduce((s, t) => s + (timeToMin(t.end_time) - timeToMin(t.start_time)), 0)

  // Compute equal-width columns so overlapping tasks share space evenly
  const taskLayout = useMemo(() => {
    const layout: Record<string, { col: number; totalCols: number }> = {}
    // Sort by start_time, then created_at for ties
    const sorted = [...todayTasks].sort((a, b) => {
      const d = timeToMin(a.start_time) - timeToMin(b.start_time)
      if (d !== 0) return d
      return a.created_at.localeCompare(b.created_at)
    })

    // Find max overlap: scan all start/end events to find the widest point
    // Then assign all tasks in the same overlap group that many columns
    let groups: { tasks: typeof sorted; totalCols: number }[] = []
    let current: typeof sorted = []
    let groupEnd = 0

    for (const t of sorted) {
      const s = timeToMin(t.start_time)
      if (current.length === 0 || s < groupEnd) {
        current.push(t)
        groupEnd = Math.max(groupEnd, timeToMin(t.end_time))
      } else {
        // Calculate max simultaneous tasks in this group
        const events: { time: number; delta: number }[] = []
        for (const ct of current) {
          events.push({ time: timeToMin(ct.start_time), delta: 1 })
          events.push({ time: timeToMin(ct.end_time), delta: -1 })
        }
        events.sort((a, b) => a.time - b.time || a.delta - b.delta)
        let maxCols = 0, active = 0
        for (const e of events) { active += e.delta; maxCols = Math.max(maxCols, active) }
        groups.push({ tasks: current, totalCols: maxCols })
        current = [t]
        groupEnd = timeToMin(t.end_time)
      }
    }
    if (current.length > 0) {
      const events: { time: number; delta: number }[] = []
      for (const ct of current) {
        events.push({ time: timeToMin(ct.start_time), delta: 1 })
        events.push({ time: timeToMin(ct.end_time), delta: -1 })
      }
      events.sort((a, b) => a.time - b.time || a.delta - b.delta)
      let maxCols = 0, active = 0
      for (const e of events) { active += e.delta; maxCols = Math.max(maxCols, active) }
      groups.push({ tasks: current, totalCols: maxCols })
    }

    // Assign columns within each group, all tasks get equal width = 100/maxCols
    for (const g of groups) {
      const cols: { end: number }[] = Array.from({ length: g.totalCols }, () => ({ end: 0 }))
      for (const t of g.tasks) {
        const s = timeToMin(t.start_time)
        // Find first free column
        const col = cols.findIndex((c) => c.end <= s)
        cols[col].end = Math.max(cols[col].end, timeToMin(t.end_time))
        layout[t.id] = { col, totalCols: g.totalCols }
      }
    }
    return layout
  }, [todayTasks])

  return (
    <div className="flex-1 flex flex-col">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[#313244] text-xs text-[#a6adc8] bg-[#11111b]">
        <span className="text-[#cdd6f4] font-semibold">{format(new Date(), 'M月d日 EEEE')}</span>
        <span className="text-[#f9e2af]">{pending.length} 待办</span>
        <span className="text-[#a6e3a1]">{done.length} 已完成</span>
        {expired.length > 0 && <span className="text-[#f38ba8]">{expired.length} 过期</span>}
        <span className="text-[#89b4fa]">{Math.floor(totalMin / 60)}h {totalMin % 60}m 总时长</span>
        <span className="text-[#6c7086] ml-auto">{todayTasks.length} 个任务</span>
        <button onClick={() => setShowCreate(true)}
          className="text-[#a6e3a1] hover:bg-[#313244] px-2 py-0.5 rounded text-sm font-bold transition-colors">
          +
        </button>
      </div>

      {/* Gantt chart — CSS grid, each row = 1 hour, automatically fills height */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-rows-[repeat(24,1fr)] relative" style={{ minHeight: '400px', height: '100%' }}>
          {/* Hour grid lines as grid rows */}
          {HOURS.map((h) => {
            const now = new Date()
            const currentHourTop = (now.getHours() * 60 + now.getMinutes()) / 60
            const isCurrentHour = h === now.getHours() && now.toISOString().slice(0, 10) === today

            return (
              <div key={h} className="border-t border-[#313244] flex items-start relative">
                <span className="text-[10px] text-[#585b70] pl-2 leading-none mt-0.5 w-12 flex-shrink-0">
                  {String(h).padStart(2, '0')}:00
                </span>
                <div className="flex-1 relative">
                  {/* Task blocks positioned within this hour's row */}
                  {todayTasks.map((t) => {
                    const startMin = timeToMin(t.start_time)
                    const endMin = timeToMin(t.end_time)
                    const startH = startMin / 60
                    const endH = endMin / 60
                    // Only render in the task's starting hour row
                    if (h !== Math.floor(startH)) return null

                    const visualStatus = t.status === 'pending' && timeToMin(t.start_time) <= nowMin ? 'expired' : t.status
                    const color = COLORS[visualStatus]
                    const isDone = t.status === 'done'
                    const spanRows = Math.max(1, Math.ceil(endH) - Math.floor(startH))
                    const topOffset = ((startH % 1) * 100).toFixed(1) + '%'
                    const lay = taskLayout[t.id] || { col: 0, totalCols: 1 }
                    const pct = (100 / lay.totalCols).toFixed(1)

                    return (
                      <button key={t.id} onClick={() => setEditingTask(t)}
                        className="absolute z-10 rounded px-1 py-0.5 text-left overflow-hidden transition-opacity hover:opacity-80"
                        style={{
                          top: topOffset,
                          height: `calc(${spanRows * 100}% - ${topOffset})`,
                          left: `${lay.col * parseFloat(pct)}%`,
                          width: `calc(${pct}% - 4px)`,
                          backgroundColor: color + '33',
                          borderLeft: `3px solid ${color}`,
                          minHeight: 18,
                        }}>
                        <div className={`text-[10px] truncate ${isDone ? 'line-through opacity-50' : 'text-[#cdd6f4]'}`}>
                          <span className="font-medium">{t.title}</span>
                        </div>
                        {endMin - startMin > 40 && <div className="text-[8px] text-[#a6adc8] truncate">{t.start_time}-{t.end_time}</div>}
                      </button>
                    )
                  })}

                  {/* Now line within this hour */}
                  {isCurrentHour && (
                    <div className="absolute left-0 right-1 z-20 pointer-events-none" style={{ top: ((currentHourTop % 1) * 100).toFixed(1) + '%' }}>
                      <div className="border-t border-[#cba6f7]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#cba6f7] -mt-[3px]" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <TaskCreateDialog open={showCreate} onClose={() => setShowCreate(false)} defaultDate={today} />
      <TaskDetailDialog task={editingTask} open={!!editingTask} onClose={() => setEditingTask(null)} />
    </div>
  )
}
