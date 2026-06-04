import { useState, useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.invoke('window:isMaximized').then((v) => setIsMaximized(v as boolean))
    const unsub = window.api.on('window:stateChanged', (state: unknown) => {
      if (state === 'maximized') setIsMaximized(true)
      else if (state === 'unmaximized') setIsMaximized(false)
    })
    return () => { unsub() }
  }, [])

  return (
    <div className="h-8 bg-[#11111b] flex items-center select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <span className="text-[#a6adc8] text-xs font-medium px-3">DayFlow</span>

      <div className="ml-auto flex" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => window.api.invoke('window:minimize')}
          className="w-10 h-8 flex items-center justify-center text-[#a6adc8] hover:bg-[#313244] transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.api.invoke('window:maximize')}
          className="w-10 h-8 flex items-center justify-center text-[#a6adc8] hover:bg-[#313244] transition-colors"
        >
          {isMaximized ? <Copy size={13} /> : <Square size={13} />}
        </button>
        <button
          onClick={() => window.api.invoke('window:close')}
          className="w-10 h-8 flex items-center justify-center text-[#a6adc8] hover:bg-[#f38ba8] hover:text-white transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
