import type { Task, TaskInput } from '../../shared/types'

export function createTaskInput(overrides?: Partial<TaskInput>): TaskInput {
  return {
    date: '2026-06-04',
    start_time: '09:00',
    end_time: '10:00',
    title: '测试任务',
    notes: '',
    place: '',
    person: '',
    ...overrides,
  }
}

export function createTask(overrides?: Partial<Task>): Task {
  return {
    id: 't-001',
    date: '2026-06-04',
    start_time: '09:00',
    end_time: '10:00',
    title: '测试任务',
    notes: '',
    place: '',
    person: '',
    status: 'pending',
    chat_count: 0,
    notified: 0,
    created_at: '2026-06-04T00:00:00.000Z',
    updated_at: '2026-06-04T00:00:00.000Z',
    ...overrides,
  }
}
