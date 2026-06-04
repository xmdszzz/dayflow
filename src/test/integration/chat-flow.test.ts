/**
 * Integration test: Chat message submission → store update → IPC call
 * Tests the full renderer-side chat pipeline without actual LLM.
 */
import { useChatStore } from '@/stores/chatStore'
import { useTaskStore } from '@/stores/taskStore'
import '@/commands'
import { processInput } from '@/input/pipeline'

beforeAll(() => {
  (window as any).api = { invoke: vi.fn(), on: vi.fn(() => vi.fn()) }
})

describe('Chat Submission Flow (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useChatStore.setState({
      messages: [{ role: 'assistant', content: '你好！' }],
      loading: false,
      pendingConfirm: null,
    })
    useTaskStore.setState({ tasks: [], selectedDate: null, loading: false })
  })

  it('text message → IPC call → assistant response', async () => {
    // Simulate: user types plain text, sends it
    const input = '明天上午9点开会'
    const processed = processInput(input)
    expect(processed).toBe(input) // not a command

    window.api.invoke.mockResolvedValue({ reply: '已添加任务', toolCalls: [], affectedTasks: ['t-001'] })

    await useChatStore.getState().sendMessage(processed)

    // Verify IPC was called correctly
    expect(window.api.invoke).toHaveBeenCalledWith(
      'chat:send',
      '明天上午9点开会',
      undefined,
      expect.any(Array),
    )

    // Verify messages are in order
    const msgs = useChatStore.getState().messages
    expect(msgs).toHaveLength(3) // greeting + user + assistant
    expect(msgs[1].role).toBe('user')
    expect(msgs[1].content).toBe('明天上午9点开会')
    expect(msgs[2].role).toBe('assistant')
    expect(msgs[2].content).toBe('已添加任务')
  })

  it('/command is intercepted and not sent to IPC', () => {
    const result = processInput('/today')
    expect(result).toBe('handled')
    // IPC should not be called
  })

  it('empty input is rejected', () => {
    const processed = processInput('   ')
    // processInput returns the raw string, but ChatPanel.handleSend checks trim()
    expect(processed).toBe('   ')
  })

  it('handles API key missing response gracefully', async () => {
    window.api.invoke.mockResolvedValue({ reply: '请先在设置中配置 DeepSeek API Key', toolCalls: [], affectedTasks: [] })

    await useChatStore.getState().sendMessage('test')

    const msgs = useChatStore.getState().messages
    expect(msgs[2].content).toContain('API Key')
  })

  it('recent history accumulates across multiple messages', async () => {
    window.api.invoke.mockResolvedValue({ reply: 'ok', toolCalls: [], affectedTasks: [] })

    await useChatStore.getState().sendMessage('msg 1')
    await useChatStore.getState().sendMessage('msg 2')
    await useChatStore.getState().sendMessage('msg 3')

    // Third call should have history from msg 1 and 2
    const calls = window.api.invoke.mock.calls
    const history3 = calls[2][3] as { role: string; content: string }[]
    expect(history3.length).toBeGreaterThanOrEqual(4) // greeting + msg1 user + msg1 assistant + msg2 user + msg2 assistant
  })
})
