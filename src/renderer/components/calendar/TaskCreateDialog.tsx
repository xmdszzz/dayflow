import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTaskStore } from '@/stores/taskStore'

interface TaskCreateDialogProps {
  open: boolean
  onClose: () => void
  defaultDate?: string
}

export default function TaskCreateDialog({ open, onClose, defaultDate }: TaskCreateDialogProps) {
  const { addTask } = useTaskStore()
  const [date, setDate] = useState(defaultDate || '')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [person, setPerson] = useState('')
  const [notes, setNotes] = useState('')

  // Sync defaultDate when dialog opens (useState only reads it once)
  useEffect(() => {
    if (open) {
      setDate(defaultDate || '')
      setStartTime('09:00')
      setEndTime('10:00')
      setTitle('')
      setPlace('')
      setPerson('')
      setNotes('')
    }
  }, [open, defaultDate])

  if (!open) return null

  const handleSave = async () => {
    if (!title.trim() || !date) return
    await addTask({ date, start_time: startTime, end_time: endTime, title: title.trim(), place, person, notes })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1e1e2e] border border-[#313244] rounded-xl w-[420px] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">新建任务</h3>
          <button onClick={onClose} className="text-[#6c7086] hover:text-[#cdd6f4]"><X size={16} /></button>
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-[#6c7086] text-[10px]">日期 *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1.5 mt-0.5 outline-none focus:ring-1 focus:ring-[#cba6f7]" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[#6c7086] text-[10px]">开始时间</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1.5 mt-0.5 outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-[#6c7086] text-[10px]">结束时间</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1.5 mt-0.5 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[#6c7086] text-[10px]">标题 *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="任务标题"
              className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1.5 mt-0.5 outline-none placeholder:text-[#585b70]" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[#6c7086] text-[10px]">地点</label>
              <input value={place} onChange={(e) => setPlace(e.target.value)}
                className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1.5 mt-0.5 outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-[#6c7086] text-[10px]">人物</label>
              <input value={person} onChange={(e) => setPerson(e.target.value)}
                className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1.5 mt-0.5 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[#6c7086] text-[10px]">备注</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full bg-[#313244] text-[#cdd6f4] rounded px-2 py-1.5 mt-0.5 outline-none resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-1.5 text-xs text-[#a6adc8] hover:text-[#cdd6f4]">取消</button>
          <button onClick={handleSave}
            className="px-4 py-1.5 text-xs bg-[#cba6f7] text-[#1e1e2e] rounded-lg font-medium hover:bg-[#b4befe] disabled:opacity-50"
            disabled={!title.trim() || !date}>
            创建
          </button>
        </div>
      </div>
    </div>
  )
}
