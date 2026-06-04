import { commandRegistry } from '../commands/registry'
import { useChatStore } from '../stores/chatStore'
import { useViewStore } from '../stores/viewStore'
import { useTaskStore } from '../stores/taskStore'

export function processInput(raw: string): 'handled' | string {
  if (raw.startsWith('/')) {
    const match = commandRegistry.match(raw)
    if (match) {
      match.command.handler(match.args, {
        viewStore: useViewStore.getState(),
        taskStore: useTaskStore.getState(),
        chatStore: useChatStore.getState(),
      })
      return 'handled'
    }
  }
  return raw
}
