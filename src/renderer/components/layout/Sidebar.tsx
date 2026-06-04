import { Calendar, Columns, Sun, Settings } from 'lucide-react'

type ViewType = 'month' | 'week' | 'today'

interface SidebarProps {
  currentView: ViewType
  onNavigate: (view: ViewType) => void
  onSettings: () => void
}

export default function Sidebar({ currentView, onNavigate, onSettings }: SidebarProps) {
  const items: { id: ViewType; icon: typeof Calendar; label: string }[] = [
    { id: 'month', icon: Calendar, label: '月视图' },
    { id: 'week', icon: Columns, label: '周视图' },
    { id: 'today', icon: Sun, label: '今日' },
  ]

  return (
    <div className="w-14 bg-[#11111b] flex flex-col items-center py-3 gap-2">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            currentView === id ? 'bg-[#cba6f7] text-[#1e1e2e]' : 'text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#313244]'
          }`}
          title={label}
        >
          <Icon size={20} />
        </button>
      ))}
      <div className="mt-auto">
        <button
          onClick={onSettings}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#313244] transition-colors"
          title="设置"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  )
}
