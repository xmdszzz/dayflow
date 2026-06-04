import { addDays, addWeeks, addMonths, nextDay, format as fmtDate } from 'date-fns'
import { toolRegistry } from './registry'
import { getFreeSlots } from '../db'

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6

toolRegistry.register({
  name: 'get_now',
  description: '获取当前日期时间。作为所有日期计算的基准。',
  parameters: { type: 'object', properties: {} },
  async handler() {
    const now = new Date()
    return {
      success: true,
      data: {
        datetime: now.toISOString(),
        date: fmtDate(now, 'yyyy-MM-dd'),
        time: fmtDate(now, 'HH:mm'),
        weekday: '周' + ['日','一','二','三','四','五','六'][now.getDay()],
      },
    }
  },
})

// Chinese date expression parser
const WEEKDAY_MAP: Record<string, number> = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':0,'天':0 }

function resolveExpr(expr: string, ref: Date): string {
  const p: [RegExp, () => string][] = [
    [/^今天$/,   () => fmtDate(ref, 'yyyy-MM-dd')],
    [/^明天$/,   () => fmtDate(addDays(ref, 1), 'yyyy-MM-dd')],
    [/^后天$/,   () => fmtDate(addDays(ref, 2), 'yyyy-MM-dd')],
    [/^大后天$/, () => fmtDate(addDays(ref, 3), 'yyyy-MM-dd')],
    [/^昨天$/,   () => fmtDate(addDays(ref, -1), 'yyyy-MM-dd')],
    [/^前天$/,   () => fmtDate(addDays(ref, -2), 'yyyy-MM-dd')],
  ]
  for (const [re, fn] of p) { if (re.test(expr)) return fn() }

  const weekMatch = expr.match(/^(上|下)?周([一二三四五六日天])$/)
  if (weekMatch) {
    const offset = weekMatch[1] === '上' ? -1 : weekMatch[1] === '下' ? 1 : 0
    const target = WEEKDAY_MAP[weekMatch[2]] ?? 0
    const d = addWeeks(nextDay(ref, target as Day), offset)
    return fmtDate(d, 'yyyy-MM-dd')
  }

  const monthMatch = expr.match(/^(上|下)?个?月(\d{1,2})?号?$/)
  if (monthMatch) {
    const offset = monthMatch[1] === '上' ? -1 : monthMatch[1] === '下' ? 1 : 0
    const day = monthMatch[2] ? parseInt(monthMatch[2], 10) : parseInt(fmtDate(ref, 'd'), 10)
    const d = addMonths(ref, offset)
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
    return fmtDate(d, 'yyyy-MM-dd')
  }

  throw new Error(`Cannot resolve date expression: ${expr}`)
}

toolRegistry.register({
  name: 'resolve_date',
  description: '将中文相对日期表达解析为绝对日期 YYYY-MM-DD。支持：今天/明天/后天/大后天/昨天/前天/下周三/上周五/下个月5号等。严禁自行计算日期，必须调用此工具。',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: '中文相对日期表达，如"明天""下周三"' },
      reference_date: { type: 'string', description: '基准日期 YYYY-MM-DD，默认今天' },
    },
    required: ['expression'],
  },
  async handler(args) {
    const { expression, reference_date } = args as Record<string, string>
    const ref = reference_date ? new Date(reference_date) : new Date()
    try {
      const date = resolveExpr(expression, ref)
      return { success: true, data: { date, expression } }
    } catch {
      return { success: false, data: null, error: `Cannot resolve: ${expression}` }
    }
  },
})

toolRegistry.register({
  name: 'find_free_slots',
  description: '查找指定日期的空闲时间段。用于帮助用户在已有日程之间插入新任务。返回按时间排序的空闲时段列表。',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: '查询日期 YYYY-MM-DD' },
      min_duration: { type: 'number', description: '最小时长（分钟），用于过滤过短的时段' },
    },
    required: ['date'],
  },
  async handler(args) {
    const { date, min_duration } = args as Record<string, unknown>
    const slots = getFreeSlots(date as string)
    const filtered = typeof min_duration === 'number'
      ? slots.filter((s) => s.duration_minutes >= (min_duration as number))
      : slots
    return { success: true, data: { date, slots: filtered } }
  },
})
