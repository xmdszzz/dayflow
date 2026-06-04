import { useEffect, useState } from 'react'
import { useViewStore } from '@/stores/viewStore'
import { useConfigStore } from '@/stores/configStore'
import Sidebar from './Sidebar'
import MonthView from '../calendar/MonthView'
import WeekView from '../calendar/WeekView'
import TodayView from '../calendar/TodayView'
import ChatPanel from '../chat/ChatPanel'

export default function MainLayout() {
  const view = useViewStore((s) => s.view)
  const setView = useViewStore((s) => s.setView)
  const loadConfig = useConfigStore((s) => s.load)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatVisible, setChatVisible] = useState(true)

  useEffect(() => { loadConfig() }, [])

  return (
    <div className="flex-1 flex">
      <Sidebar currentView={view} onNavigate={setView} onSettings={() => setSettingsOpen(true)} />
      <div className="flex-1 flex">
        {view === 'month' && <MonthView />}
        {view === 'week' && <WeekView />}
        {view === 'today' && <TodayView />}
      </div>
      {chatVisible ? (
        <ChatPanel visible={chatVisible} onToggle={() => setChatVisible(false)} />
      ) : (
        <button onClick={() => setChatVisible(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#cba6f7] text-[#1e1e2e] rounded-l-lg px-1 py-3 text-xs z-10">
          💬
        </button>
      )}
    </div>
  )
}
