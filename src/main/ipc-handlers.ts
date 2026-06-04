import { ipcMain, BrowserWindow, app } from 'electron'
import { createTask, updateTask, listTasks, getConfig, setConfig, hardDeleteTask, cancelTask, reactivateTask } from './db'
import type { TaskInput } from '../shared/types'
import { sendChatMessage } from './llm'
import { resolveConfirmation, cancelConfirmation } from './tools/interact-tools'
import { compressToday } from './compressor'

export function registerIpcHandlers(): void {
  ipcMain.handle('task:list', (_e, startDate: string, endDate: string) => {
    return listTasks(startDate, endDate)
  })

  ipcMain.handle('task:create', (_e, input: TaskInput) => {
    return createTask(input)
  })

  ipcMain.handle('task:update', (_e, id: string, patch: Record<string, unknown>) => {
    return updateTask(id, patch)
  })

  ipcMain.handle('task:cancel', (_e, id: string) => {
    const result = cancelTask(id)
    compressToday()
    return result
  })

  ipcMain.handle('task:reactivate', (_e, id: string) => {
    return reactivateTask(id)
  })

  ipcMain.handle('task:delete', (_e, id: string) => {
    return hardDeleteTask(id)
  })

  ipcMain.handle('task:complete', (_e, id: string) => {
    const result = updateTask(id, { status: 'done' })
    compressToday()
    return result
  })

  ipcMain.handle('config:get', (_e, key: string) => {
    return getConfig(key)
  })

  ipcMain.handle('config:set', (_e, key: string, value: string) => {
    setConfig(key, value)
    if (key === 'open_at_login') {
      app.setLoginItemSettings({ openAtLogin: value === 'true' })
    }
  })

  ipcMain.handle('chat:send', async (_e, userMessage: string, explicitTaskId?: string, recentMessages?: { role: string; content: string }[]) => {
    return sendChatMessage(userMessage, explicitTaskId, recentMessages)
  })

  ipcMain.handle('chat:confirm', (_e, choice: string) => {
    resolveConfirmation(choice)
  })

  ipcMain.handle('chat:cancel', () => {
    cancelConfirmation()
  })

  ipcMain.handle('open-settings', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) win.webContents.send('open-settings')
  })

  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.minimize()
  })

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
    }
  })

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.close()
  })

  ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win?.isMaximized() ?? false
  })

  // Window resize — renderer manages lifecycle (mousedown/move/up), main applies bounds
  let resizeInterval: ReturnType<typeof setInterval> | null = null

  ipcMain.handle('window:startResize', (event, edge: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isMaximized()) return

    const screen = require('electron').screen
    const startBounds = win.getBounds()
    const startCursor = screen.getCursorScreenPoint()

    if (resizeInterval) clearInterval(resizeInterval)

    resizeInterval = setInterval(() => {
      const current = screen.getCursorScreenPoint()
      const dx = current.x - startCursor.x
      const dy = current.y - startCursor.y
      let { x, y, width, height } = startBounds

      if (edge.includes('right'))  width  = Math.max(900, startBounds.width + dx)
      if (edge.includes('left'))   { width = Math.max(900, startBounds.width - dx); x = startBounds.x + dx }
      if (edge.includes('bottom')) height = Math.max(600, startBounds.height + dy)

      win.setBounds({ x, y, width, height })
    }, 16)
  })

  ipcMain.handle('window:stopResize', () => {
    if (resizeInterval) { clearInterval(resizeInterval); resizeInterval = null }
  })
}
