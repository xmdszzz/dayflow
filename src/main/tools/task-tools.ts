import { toolRegistry } from './registry'
import { createTask, updateTask, getDatabase, getConflicts, hardDeleteTask, cancelTask } from '../db'
import { compressToday } from '../compressor'
import type { TaskInput } from '../../shared/types'

toolRegistry.register({
  name: 'add_task',
  description: '创建一个新的日程任务。所有非结构化细节（备注、背景、准备事项）自动提取到 notes 字段。',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: '日期 YYYY-MM-DD 绝对值' },
      start_time: { type: 'string', description: '开始时间 HH:mm 24小时制' },
      end_time: { type: 'string', description: '结束时间 HH:mm 24小时制' },
      title: { type: 'string', description: '任务简短标题（~50字）' },
      notes: { type: 'string', description: '备注/详情/背景（可选，自动提取用户输入中的非结构化信息）' },
      place: { type: 'string', description: '地点（可选）' },
      person: { type: 'string', description: '人物（可选）' },
    },
    required: ['date', 'start_time', 'end_time', 'title'],
  },
  async handler(args) {
    const task = createTask(args as unknown as TaskInput)
    const conflicts = getConflicts(task.date, task.start_time, task.end_time)
    return {
      success: true,
      data: {
        task_id: task.id,
        task,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      },
    }
  },
})

toolRegistry.register({
  name: 'update_task',
  description: '修改已有任务任意字段。需提供 task_id。修改后自动检测新时间段的冲突。',
  parameters: {
    type: 'object',
    properties: {
      task_id: { type: 'string', description: '任务 ID' },
      date: { type: 'string', description: '新日期 YYYY-MM-DD' },
      start_time: { type: 'string', description: '新开始时间 HH:mm' },
      end_time: { type: 'string', description: '新结束时间 HH:mm' },
      title: { type: 'string', description: '新标题' },
      notes: { type: 'string', description: '新备注' },
      place: { type: 'string', description: '新地点' },
      person: { type: 'string', description: '新人物' },
    },
    required: ['task_id'],
  },
  async handler(args) {
    const { task_id, ...patch } = args as Record<string, unknown>
    const task = updateTask(task_id as string, patch)
    if (!task) return { success: false, data: null, error: 'Task not found' }

    // Detect conflicts if time fields changed
    const newStart = (patch.start_time as string) || task.start_time
    const newEnd = (patch.end_time as string) || task.end_time
    const newDate = (patch.date as string) || task.date
    const conflicts = getConflicts(newDate, newStart, newEnd, task.id)

    return {
      success: true,
      data: {
        task_id: task.id,
        task,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      },
    }
  },
})

toolRegistry.register({
  name: 'cancel_task',
  description: '取消一个任务（保留记录，状态变为已取消）。不删除数据，任务仍可在日历中查看。需用户确认。',
  parameters: {
    type: 'object',
    properties: { task_id: { type: 'string', description: '任务 ID' } },
    required: ['task_id'],
  },
  requiresConfirmation: true,
  async handler(args) {
    const { task_id } = args as Record<string, string>
    const task = cancelTask(task_id)
    compressToday()
    return { success: true, data: { task_id, task } }
  },
})

toolRegistry.register({
  name: 'delete_task',
  description: '永久删除一个任务及其所有聊天记录。数据不可恢复。需用户确认。',
  parameters: {
    type: 'object',
    properties: { task_id: { type: 'string', description: '任务 ID' } },
    required: ['task_id'],
  },
  requiresConfirmation: true,
  async handler(args) {
    const { task_id } = args as Record<string, string>
    hardDeleteTask(task_id)
    compressToday()
    return { success: true, data: { task_id } }
  },
})

toolRegistry.register({
  name: 'query_tasks',
  description: '按条件查询日程列表。返回任务的完整信息含时间、地点、人物、备注。默认只查待办任务。用 include_completed=true 查已完成/已取消的任务（用于复盘、总结等场景）。',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: '查询特定日期 YYYY-MM-DD' },
      start_date: { type: 'string', description: '起始日期' },
      end_date: { type: 'string', description: '结束日期' },
      status: { type: 'string', enum: ['pending', 'done', 'cancelled'], description: '按状态精确过滤' },
      include_completed: { type: 'boolean', description: '同时包含已完成和已取消的任务（默认 false，只查待办）' },
    },
  },
  async handler(args) {
    const { date, start_date, end_date, status, include_completed } = args as Record<string, unknown>
    const db = getDatabase()
    let sql = 'SELECT * FROM tasks WHERE 1=1'
    const params: unknown[] = []

    if (status) {
      sql += ' AND status=?'
      params.push(status)
    } else if (!include_completed) {
      sql += " AND status='pending'"
    }
    // include_completed=true with no status filter → returns all non-expired

    if (date) { sql += ' AND date=?'; params.push(date) }
    if (start_date && end_date) { sql += ' AND date>=? AND date<=?'; params.push(start_date, end_date) }
    sql += ' ORDER BY date, start_time'
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
    compressToday()
    return { success: true, data: { task_id, task } }
  },
})

toolRegistry.register({
  name: 'write_review',
  description: '为已完成的任务写入复盘总结。将用户的原始复盘内容美化为简洁、可读性高的总结。只在用户明确要求复盘或总结已完成任务时使用。',
  parameters: {
    type: 'object',
    properties: {
      task_id: { type: 'string', description: '任务 ID' },
      content: { type: 'string', description: '美化后的复盘内容。提炼用户原始输入，修正语法，保留关键细节和要点，去除冗余。格式：简洁段落，2-5句话。' },
    },
    required: ['task_id', 'content'],
  },
  async handler(args) {
    const { task_id, content } = args as Record<string, string>
    const task = updateTask(task_id, { review: content })
    if (!task) return { success: false, data: null, error: 'Task not found' }
    return { success: true, data: { task_id, review: content } }
  },
})
