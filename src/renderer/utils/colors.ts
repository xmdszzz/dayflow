export const TASK_COLORS = ['#f38ba8', '#89b4fa', '#a6e3a1', '#fab387', '#cba6f7', '#f9e2af'] as const

export function getTaskColor(taskId: string): string {
  let hash = 0
  for (let i = 0; i < taskId.length; i++) hash = ((hash << 5) - hash) + taskId.charCodeAt(i)
  return TASK_COLORS[Math.abs(hash) % TASK_COLORS.length]
}
