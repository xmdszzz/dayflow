import { create } from 'zustand'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

interface PendingConfirm { question: string; options: { label: string; task_id: string; summary: string }[] }

interface ChatState {
  messages: ChatMessage[]
  loading: boolean
  pendingConfirm: PendingConfirm | null
  sendMessage: (text: string) => Promise<void>
  confirmAction: (choice: string) => Promise<void>
  cancelAction: () => Promise<void>
  setPendingConfirm: (p: PendingConfirm | null) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [{ role: 'assistant', content: '你好！我是日程助手。直接告诉我你的安排，比如"明天上午9点跟张总在办公室开项目评审会"。' }],
  loading: false,
  pendingConfirm: null,

  sendMessage: async (text) => {
    set((s) => ({ messages: [...s.messages, { role: 'user', content: text }], loading: true }))
    try {
      const result = await window.api.invoke('chat:send', text) as { reply: string; toolResults: unknown[] }
      set((s) => ({ messages: [...s.messages, { role: 'assistant', content: result.reply }], loading: false }))
    } catch (e) {
      set((s) => ({ messages: [...s.messages, { role: 'assistant', content: `错误: ${String(e)}` }], loading: false }))
    }
  },

  confirmAction: async (choice) => {
    await window.api.invoke('chat:confirm', choice)
    set({ pendingConfirm: null })
  },
  cancelAction: async () => { await window.api.invoke('chat:cancel'); set({ pendingConfirm: null }) },
  setPendingConfirm: (p) => set({ pendingConfirm: p }),
}))
