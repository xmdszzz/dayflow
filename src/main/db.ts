import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { v4 as uuid } from 'uuid'
import type { Task, TaskInput, ChatMessage, ChatMemory } from '../shared/types'

let db: Database.Database

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'copy2list.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations()
}

function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL,
      time        TEXT NOT NULL,
      place       TEXT NOT NULL DEFAULT '',
      person      TEXT NOT NULL DEFAULT '',
      event       TEXT NOT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_tasks_datetime ON tasks(date, time);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_task ON chat_messages(task_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
  `)

  const defaults: [string, string][] = [
    ['api_key', ''],
    ['reminder_minutes', '10'],
    ['open_at_login', 'false'],
    ['theme', 'dark'],
  ]
  const insert = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)')
  for (const [k, v] of defaults) insert.run(k, v)
}

export function createTask(input: TaskInput): Task {
  const now = new Date().toISOString()
  const task: Task = {
    id: uuid(), date: input.date, time: input.time,
    place: input.place || '', person: input.person || '', event: input.event,
    status: 'pending', chat_count: 0, notified: 0, created_at: now, updated_at: now,
  }
  db.prepare(`INSERT INTO tasks (id,date,time,place,person,event,status,chat_count,notified,created_at,updated_at)
    VALUES (@id,@date,@time,@place,@person,@event,@status,@chat_count,@notified,@created_at,@updated_at)`).run(task)
  return task
}

export function updateTask(id: string, patch: Partial<Pick<Task, 'date'|'time'|'place'|'person'|'event'|'status'>>): Task | null {
  const sets: string[] = []
  const vals: Record<string, unknown> = { id }
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) { sets.push(`${k}=@${k}`); vals[k] = v }
  }
  if (sets.length === 0) return getTask(id)
  sets.push('updated_at=@now')
  vals.now = new Date().toISOString()
  db.prepare(`UPDATE tasks SET ${sets.join(',')} WHERE id=@id`).run(vals)
  return getTask(id)
}

export function getTask(id: string): Task | null {
  return db.prepare('SELECT * FROM tasks WHERE id=?').get(id) as Task | null
}

export function listTasks(startDate: string, endDate: string): Task[] {
  return db.prepare('SELECT * FROM tasks WHERE date>=? AND date<=? ORDER BY date, time').all(startDate, endDate) as Task[]
}

export function getPendingTasks(): Task[] {
  return db.prepare("SELECT * FROM tasks WHERE status='pending' ORDER BY date, time").all() as Task[]
}

export function getTasksDueIn(minutes: number): Task[] {
  return db.prepare(`
    SELECT * FROM tasks WHERE status='pending' AND notified=0
      AND datetime(date || ' ' || time) <= datetime('now', '+' || ? || ' minutes')
      AND datetime(date || ' ' || time) > datetime('now')
  `).all(minutes) as Task[]
}

export function getNextReminderTime(): Date | null {
  const row = db.prepare(`
    SELECT MIN(datetime(date || ' ' || time)) as dt FROM tasks
    WHERE status='pending' AND notified=0 AND datetime(date || ' ' || time) > datetime('now')
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
    WHERE t.status='pending' AND datetime(t.date || ' ' || t.time) > datetime('now')
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

export function getMemories(days: number): ChatMemory[] {
  return db.prepare('SELECT * FROM chat_memory ORDER BY date DESC LIMIT ?').all(days) as ChatMemory[]
}

export function saveMemory(memory: Omit<ChatMemory, 'id' | 'created_at'>): void {
  const id = uuid()
  const now = new Date().toISOString()
  db.prepare('INSERT OR REPLACE INTO chat_memory (id,date,summary,task_count,keywords,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, memory.date, memory.summary, memory.task_count, memory.keywords, now)
}

export function getConfig(key: string): string {
  const row = db.prepare('SELECT value FROM config WHERE key=?').get(key) as { value: string } | undefined
  return row?.value ?? ''
}

export function setConfig(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value)
}

export function getDatabase(): Database.Database { return db }
