import type { ToolResult } from '../../shared/types'

interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
  handler: (args: Record<string, unknown>) => Promise<ToolResult>
  requiresConfirmation?: boolean
}

class ToolRegistry {
  private tools = new Map<string, ToolDef>()

  register(tool: ToolDef): void { this.tools.set(tool.name, tool) }

  getOpenAITools(): object[] {
    return Array.from(this.tools.values()).map((t) => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }))
  }

  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) return { success: false, data: null, error: `Unknown tool: ${name}` }
    if (tool.requiresConfirmation) {
      return { success: true, data: { pending_confirmation: true, tool: name, args } }
    }
    return tool.handler(args)
  }

  getTool(name: string): ToolDef | undefined { return this.tools.get(name) }
}

export const toolRegistry = new ToolRegistry()
export type { ToolDef }
