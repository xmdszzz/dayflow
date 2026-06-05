import { useState, useEffect } from 'react'
import { Download, RotateCw, X, AlertCircle, CheckCircle } from 'lucide-react'
import type { UpdateStatus } from '@/types/electron'

export default function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsub = window.api.on('update:status', (data: unknown) => {
      const s = data as UpdateStatus
      setStatus(s)
      if (s.state === 'available' || s.state === 'downloaded') {
        setDismissed(false)
      }
    })
    return () => { unsub() }
  }, [])

  // Nothing to show in these states
  if (status.state === 'idle' || status.state === 'checking' || status.state === 'not-available') {
    return null
  }
  if (dismissed) return null

  const handleDownload = () => {
    window.api.invoke('update:download')
  }

  const handleInstall = () => {
    window.api.invoke('update:install')
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  let content: React.ReactNode

  switch (status.state) {
    case 'available':
      content = (
        <>
          <Download size={14} className="text-[#89b4fa] flex-shrink-0" />
          <span className="flex-1">
            新版本 <span className="text-[#89b4fa] font-medium">v{status.version}</span> 可用
          </span>
          <button
            onClick={handleDownload}
            className="text-[10px] bg-[#89b4fa] text-[#1e1e2e] px-3 py-0.5 rounded font-medium hover:opacity-80 transition-opacity"
          >
            下载更新
          </button>
        </>
      )
      break

    case 'downloading':
      content = (
        <>
          <Download size={14} className="text-[#89b4fa] animate-pulse flex-shrink-0" />
          <span className="flex-1">
            正在下载 v{status.version} … {status.percent}%
          </span>
          <div className="w-16 h-1.5 bg-[#313244] rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-[#89b4fa] rounded-full transition-all duration-300"
              style={{ width: `${status.percent || 0}%` }}
            />
          </div>
        </>
      )
      break

    case 'downloaded':
      content = (
        <>
          <CheckCircle size={14} className="text-[#a6e3a1] flex-shrink-0" />
          <span className="flex-1">
            v{status.version} 已就绪，重启后生效
          </span>
          <button
            onClick={handleInstall}
            className="text-[10px] bg-[#a6e3a1] text-[#1e1e2e] px-3 py-0.5 rounded font-medium hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            <RotateCw size={10} />
            立即重启
          </button>
        </>
      )
      break

    case 'error':
      content = (
        <>
          <AlertCircle size={14} className="text-[#f38ba8] flex-shrink-0" />
          <span className="flex-1 text-[#f38ba8]">
            更新检查失败: {status.error || '未知错误'}
          </span>
        </>
      )
      break

    default:
      return null
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1e2e] border-b border-[#313244] text-[11px] text-[#cdd6f4]">
      {content}
      <button
        onClick={handleDismiss}
        className="text-[#585b70] hover:text-[#cdd6f4] flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  )
}
