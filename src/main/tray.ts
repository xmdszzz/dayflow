import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import path from 'path'
import { getTodayPendingTasks } from './db'

let tray: Tray | null = null

export function createTray(): void {
  // Create a simple 16x16 icon programmatically
  const icon = nativeImage.createEmpty()
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png')
  try {
    const img = nativeImage.createFromPath(iconPath)
    if (!img.isEmpty()) {
      tray = new Tray(img.resize({ width: 16, height: 16 }))
    }
  } catch { /* fallback */ }

  if (!tray) {
    // Fallback: use a tiny data URL icon
    tray = new Tray(nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVQ4T2NkYPj/n4EBBJgYKAQM1AyYgGpegCoFqjY+sLMBHmCgBgAAAP//AwBpXIJcGrU8ZwAAAABJRU5ErkJggg=='))
  }

  tray.setToolTip('DayFlow')
  updateTrayMenu()

  tray.on('double-click', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) { win.show(); win.focus() }
  })

  // Refresh tray menu every minute
  setInterval(updateTrayMenu, 60_000)
}

export function updateTrayMenu(): void {
  let tasks: { start_time: string; title: string }[] = []
  try {
    tasks = getTodayPendingTasks()
  } catch {
    // Database not ready yet, show empty menu
  }

  const taskItems = tasks.slice(0, 5).map((t) => ({
    label: `${t.start_time} · ${t.title}`,
    enabled: false,
  }))

  const menu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) { win.show(); win.focus() }
      },
    },
    { type: 'separator' },
    { label: `今日 ${tasks.length} 个任务`, enabled: false },
    ...(tasks.length > 0 ? taskItems : [{ label: '暂无任务', enabled: false }]),
    { type: 'separator' },
    { label: '设置', click: () => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('open-settings')
    }},
    { type: 'separator' },
    { label: '退出', click: () => { app.exit(0) } },
  ])

  if (tray) tray.setContextMenu(menu)
}
