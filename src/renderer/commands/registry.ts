import type { CommandDefinition, CommandContext } from './types'

class CommandRegistry {
  private commands = new Map<string, CommandDefinition>()

  register(cmd: CommandDefinition): void {
    this.commands.set(cmd.name, cmd)
    if (cmd.aliases) for (const alias of cmd.aliases) this.commands.set(alias, cmd)
  }

  match(input: string): { command: CommandDefinition; args: string } | null {
    const parts = input.slice(1).split(/\s+/)
    const name = parts[0]
    const cmd = this.commands.get(name)
    if (!cmd) return null
    return { command: cmd, args: parts.slice(1).join(' ') }
  }
}

export const commandRegistry = new CommandRegistry()
