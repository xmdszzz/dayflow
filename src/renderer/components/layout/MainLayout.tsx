import { useEffect, useState, useRef, useCallback } from 'react'
import { useViewStore } from '@/stores/viewStore'
import { useConfigStore } from '@/stores/configStore'
import Sidebar from './Sidebar'
import MonthView from '../calendar/MonthView'
import WeekView from '../calendar/WeekView'
import TodayView from '../calendar/TodayView'
import ChatPanel from '../chat/ChatPanel'
import SettingsDialog from '../settings/SettingsDialog'

const CHAT_MIN = 260
const CHAT_MAX = 500

export default function MainLayout() {
  const view = useViewStore((s) => s.view)
  const setView = useViewStore((s) => s.setView)
  const loadConfig = useConfigStore((s) => s.load)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatVisible, setChatVisible] = useState(true)
  const [chatWidth, setChatWidth] = useState(320)
  const dragging = useRef(false)

  useEffect(() => { loadConfig() }, [])

  useEffect(() => {
    const unsub = window.api.on('open-settings', () => setSettingsOpen(true))
    return () => { unsub() }
  }, [])

  const onHandleDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const startX = e.clientX
    const startW = chatWidth

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX
      setChatWidth(Math.max(CHAT_MIN, Math.min(CHAT_MAX, startW + delta)))
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [chatWidth])

  // Clamp on window resize
  useEffect(() => {
    const onResize = () => setChatWidth((w) => Math.min(w, window.innerWidth * 0.4))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="flex-1 flex">
      <Sidebar currentView={view} onNavigate={setView} onSettings={() => setSettingsOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        {view === 'month' && <MonthView />}
        {view === 'week' && <WeekView />}
        {view === 'today' && <TodayView />}
      </div>

      {chatVisible && (
        <>
          {/* Drag handle between calendar and chat */}
          <div
            onMouseDown={onHandleDown}
            className="w-[6px] flex-shrink-0 cursor-col-resize transition-colors hover:bg-[#cba6f7] bg-transparent self-stretch"
          />
          <div className="flex-shrink-0 border-l border-[#313244] self-stretch overflow-hidden" style={{ width: chatWidth, minWidth: CHAT_MIN, maxWidth: CHAT_MAX }}>
            <ChatPanel visible onToggle={() => setChatVisible(false)} />
          </div>
        </>
      )}

      {!chatVisible && (
        <button onClick={() => setChatVisible(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#cba6f7] text-[#1e1e2e] rounded-l-lg px-1 py-3 text-xs z-10">
          💬
        </button>
      )}

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
