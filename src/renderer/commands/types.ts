import type { useViewStore, useTaskStore, useChatStore } from '../stores'

export interface CommandContext {
  viewStore: ReturnType<typeof useViewStore.getState>
  taskStore: ReturnType<typeof useTaskStore.getState>
  chatStore: ReturnType<typeof useChatStore.getState>
}

export interface CommandDefinition {
  name: string
  aliases?: string[]
  description: string
  handler: (args: string, ctx: CommandContext) => void
}
