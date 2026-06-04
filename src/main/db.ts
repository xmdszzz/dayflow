import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { v4 as uuid } from 'uuid'
import type { Task, TaskInput, ChatMessage, ChatMemory } from '../shared/types'

const nowISO = () => new Date().toISOString()

let db: Database.Database

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'dayflow.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations()
}

function runMigrations(): void {
  // Drop old tables for fresh schema (dev data only)
  db.exec(`
    DROP TABLE IF EXISTS chat_messages;
    DROP TABLE IF EXISTS chat_memory;
    DROP TABLE IF EXISTS tasks;
  `)

  db.exec(`
    CREATE TABLE tasks (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL,
      start_time  TEXT NOT NULL,
      end_time    TEXT NOT NULL,
      title       TEXT NOT NULL,
      notes       TEXT NOT NULL DEFAULT '',
      review      TEXT NOT NULL DEFAULT '',
      place       TEXT NOT NULL DEFAULT '',
      person      TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'pending',
      chat_count  INTEGER NOT NULL DEFAULT 0,
      notified    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id          TEXT PRIMARY KEY,
      task_id     TEXT NOT NULL,
      role        TEXT NOT NULL,
      content     TEXT NOT NULL,
      tool_calls  TEXT,
      created_at  TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS chat_memory (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL UNIQUE,
      summary     TEXT NOT NULL,
      task_count  INTEGER NOT NULL DEFAULT 0,
      keywords    TEXT,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_datetime ON tasks(date, start_time);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_task ON chat_messages(task_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
  `)

  const defaults: [string, string][] = [
    ['api_key', ''],
    ['reminder_minutes', '10'],
    ['open_at_login', 'false'],
    ['theme', 'dark'],
    ['day_start', '08:00'],
    ['day_end', '22:00'],
  ]
  const insert = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)')
  for (const [k, v] of defaults) insert.run(k, v)
}

export function createTask(input: TaskInput): Task {
  const now = nowISO()
  const task: Task = {
    id: uuid(), date: input.date, start_time: input.start_time, end_time: input.end_time,
    title: input.title, notes: input.notes || '', review: '', place: input.place || '', person: input.person || '',
    status: 'pending', chat_count: 0, notified: 0, created_at: now, updated_at: now,
  }
  db.prepare(`INSERT INTO tasks (id,date,start_time,end_time,title,notes,review,place,person,status,chat_count,notified,created_at,updated_at)
    VALUES (@id,@date,@start_time,@end_time,@title,@notes,@review,@place,@person,@status,@chat_count,@notified,@created_at,@updated_at)`).run(task)
  return task
}

export function cancelTask(id: string): Task | null {
  return updateTask(id, { status: 'cancelled' })
}

export function reactivateTask(id: string): Task | null {
  return updateTask(id, { status: 'pending', notified: 0 })
}

export function hardDeleteTask(id: string): boolean {
  db.prepare('DELETE FROM chat_messages WHERE task_id=?').run(id)
  const task = db.prepare('DELETE FROM tasks WHERE id=?').run(id)
  return task.changes > 0
}

const ALLOWED_KEYS = new Set(['date', 'start_time', 'end_time', 'title', 'notes', 'review', 'place', 'person', 'status'])

export function updateTask(id: string, patch: Partial<Pick<Task, 'date'|'time'|'place'|'person'|'event'|'status'>>): Task | null {
  const sets: string[] = []
  const vals: Record<string, unknown> = { id }
  for (const [k, v] of Object.entries(patch)) {
    if (!ALLOWED_KEYS.has(k)) continue
    if (v !== undefined) { sets.push(`${k}=@${k}`); vals[k] = v }
  }
  if (sets.length === 0) return getTask(id)
  sets.push('updated_at=@now')
  vals.now = nowISO()
  db.prepare(`UPDATE tasks SET ${sets.join(',')} WHERE id=@id`).run(vals)
  return getTask(id)
}

export function getTask(id: string): Task | null {
  return db.prepare('SELECT * FROM tasks WHERE id=?').get(id) as Task | null
}

export function listTasks(startDate: string, endDate: string): Task[] {
  return db.prepare('SELECT * FROM tasks WHERE date>=? AND date<=? ORDER BY date, start_time').all(startDate, endDate) as Task[]
}

export function getPendingTasks(): Task[] {
  return db.prepare("SELECT * FROM tasks WHERE status='pending' ORDER BY date, start_time").all() as Task[]
}

export function getTodayPendingTasks(): Task[] {
  // Use local date formatting, not UTC (toISOString is UTC, causes off-by-one near midnight)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return db.prepare("SELECT * FROM tasks WHERE status='pending' AND date=? ORDER BY start_time").all(today) as Task[]
}

export function getTasksDueIn(minutes: number): Task[] {
  return db.prepare(`
    SELECT * FROM tasks WHERE status='pending' AND notified=0
      AND datetime(date || ' ' || start_time) <= datetime('now', '+' || ? || ' minutes')
      AND datetime(date || ' ' || start_time) > datetime('now')
  `).all(minutes) as Task[]
}

export function getNextReminderTime(): Date | null {
  const row = db.prepare(`
    SELECT MIN(datetime(date || ' ' || start_time)) as dt FROM tasks
    WHERE status='pending' AND notified=0 AND datetime(date || ' ' || start_time) > datetime('now')
  `).get() as { dt: string | null }
  return row?.dt ? new Date(row.dt) : null
}

