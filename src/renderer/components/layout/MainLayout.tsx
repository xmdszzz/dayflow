import { useEffect, useState } from 'react'
import { useViewStore } from '@/stores/viewStore'
import { useConfigStore } from '@/stores/configStore'
import Sidebar from './Sidebar'
import MonthView from '../calendar/MonthView'
import WeekView from '../calendar/WeekView'
import TodayView from '../calendar/TodayView'

export default function MainLayout() {
  const view = useViewStore((s) => s.view)
  const setView = useViewStore((s) => s.setView)
  const loadConfig = useConfigStore((s) => s.load)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => { loadConfig() }, [])

  return (
    <div className="flex-1 flex">
      <Sidebar currentView={view} onNavigate={setView} onSettings={() => setSettingsOpen(true)} />
      <div className="flex-1 flex">
        {view === 'month' && <MonthView />}
        {view === 'week' && <WeekView />}
        {view === 'today' && <TodayView />}
      </div>
    </div>
  )
}
