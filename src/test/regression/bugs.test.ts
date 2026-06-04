/**
 * Regression tests for bugs fixed during development.
 * Each test repros a bug → verifies the fix.
 */
import { useChatStore } from '@/stores/chatStore'

beforeAll(() => {
  (window as any).api = { invoke: vi.fn(), on: vi.fn(() => vi.fn()) }
})

describe('Regression: Bug Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useChatStore.setState({
      messages: [{ role: 'assistant', content: '你好！' }],
      loading: false,
      pendingConfirm: null,
    })
  })

  describe('BUG-001: get() was undefined in chatStore (chat submit had no response)', () => {
    it('sendMessage successfully calls IPC with recent history', async () => {
      window.api.invoke.mockResolvedValue({ reply: 'ok', toolCalls: [], affectedTasks: [] })

      // This would crash if get() was undefined
      await expect(
        useChatStore.getState().sendMessage('测试消息')
      ).resolves.not.toThrow()

      expect(window.api.invoke).toHaveBeenCalledTimes(1)
    })
  })

  describe('BUG-002: Context pollution - orphan messages lost', () => {
    it('recent history is passed even when no task is created', async () => {
      // Simulate a multi-turn conversation where no task was created
      window.api.invoke.mockResolvedValue({ reply: '你想几点？', toolCalls: [], affectedTasks: [] })
      await useChatStore.getState().sendMessage('帮我添加任务')

      window.api.invoke.mockResolvedValue({ reply: '已添加', toolCalls: [], affectedTasks: ['t-new'] })
      await useChatStore.getState().sendMessage('晚上8点')

      // Second call should include first exchange in history
      const secondCall = window.api.invoke.mock.calls[1]
      const history = secondCall[3] as { role: string; content: string }[]
      const historyTexts = history.map((m) => m.content)
      expect(historyTexts.some((t) => t.includes('帮我添加任务'))).toBe(true)
      expect(historyTexts.some((t) => t.includes('你想几点？'))).toBe(true)
    })
  })

  describe('BUG-003: confirmAction showed raw task ID', () => {
    it('confirmAction uses displayLabel when provided', async () => {
      window.api.invoke.mockResolvedValue(undefined)
      await useChatStore.getState().confirmAction('t-001', '项目评审会: 09:00')

      const msg = useChatStore.getState().messages[1]
      expect(msg.content).toBe('[确认] 项目评审会: 09:00')
      expect(msg.content).not.toContain('t-001')
    })
  })

  describe('BUG-004: recentHistory leaked toolCalls over IPC', () => {
    it('recent history is stripped of toolCalls', async () => {
      // Add a message with toolCalls
      useChatStore.setState((s) => ({
        messages: [...s.messages, {
          role: 'assistant',
          content: 'reply',
          toolCalls: [{ name: 'add_task', arguments: {}, result: {}, success: true }],
        }],
      }))

      window.api.invoke.mockResolvedValue({ reply: 'ok', toolCalls: [], affectedTasks: [] })
      await useChatStore.getState().sendMessage('test')

      const args = window.api.invoke.mock.calls[0]
      const history = args[3] as Record<string, unknown>[]
      for (const m of history) {
        expect(m).not.toHaveProperty('toolCalls')
      }
    })
  })
})
