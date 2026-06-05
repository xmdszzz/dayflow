import { create } from 'zustand'
import { useTaskStore } from '@/stores/taskStore'

export interface ToolCallEntry {
  name: string
  arguments: Record<string, unknown>
  result: unknown
  success: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallEntry[]
}

interface PendingConfirm { question: string; options: { label: string; task_id: string; summary: string }[] }

interface ChatState {
  messages: ChatMessage[]
  loading: boolean
  pendingConfirm: PendingConfirm | null
  sendMessage: (text: string, explicitTaskId?: string) => Promise<void>
  confirmAction: (choice: string) => Promise<void>
  cancelAction: () => Promise<void>
  setPendingConfirm: (p: PendingConfirm | null) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [{ role: 'assistant', content: '你好！我是日程助手。直接告诉我你的安排，比如"明天上午9点跟张总在办公室开项目评审会"。' }],
  loading: false,
  pendingConfirm: null,

  sendMessage: async (text: string, explicitTaskId?: string) => {
    // Capture recent message history BEFORE adding the new user message, so the LLM
    // gets the full conversation thread regardless of whether messages are linked to a task in DB
    // Strip toolCalls from recent history to keep IPC payload clean (role+content only)
    const recentHistory = get().messages.slice(-12).map(({ role, content }) => ({ role, content }))
    set((s) => ({ messages: [...s.messages, { role: 'user', content: text }], loading: true }))
    try {
      const result = await window.api.invoke('chat:send', text, explicitTaskId, recentHistory) as {
        reply: string
        toolCalls?: ToolCallEntry[]
        affectedTasks?: string[]
      }
      set((s) => ({
        messages: [...s.messages, {
          role: 'assistant',
          content: result.reply,
          toolCalls: result.toolCalls,
        }],
        loading: false,
      }))

      // Bug #2: Explicitly reload task store when tasks were created/modified via chat.
      // The calendar views' chatLen watcher may race (first reload fires before the
      // task exists in DB). This guaranteed reload ensures the new task appears.
      if (result.affectedTasks && result.affectedTasks.length > 0) {
        const now = new Date()
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        const endDate = new Date(Date.now() + 60 * 86400000)
        const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
        useTaskStore.getState().loadTasks(today, end)
      }
    } catch (e) {
      set((s) => ({ messages: [...s.messages, { role: 'assistant', content: `错误: ${String(e)}` }], loading: false }))
    }
  },

  confirmAction: async (choice: string, displayLabel?: string) => {
    // Show the user's confirmation choice as a readable message in the chat
    const display = displayLabel ? `[确认] ${displayLabel}` : `[确认] ${choice}`
    set((s) => ({ messages: [...s.messages, { role: 'user', content: display }] }))
    await window.api.invoke('chat:confirm', choice)
    set({ pendingConfirm: null })
  },
  cancelAction: async () => {
    set((s) => ({ messages: [...s.messages, { role: 'user', content: '[取消]' }] }))
    await window.api.invoke('chat:cancel')
    set({ pendingConfirm: null })
  },
  setPendingConfirm: (p) => set({ pendingConfirm: p }),
}))
