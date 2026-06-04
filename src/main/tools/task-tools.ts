import { toolRegistry } from './registry'
import { createTask, updateTask, getDatabase } from '../db'
import type { TaskInput } from '../../shared/types'

toolRegistry.register({
  name: 'add_task',
  description: '创建一个新的日程任务',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: '日期 YYYY-MM-DD 绝对值' },
      time: { type: 'string', description: '时间 HH:mm 24小时制' },
      event: { type: 'string', description: '事件描述' },
      place: { type: 'string', description: '地点（可选）' },
      person: { type: 'string', description: '人物（可选）' },
    },
    required: ['date', 'time', 'event'],
  },
  async handler(args) {
    const task = createTask(args as unknown as TaskInput)
    return { success: true, data: { task_id: task.id, task } }
  },
})

toolRegistry.register({
  name: 'update_task',
  description: '修改已有任务。需提供 task_id 和要修改的字段',
  parameters: {
    type: 'object',
    properties: {
      task_id: { type: 'string', description: '任务 ID' },
      date: { type: 'string', description: '新日期 YYYY-MM-DD' },
      time: { type: 'string', description: '新时间 HH:mm' },
      place: { type: 'string', description: '新地点' },
      person: { type: 'string', description: '新人物' },
      event: { type: 'string', description: '新事件' },
    },
    required: ['task_id'],
  },
  async handler(args) {
    const { task_id, ...patch } = args as Record<string, unknown>
    const task = updateTask(task_id as string, patch)
    if (!task) return { success: false, data: null, error: 'Task not found' }
    return { success: true, data: { task_id, task } }
  },
})

toolRegistry.register({
  name: 'delete_task',
  description: '删除/取消一个任务',
  parameters: {
    type: 'object',
    properties: { task_id: { type: 'string', description: '任务 ID' } },
    required: ['task_id'],
  },
  requiresConfirmation: true,
  async handler(args) {
    const { task_id } = args as Record<string, string>
    const task = updateTask(task_id, { status: 'cancelled' })
    return { success: true, data: { task_id, task } }
  },
})

toolRegistry.register({
  name: 'query_tasks',
  description: '按条件查询日程列表',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: '查询特定日期 YYYY-MM-DD' },
      start_date: { type: 'string', description: '起始日期' },
      end_date: { type: 'string', description: '结束日期' },
      status: { type: 'string', enum: ['pending', 'done', 'cancelled'] },
    },
  },
  async handler(args) {
    const { date, start_date, end_date, status } = args as Record<string, string>
    const db = getDatabase()
    let sql = 'SELECT * FROM tasks WHERE 1=1'
    const params: unknown[] = []
    if (date) { sql += ' AND date=?'; params.push(date) }
    if (start_date && end_date) { sql += ' AND date>=? AND date<=?'; params.push(start_date, end_date) }
    if (status) { sql += ' AND status=?'; params.push(status) }
    sql += ' ORDER BY date, time'
    const tasks = db.prepare(sql).all(...params)
    return { success: true, data: { tasks, count: (tasks as unknown[]).length } }
  },
})

toolRegistry.register({
  name: 'complete_task',
  description: '标记任务为已完成',
  parameters: {
    type: 'object',
    properties: { task_id: { type: 'string', description: '任务 ID' } },
    required: ['task_id'],
  },
  async handler(args) {
    const { task_id } = args as Record<string, string>
    const task = updateTask(task_id, { status: 'done' })
    return { success: true, data: { task_id, task } }
  },
})
