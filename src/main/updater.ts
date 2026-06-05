import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

// ── Types ──────────────────────────────────────────────────────────
export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  error?: string
}

let mainWindow: BrowserWindow | null = null
let currentStatus: UpdateStatus = { state: 'idle' }

// ── Send status to renderer ────────────────────────────────────────
function sendStatus(status: UpdateStatus): void {
  currentStatus = status
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', status)
  }
}

// ── Setup ──────────────────────────────────────────────────────────
export function initUpdater(win: BrowserWindow): void {
  mainWindow = win

  // Don't auto-download — let user decide
  autoUpdater.autoDownload = false
  autoUpdater.allowDowngrade = false

  autoUpdater.on('checking-for-update', () => {
    sendStatus({ state: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    sendStatus({ state: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    sendStatus({ state: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendStatus({ state: 'downloading', percent: Math.round(progress.percent), version: currentStatus.version })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus({ state: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    sendStatus({ state: 'error', error: err.message })
  })

  // When the renderer finishes loading, re-send last status so it syncs
  mainWindow.webContents.on('did-finish-load', () => {
    sendStatus(currentStatus)
  })
}

// ── Public API (called via IPC) ─────────────────────────────────────
export async function checkForUpdates(): Promise<UpdateStatus> {
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    sendStatus({ state: 'error', error: (err as Error).message })
  }
  return currentStatus
}

export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate()
  } catch (err) {
    sendStatus({ state: 'error', error: (err as Error).message })
  }
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall(false, true)
}
