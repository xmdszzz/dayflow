import { useChatStore } from './chatStore'

// Mock Electron API
beforeAll(() => {
  (window as any).api = {
    invoke: vi.fn(),
    on: vi.fn(() => vi.fn()),
  }
})

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store between tests
    vi.clearAllMocks()
    useChatStore.setState({
      messages: [{ role: 'assistant', content: '你好！' }],
      loading: false,
      pendingConfirm: null,
    })
  })

  describe('sendMessage', () => {
    it('adds user message and sets loading', async () => {
      window.api.invoke.mockResolvedValue({ reply: '已添加任务', toolCalls: [], affectedTasks: [] })

      await useChatStore.getState().sendMessage('明天上午9点开会')

      const state = useChatStore.getState()
      expect(state.loading).toBe(false)
      expect(state.messages).toHaveLength(3) // initial + user + assistant
      expect(state.messages[1]).toMatchObject({ role: 'user', content: '明天上午9点开会' })
      expect(state.messages[2]).toMatchObject({ role: 'assistant', content: '已添加任务' })
    })

    it('calls IPC with recent history', async () => {
      window.api.invoke.mockResolvedValue({ reply: 'ok', toolCalls: [], affectedTasks: [] })

      await useChatStore.getState().sendMessage('test message')

      expect(window.api.invoke).toHaveBeenCalledWith(
        'chat:send',
        'test message',
        undefined,
        expect.any(Array), // recentHistory
      )

      // Verify recent history is passed (stripped of toolCalls)
      const args = window.api.invoke.mock.calls[0]
      const history = args[3] as { role: string; content: string }[]
      expect(history.length).toBeGreaterThanOrEqual(0)
      expect(history.every((m) => 'role' in m && 'content' in m)).toBe(true)
      // No toolCalls should leak
      expect(history.every((m) => !('toolCalls' in m))).toBe(true)
    })

    it('shows error message on failure', async () => {
      window.api.invoke.mockRejectedValue(new Error('Network error'))

      await useChatStore.getState().sendMessage('test')

      const state = useChatStore.getState()
      expect(state.messages[2].content).toContain('错误')
    })

    it('passes explicitTaskId through IPC', async () => {
      window.api.invoke.mockResolvedValue({ reply: 'ok', toolCalls: [], affectedTasks: [] })

      await useChatStore.getState().sendMessage('test', 't-001')

      expect(window.api.invoke).toHaveBeenCalledWith(
        'chat:send',
        'test',
        't-001',
        expect.any(Array),
      )
    })
  })

  describe('confirmAction', () => {
    it('adds confirmation message and clears pendingConfirm', async () => {
      useChatStore.setState({ pendingConfirm: { question: '确认?', options: [] } })
      window.api.invoke.mockResolvedValue(undefined)

      await useChatStore.getState().confirmAction('t-001', '项目评审会: 09:00')

      const state = useChatStore.getState()
      expect(state.messages[1].content).toContain('[确认] 项目评审会: 09:00')
      expect(state.pendingConfirm).toBeNull()
    })
  })

  describe('cancelAction', () => {
    it('adds cancel message and clears pendingConfirm', async () => {
      useChatStore.setState({ pendingConfirm: { question: '确认?', options: [] } })
      window.api.invoke.mockResolvedValue(undefined)

      await useChatStore.getState().cancelAction()

      const state = useChatStore.getState()
      expect(state.messages[1].content).toBe('[取消]')
      expect(state.pendingConfirm).toBeNull()
    })
  })
})
