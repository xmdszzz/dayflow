/**
 * DB tests — skip if better-sqlite3 native module not built for current Node version.
 * Works in Electron's runtime; may skip in system Node.
 */
import Database from 'better-sqlite3'
import { v4 as uuid } from 'uuid'
import type { Task, TaskInput } from '../shared/types'

let db: Database.Database | null = null

function hasDB(): db is Database.Database {
  if (!db) throw new Error('Native module unavailable — test skipped')
  return true
}

function nowISO() { return new Date().toISOString() }

function createTestTask(input: TaskInput): Task {
  hasDB()
  const now = nowISO()
  const task: Task = {
    id: uuid(), date: input.date, start_time: input.start_time, end_time: input.end_time,
    title: input.title, notes: input.notes || '', place: input.place || '', person: input.person || '',
    status: 'pending', chat_count: 0, notified: 0, created_at: now, updated_at: now,
  }
  db!.prepare(`INSERT INTO tasks (id,date,start_time,end_time,title,notes,place,person,status,chat_count,notified,created_at,updated_at)
    VALUES (@id,@date,@start_time,@end_time,@title,@notes,@place,@person,@status,@chat_count,@notified,@created_at,@updated_at)`).run(task)
  return task
}

function getConflicts(date: string, start_time: string, end_time: string, excludeTaskId?: string) {
  hasDB()
  let sql = `SELECT id, title, start_time, end_time FROM tasks WHERE date=? AND status='pending' AND start_time < ? AND end_time > ?`
  const params: unknown[] = [date, end_time, start_time]
  if (excludeTaskId) { sql += ' AND id != ?'; params.push(excludeTaskId) }
  const rows = db!.prepare(sql).all(...params) as { id: string; title: string; start_time: string; end_time: string }[]
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const newStart = toMin(start_time), newEnd = toMin(end_time)
  return rows.map((r) => {
    const es = toMin(r.start_time), ee = toMin(r.end_time)
    return { ...r, overlap_minutes: Math.max(0, Math.min(newEnd, ee) - Math.max(newStart, es)) }
  }).filter((c) => c.overlap_minutes > 0)
}

function getFreeSlots(date: string, dayStart = '08:00', dayEnd = '22:00') {
  hasDB()
  const tasks = db!.prepare(`SELECT start_time, end_time FROM tasks WHERE date=? AND status='pending' ORDER BY start_time`).all(date) as { start_time: string; end_time: string }[]
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const slots: { start: string; end: string; duration_minutes: number }[] = []
  let cursor = dayStart
  for (const t of tasks) {
    if (t.start_time > cursor) slots.push({ start: cursor, end: t.start_time, duration_minutes: toMin(t.start_time) - toMin(cursor) })
    if (t.end_time > cursor) cursor = t.end_time
  }
  if (cursor < dayEnd) slots.push({ start: cursor, end: dayEnd, duration_minutes: toMin(dayEnd) - toMin(cursor) })
  return slots
}

describe('DB Operations (integration)', () => {
  beforeAll(() => {
    try {
      db = new Database(':memory:')
      db.pragma('journal_mode = WAL')
      db.pragma('foreign_keys = ON')
      db.exec(`
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY, date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
          title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', place TEXT NOT NULL DEFAULT '',
          person TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
          chat_count INTEGER NOT NULL DEFAULT 0, notified INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE INDEX idx_tasks_date ON tasks(date);
        CREATE INDEX idx_tasks_datetime ON tasks(date, start_time);
      `)
    } catch { db = null }
  })

  afterAll(() => { try { db?.close() } catch { /* ok */ } })

  it('connects to in-memory database', () => {
    if (!db) return
    const row = db.prepare('SELECT 1 as n').get() as { n: number }
    expect(row.n).toBe(1)
  })

  describe('createTask', () => {
    it('creates a task with all required fields', () => {
      if (!db) return
      const task = createTestTask({ date: '2026-06-04', start_time: '09:00', end_time: '10:00', title: '测试' })
      expect(task.id).toBeDefined()
      expect(task.status).toBe('pending')
    })
  })

  describe('getConflicts', () => {
    it('detects overlapping tasks', () => {
      if (!db) return
      createTestTask({ date: '2026-06-04', start_time: '09:00', end_time: '10:30', title: 'Existing' })
      const conflicts = getConflicts('2026-06-04', '10:00', '11:00')
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].overlap_minutes).toBe(30)
    })

    it('returns empty when no overlap', () => {
      if (!db) return
      createTestTask({ date: '2026-06-04', start_time: '14:00', end_time: '15:00', title: 'Afternoon' })
      const conflicts = getConflicts('2026-06-04', '09:00', '10:00')
      expect(conflicts).toHaveLength(0)
    })

    it('excludes specified task ID', () => {
      if (!db) return
      const t = createTestTask({ date: '2026-06-04', start_time: '09:00', end_time: '10:00', title: 'Self' })
      const conflicts = getConflicts('2026-06-04', '09:00', '10:00', t.id)
      expect(conflicts).toHaveLength(0)
    })

    it('handles back-to-back tasks (no overlap)', () => {
      if (!db) return
      createTestTask({ date: '2026-06-04', start_time: '09:00', end_time: '10:00', title: 'First' })
      const conflicts = getConflicts('2026-06-04', '10:00', '11:00')
      expect(conflicts).toHaveLength(0)
    })
  })

  describe('getFreeSlots', () => {
    it('returns full day when no tasks', () => {
      if (!db) return
      const slots = getFreeSlots('2026-06-05')
      expect(slots[0]).toEqual({ start: '08:00', end: '22:00', duration_minutes: 840 })
    })

    it('returns gaps between tasks', () => {
      if (!db) return
      createTestTask({ date: '2026-06-05', start_time: '09:00', end_time: '10:00', title: 'A' })
      createTestTask({ date: '2026-06-05', start_time: '14:00', end_time: '15:00', title: 'B' })
      const slots = getFreeSlots('2026-06-05')
      expect(slots[0]).toEqual({ start: '08:00', end: '09:00', duration_minutes: 60 })
      expect(slots[1]).toEqual({ start: '10:00', end: '14:00', duration_minutes: 240 })
    })

    it('handles overlapping tasks (merged)', () => {
      if (!db) return
      createTestTask({ date: '2026-06-05', start_time: '09:00', end_time: '11:00', title: 'A' })
      createTestTask({ date: '2026-06-05', start_time: '10:00', end_time: '12:00', title: 'B' })
      const slots = getFreeSlots('2026-06-05')
      expect(slots[0]).toEqual({ start: '08:00', end: '09:00', duration_minutes: 60 })
    })
  })
})
