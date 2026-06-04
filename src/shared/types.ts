// ============ 任务 ============
export type TaskStatus = 'pending' | 'done' | 'cancelled' | 'expired'

export interface Task {
  id: string
  date: string          // YYYY-MM-DD
  time: string          // HH:mm
  place: string
  person: string
  event: string
  status: TaskStatus
  chat_count: number
  notified: number       // 0 | 1
  created_at: string     // ISO 8601
  updated_at: string     // ISO 8601
}

export interface TaskInput {
  date: string
  time: string
  place?: string
  person?: string
  event: string
}

// ============ 聊天 ============
export interface ChatMessage {
  id: string
  task_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls: string | null   // JSON string of OpenAI tool_calls
  created_at: string
}

export interface ChatMemory {
  id: string
  date: string
  summary: string
  task_count: number
  keywords: string | null     // JSON string[]
  created_at: string
}

// ============ Tool ============
export interface ToolCall {
  id: string
  function: {
    name: string
    arguments: string         // JSON string
  }
}

export interface ToolResult {
  success: boolean
  data: unknown
  error?: string
}

// ============ Config ============
export interface AppConfig {
  api_key: string
  reminder_minutes: number
  open_at_login: boolean
  theme: 'dark' | 'light'
}

// ============ IPC 通道 ============
export const IPC_CHANNELS = {
  TASK_LIST: 'task:list',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_COMPLETE: 'task:complete',
  CHAT_SEND: 'chat:send',
  CHAT_CONFIRM: 'chat:confirm',
  CHAT_CANCEL: 'chat:cancel',
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  REMINDER_FIRE: 'reminder:on-fire',
  TOOL_CONFIRM: 'tool:confirm-required',
} as const
