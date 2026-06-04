import { commandRegistry } from './registry'
import type { CommandContext } from './types'

describe('CommandRegistry', () => {
  const mockCtx = {
    viewStore: { setView: vi.fn(), currentDate: new Date() },
    taskStore: { loadTasks: vi.fn(), tasks: [] },
    chatStore: { sendMessage: vi.fn(), messages: [], loading: false },
  } as unknown as CommandContext

  it('matches /today command', () => {
    commandRegistry.register({ name: 'today', aliases: ['td'], description: '今日', handler: vi.fn() })
    const match = commandRegistry.match('/today')
    expect(match).not.toBeNull()
    expect(match!.command.name).toBe('today')
    expect(match!.args).toBe('')
  })

  it('matches command with alias', () => {
    const match = commandRegistry.match('/td')
    expect(match).not.toBeNull()
    expect(match!.command.name).toBe('today')
  })

  it('matches command with arguments', () => {
    commandRegistry.register({ name: 'done', aliases: ['d'], description: '完成', handler: vi.fn() })
    const match = commandRegistry.match('/done 项目评审会')
    expect(match).not.toBeNull()
    expect(match!.command.name).toBe('done')
    expect(match!.args).toBe('项目评审会')
  })

  it('returns null for unknown command', () => {
    const match = commandRegistry.match('/nonexistent')
    expect(match).toBeNull()
  })

  it('calls handler when executed', () => {
    const handler = vi.fn()
    commandRegistry.register({ name: 'test', description: 'test', handler })
    const match = commandRegistry.match('/test arg1')
    match!.command.handler(match!.args, mockCtx)
    expect(handler).toHaveBeenCalledWith('arg1', mockCtx)
  })
})
