const COLORS = ['#f38ba8', '#89b4fa', '#a6e3a1', '#fab387', '#cba6f7', '#f9e2af']

export function getTaskColor(id: string): string {
  return COLORS[id.charCodeAt(0) % COLORS.length]
}