export function markNotified(id: string): void {
  db.prepare("UPDATE tasks SET notified=1 WHERE id=?").run(id)
}

export function addChatMessage(task_id: string, role: string, content: string, tool_calls?: string): ChatMessage {
  const msg: ChatMessage = {
    id: uuid(), task_id, role: role as ChatMessage['role'], content,
    tool_calls: tool_calls || null, created_at: new Date().toISOString(),
  }
  db.prepare('INSERT INTO chat_messages (id,task_id,role,content,tool_calls,created_at) VALUES (@id,@task_id,@role,@content,@tool_calls,@created_at)').run(msg)
  db.prepare('UPDATE tasks SET chat_count=chat_count+1 WHERE id=?').run(task_id)
  return msg
}

export function getActiveTaskMessages(limit: number): ChatMessage[] {
  return db.prepare(`
    SELECT cm.* FROM chat_messages cm JOIN tasks t ON cm.task_id=t.id
    WHERE t.status='pending' AND datetime(t.date || ' ' || t.start_time) > datetime('now')
    ORDER BY cm.created_at DESC LIMIT ?
  `).all(limit) as ChatMessage[]
}

export function getMessagesByTask(taskId: string): ChatMessage[] {
  return db.prepare('SELECT * FROM chat_messages WHERE task_id=? ORDER BY created_at').all(taskId) as ChatMessage[]
}

export function getMessagesForDate(date: string): ChatMessage[] {
  return db.prepare(`
    SELECT cm.* FROM chat_messages cm JOIN tasks t ON cm.task_id=t.id
    WHERE t.date=? ORDER BY cm.created_at
  `).all(date) as ChatMessage[]
}

export function getMemories(limit: number): ChatMemory[] {
  return db.prepare('SELECT * FROM chat_memory ORDER BY date DESC LIMIT ?').all(limit) as ChatMemory[]
}

export function saveMemory(memory: Omit<ChatMemory, 'id' | 'created_at'>): void {
  const existing = db.prepare('SELECT id FROM chat_memory WHERE date=?').get(memory.date) as { id: string } | undefined
  if (existing) {
    db.prepare('UPDATE chat_memory SET summary=?, task_count=?, keywords=?, created_at=? WHERE date=?')
      .run(memory.summary, memory.task_count, memory.keywords, nowISO(), memory.date)
  } else {
    db.prepare('INSERT INTO chat_memory (id,date,summary,task_count,keywords,created_at) VALUES (?,?,?,?,?,?)')
      .run(uuid(), memory.date, memory.summary, memory.task_count, memory.keywords, nowISO())
  }
}

export function getConfig(key: string): string {
  const row = db.prepare('SELECT value FROM config WHERE key=?').get(key) as { value: string } | undefined
  return row?.value ?? ''
}

export function setConfig(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value)
}

// ============ Conflict Detection ============
export interface ConflictInfo {
  id: string
  title: string
  start_time: string
  end_time: string
  overlap_minutes: number
}

export function getConflicts(date: string, start_time: string, end_time: string, excludeTaskId?: string): ConflictInfo[] {
  let sql = `
    SELECT id, title, start_time, end_time FROM tasks
    WHERE date=? AND status='pending'
      AND start_time < ? AND end_time > ?
  `
  const params: unknown[] = [date, end_time, start_time]
  if (excludeTaskId) {
    sql += ' AND id != ?'
    params.push(excludeTaskId)
  }
  const rows = db.prepare(sql).all(...params) as { id: string; title: string; start_time: string; end_time: string }[]
  // Compute overlap minutes
  const newStart = timeToMinutes(start_time)
  const newEnd = timeToMinutes(end_time)
  return rows.map((r) => {
    const existStart = timeToMinutes(r.start_time)
    const existEnd = timeToMinutes(r.end_time)
    const overlap = Math.max(0, Math.min(newEnd, existEnd) - Math.max(newStart, existStart))
    return { ...r, overlap_minutes: overlap }
  }).filter((c) => c.overlap_minutes > 0)
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// ============ Free Slot Detection ============
export interface FreeSlot {
  start: string
  end: string
  duration_minutes: number
}

export function getFreeSlots(date: string, dayStart?: string, dayEnd?: string): FreeSlot[] {
  const start = dayStart || getConfig('day_start') || '08:00'
  const end = dayEnd || getConfig('day_end') || '22:00'

  const tasks = db.prepare(`
    SELECT start_time, end_time FROM tasks
    WHERE date=? AND status='pending'
    ORDER BY start_time
  `).all(date) as { start_time: string; end_time: string }[]

  // Merge overlapping/adjacent intervals and compute gaps
  const slots: FreeSlot[] = []
  let cursor = start

  for (const t of tasks) {
    if (t.start_time > cursor) {
      slots.push({ start: cursor, end: t.start_time, duration_minutes: timeToMinutes(t.start_time) - timeToMinutes(cursor) })
    }
    if (t.end_time > cursor) {
      cursor = t.end_time > cursor ? t.end_time : cursor
    }
  }

  if (cursor < end) {
    slots.push({ start: cursor, end, duration_minutes: timeToMinutes(end) - timeToMinutes(cursor) })
  }

  return slots
}

export function getDatabase(): Database.Database { return db }
