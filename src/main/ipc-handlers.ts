import { ipcMain } from 'electron'
import { createTask, updateTask, listTasks, getConfig, setConfig } from './db'
import type { TaskInput } from '../shared/types'

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

  ipcMain.handle('task:delete', (_e, id: string) => {
    return updateTask(id, { status: 'cancelled' })
  })

  ipcMain.handle('task:complete', (_e, id: string) => {
    return updateTask(id, { status: 'done' })
  })

  ipcMain.handle('config:get', (_e, key: string) => {
    return getConfig(key)
  })

  ipcMain.handle('config:set', (_e, key: string, value: string) => {
    return setConfig(key, value)
  })
}
