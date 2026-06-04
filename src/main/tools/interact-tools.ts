import { toolRegistry } from './registry'
import { BrowserWindow } from 'electron'
import type { ToolResult } from '../../shared/types'

let pendingConfirmation: { resolve: (value: ToolResult) => void } | null = null

toolRegistry.register({
  name: 'confirm_with_user',
  description: '无法确定用户意图时请求确认。列出候选任务让用户选择。',
  parameters: {
    type: 'object',
    properties: {
      question: { type: 'string', description: '向用户提问的问题' },
      options: {
        type: 'array',
        items: { type: 'object', properties: { label: { type: 'string' }, task_id: { type: 'string' }, summary: { type: 'string' } } },
        description: '候选任务列表',
      },
    },
    required: ['question', 'options'],
  },
  async handler(args) {
    const { question, options } = args as Record<string, unknown>
    return new Promise<ToolResult>((resolve) => {
      pendingConfirmation = { resolve }
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('tool:confirm-required', { question, options })
    })
  },
})

export function resolveConfirmation(choice: string): void {
  if (pendingConfirmation) {
    pendingConfirmation.resolve({ success: true, data: { user_choice: choice, confirmed: true } })
    pendingConfirmation = null
  }
}

export function cancelConfirmation(): void {
  if (pendingConfirmation) {
    pendingConfirmation.resolve({ success: true, data: { user_choice: '', confirmed: false } })
    pendingConfirmation = null
  }
}
