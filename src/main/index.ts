import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { initDatabase, getConfig, getDatabase } from './db'
import { registerIpcHandlers } from './ipc-handlers'
import { compressDate } from './compressor'
import { format, subDays } from 'date-fns'
import { startReminderService } from './reminder'
import { createTray } from './tray'
import './tools/task-tools'
import './tools/system-tools'
import './tools/interact-tools'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    icon: join(__dirname, '../../resources/app-icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => mainWindow!.show())

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:stateChanged', 'maximized')
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:stateChanged', 'unmaximized')
  })

  mainWindow.on('close', (e: Event) => {
    e.preventDefault()
    mainWindow!.hide()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function scheduleCompression(): void {
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  compressDate(yesterday).catch(() => {})

  setInterval(() => {
    const y = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    compressDate(y).catch(() => {})
  }, 3_600_000)
}

app.whenReady().then(() => {
  initDatabase()
  // Mark overdue pending tasks as expired (runs at startup + every 30s)
  const expireQuery = () => {
    try {
      const db = getDatabase()
      db.prepare("UPDATE tasks SET status='expired' WHERE status='pending' AND datetime(date || ' ' || start_time) < datetime('now')").run()
    } catch { /* db not ready yet */ }
  }
  expireQuery()
  setInterval(expireQuery, 30_000)
  // Apply open-at-login setting from DB
  app.setLoginItemSettings({ openAtLogin: getConfig('open_at_login') === 'true' })
  registerIpcHandlers()
  createWindow()
  createTray()
  startReminderService()
  scheduleCompression()
})

app.on('window-all-closed', () => {})
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
