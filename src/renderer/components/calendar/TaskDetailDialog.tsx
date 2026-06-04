import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Task } from '../../../shared/types'
import { useTaskStore } from '@/stores/taskStore'

interface TaskDetailProps {
  task: Task | null
  open: boolean
  onClose: () => void
}

export default function TaskDetailDialog({ task, open, onClose }: TaskDetailProps) {
  const { updateTask, cancelTask, deleteTask, completeTask, reactivateTask } = useTaskStore()
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [place, setPlace] = useState('')
  const [person, setPerson] = useState('')

  useEffect(() => {
    if (task) {
      setDate(task.date)
      setStartTime(task.start_time)
      setEndTime(task.end_time)
      setTitle(task.title)
      setNotes(task.notes)
      setPlace(task.place)
      setPerson(task.person)
      setEditing(false)
    }
  }, [task])

  if (!open || !task) return null

  const done = task.status === 'done'
  const cancelled = task.status === 'cancelled'
  const active = !done && !cancelled

  const handleSave = async () => {
    await updateTask(task.id, { date, start_time: startTime, end_time: endTime, title, notes, place, person })
    setEditing(false)
  }

  const handleComplete = async () => {
    await completeTask(task.id)
    onClose()
  }

  const handleCancel = async () => {
    await cancelTask(task.id)
    onClose()
  }

  const handleReactivate = async () => {
    await reactivateTask(task.id)
    onClose()
  }

  const handleDelete = async () => {
    await deleteTask(task.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1e1e2e] border border-[#313244] rounded-xl w-[400px] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">{editing ? '编辑任务' : '任务详情'}</h3>
          <button onClick={onClose} className="text-[#6c7086] hover:text-[#cdd6f4]"><X size={16} /></button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[#6c7086] text-[10px]">日期</label>
              {editing ? (
                <input value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1 mt-0.5 outline-none" />
              ) : (
                <div className="text-[#cdd6f4] mt-0.5">{task.date}</div>
              )}
            </div>
            <div className="w-20">
              <label className="text-[#6c7086] text-[10px]">开始</label>
              {editing ? (
                <input value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1 mt-0.5 outline-none" />
              ) : (
                <div className="text-[#cdd6f4] mt-0.5">{task.start_time}</div>
              )}
            </div>
            <div className="w-20">
              <label className="text-[#6c7086] text-[10px]">结束</label>
              {editing ? (
                <input value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1 mt-0.5 outline-none" />
              ) : (
                <div className="text-[#cdd6f4] mt-0.5">{task.end_time}</div>
              )}
            </div>
          </div>

          <div>
            <label className="text-[#6c7086] text-[10px]">标题</label>
            {editing ? (
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1 mt-0.5 outline-none" />
            ) : (
              <div className="text-[#cdd6f4] mt-0.5 font-medium">{task.title}</div>
            )}
          </div>

          <div>
            <label className="text-[#6c7086] text-[10px]">备注</label>
            {editing ? (
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1 mt-0.5 outline-none resize-none" />
            ) : (
              <div className="text-[#a6adc8] mt-0.5">{task.notes || '—'}</div>
            )}
          </div>

          {task.review && (
            <div>
              <label className="text-[#6c7086] text-[10px]">复盘</label>
              <div className="text-[#f9e2af] mt-0.5 text-[11px] leading-relaxed">{task.review}</div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[#6c7086] text-[10px]">地点</label>
              {editing ? (
                <input value={place} onChange={(e) => setPlace(e.target.value)}
                  className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1 mt-0.5 outline-none" />
              ) : (
                <div className="text-[#cdd6f4] mt-0.5">{task.place || '—'}</div>
              )}
            </div>
            <div className="flex-1">
              <label className="text-[#6c7086] text-[10px]">人物</label>
              {editing ? (
                <input value={person} onChange={(e) => setPerson(e.target.value)}
                  className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1 mt-0.5 outline-none" />
              ) : (
                <div className="text-[#cdd6f4] mt-0.5">{task.person || '—'}</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-5">
          <div className="flex gap-1">
            {active ? (
              <>
                <button onClick={handleComplete}
                  className="px-3 py-1 text-xs text-[#a6e3a1] bg-[#313244] hover:bg-[#45475a] rounded">
                  ✓ 完成
                </button>
                <button onClick={handleCancel}
                  className="px-3 py-1 text-xs text-[#f9e2af] bg-[#313244] hover:bg-[#45475a] rounded">
                  ⊘ 取消
                </button>
              </>
            ) : (
              <button onClick={handleReactivate}
                className="px-3 py-1 text-xs text-[#89b4fa] bg-[#313244] hover:bg-[#45475a] rounded">
                ↻ 重新激活
              </button>
            )}
            <button onClick={handleDelete}
              className="px-3 py-1 text-xs text-[#f38ba8] bg-[#313244] hover:bg-[#45475a] rounded">
              ✕ 删除
            </button>
          </div>
          <div className="flex gap-1">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)}
                  className="px-3 py-1 text-xs text-[#a6adc8] hover:text-[#cdd6f4]">取消</button>
                <button onClick={handleSave}
                  className="px-3 py-1 text-xs bg-[#cba6f7] text-[#1e1e2e] rounded font-medium hover:bg-[#b4befe]">
                  保存
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="px-3 py-1 text-xs text-[#89b4fa] bg-[#313244] hover:bg-[#45475a] rounded">
                ✏️ 编辑
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
