import { create } from 'zustand'
import type { Task, TaskInput, TaskStatus } from '../../shared/types'

// Version counter to prevent stale loadTasks responses from overwriting newer data.
// Bug #2: When chatLen changes twice rapidly (user msg → assistant reply with tool calls),
// the first loadTasks fires before the task is created. If its IPC returns after the second
// loadTasks, the stale response would overwrite the correct task list — a TOCTOU bug.
let loadVersion = 0

interface TaskState {
  tasks: Task[]
  selectedDate: string | null
  loading: boolean
  loadTasks: (start: string, end: string) => Promise<void>
  addTask: (input: TaskInput) => Promise<Task>
  updateTask: (id: string, patch: Partial<Pick<Task, 'date'|'start_time'|'end_time'|'title'|'notes'|'place'|'person'|'status'>>) => Promise<void>
  cancelTask: (id: string) => Promise<void>
  reactivateTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<void>
  selectDate: (date: string) => void
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  selectedDate: null,
  loading: false,
  loadTasks: async (start, end) => {
    const version = ++loadVersion
    set({ loading: true })
    const tasks = await window.api.invoke('task:list', start, end) as Task[]
    // Discard stale responses — a newer loadTasks call is already in flight
    if (version !== loadVersion) return
    set({ tasks, loading: false })
  },
  addTask: async (input) => {
    const task = await window.api.invoke('task:create', input) as Task
    set((s) => ({ tasks: [...s.tasks, task] }))
    return task
  },
  updateTask: async (id, patch) => {
    await window.api.invoke('task:update', id, patch)
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...patch } : t) }))
  },
  cancelTask: async (id) => {
    await window.api.invoke('task:cancel', id)
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, status: 'cancelled' as const } : t) }))
  },
  reactivateTask: async (id) => {
    await window.api.invoke('task:reactivate', id)
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, status: 'pending' as const } : t) }))
  },
  deleteTask: async (id) => {
    await window.api.invoke('task:delete', id)
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },
  completeTask: async (id) => {
    await window.api.invoke('task:complete', id)
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, status: 'done' as TaskStatus } : t) }))
  },
  selectDate: (date) => set({ selectedDate: date }),
}))
