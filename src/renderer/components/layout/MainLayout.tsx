import { useState } from 'react'
import Sidebar from './Sidebar'
import MonthView from '../calendar/MonthView'
import WeekView from '../calendar/WeekView'
import TodayView from '../calendar/TodayView'

type ViewType = 'month' | 'week' | 'today'

export default function MainLayout() {
  const [view, setView] = useState<ViewType>('today')

  return (
    <div className="flex-1 flex">
      <Sidebar currentView={view} onNavigate={setView} onSettings={() => {}} />
      <div className="flex-1 flex">
        {view === 'month' && <MonthView />}
        {view === 'week' && <WeekView />}
        {view === 'today' && <TodayView />}
      </div>
    </div>
  )
}
