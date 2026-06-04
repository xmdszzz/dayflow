import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useConfigStore } from '@/stores/configStore'

interface SettingsDialogProps { open: boolean; onClose: () => void }

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { config, set } = useConfigStore()
  const [apiKey, setApiKey] = useState(config.api_key)
  const [reminderMinutes, setReminderMinutes] = useState(config.reminder_minutes)
  const [openAtLogin, setOpenAtLogin] = useState(config.open_at_login)
  const [dayStart, setDayStart] = useState(config.day_start)
  const [dayEnd, setDayEnd] = useState(config.day_end)

  useEffect(() => {
    setApiKey(config.api_key)
    setReminderMinutes(config.reminder_minutes)
    setOpenAtLogin(config.open_at_login)
    setDayStart(config.day_start)
    setDayEnd(config.day_end)
  }, [config, open])

  if (!open) return null

  const handleSave = async () => {
    await set('api_key', apiKey)
    await set('reminder_minutes', reminderMinutes)
    await set('open_at_login', openAtLogin)
    await set('day_start', dayStart)
    await set('day_end', dayEnd)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1e1e2e] border border-[#313244] rounded-xl w-[420px] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">⚙️ 设置</h2>
          <button onClick={onClose} className="text-[#6c7086] hover:text-[#cdd6f4]"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#a6adc8] block mb-1">DeepSeek API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..."
              className="w-full bg-[#313244] text-[#cdd6f4] text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#cba6f7]" />
            <p className="text-[10px] text-[#6c7086] mt-1">从 platform.deepseek.com 获取</p>
          </div>
          <div>
            <label className="text-xs text-[#a6adc8] block mb-1">提前提醒</label>
            <select value={reminderMinutes} onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
              className="w-full bg-[#313244] text-[#cdd6f4] text-sm rounded-lg px-3 py-2 outline-none">
              <option value={5}>5 分钟</option>
              <option value={10}>10 分钟</option>
              <option value={15}>15 分钟</option>
              <option value={30}>30 分钟</option>
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-[#a6adc8] block mb-1">每日开始</label>
              <input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)}
                className="w-full bg-[#313244] text-[#cdd6f4] text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#cba6f7]" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[#a6adc8] block mb-1">每日结束</label>
              <input type="time" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)}
                className="w-full bg-[#313244] text-[#cdd6f4] text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#cba6f7]" />
            </div>
          </div>
          <p className="text-[10px] text-[#6c7086]">每日时间段用于查询空闲时段（find_free_slots）</p>
          <div className="flex items-center justify-between">
            <label className="text-xs text-[#a6adc8]">开机自启</label>
            <button onClick={() => setOpenAtLogin(!openAtLogin)}
              className={`w-10 h-5 rounded-full transition-colors ${openAtLogin ? 'bg-[#a6e3a1]' : 'bg-[#45475a]'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${openAtLogin ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-1.5 text-xs text-[#a6adc8] hover:text-[#cdd6f4]">取消</button>
          <button onClick={handleSave} className="px-4 py-1.5 text-xs bg-[#cba6f7] text-[#1e1e2e] rounded-lg font-medium hover:bg-[#b4befe]">保存</button>
        </div>
      </div>
    </div>
  )
}
