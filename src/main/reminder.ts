import { Notification } from 'electron'
import { getTasksDueIn, markNotified, getNextReminderTime, getConfig } from './db'

let timer: ReturnType<typeof setInterval> | null = null

export function startReminderService(): void {
  schedule()
}

function schedule(): void {
  const interval = calcInterval()
  timer = setInterval(() => { checkAndNotify(); reschedule() }, interval)
}

function calcInterval(): number {
  const next = getNextReminderTime()
  if (!next) return 5 * 60 * 1000
  const diff = next.getTime() - Date.now()
  return Math.max(1000, Math.min(diff, 30000))
}

function reschedule(): void {
  if (timer) clearInterval(timer)
  schedule()
}

function checkAndNotify(): void {
  const minutes = parseInt(getConfig('reminder_minutes'), 10) || 10
  const tasks = getTasksDueIn(minutes)
  for (const task of tasks) {
    new Notification({
      title: `⏰ ${minutes}分钟后 · ${task.event}`,
      body: `📍 ${task.place || '—'}  👤 ${task.person || '—'}\n🕐 ${task.date} ${task.time}`,
      silent: false,
    }).on('click', () => {
      const { BrowserWindow } = require('electron')
      const win = BrowserWindow.getAllWindows()[0]
      if (win) { win.show(); win.focus(); win.webContents.send('reminder:on-fire', task.id) }
    })
    markNotified(task.id)
  }
}
