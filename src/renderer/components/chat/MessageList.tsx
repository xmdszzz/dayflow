import { useState } from 'react'
import { Loader2, ChevronDown, ChevronRight, Wrench } from 'lucide-react'
import type { ToolCallEntry } from '@/stores/chatStore'

const TOOL_LABELS: Record<string, string> = {
  resolve_date: '📅 解析日期',
  add_task: '➕ 创建任务',
  update_task: '✏️ 修改任务',
  delete_task: '🗑️ 删除任务',
  query_tasks: '🔍 查询任务',
  complete_task: '✅ 完成任务',
  get_now: '🕐 获取时间',
  confirm_with_user: '❓ 请求确认',
}

interface MessageListProps {
  messages: { role: 'user' | 'assistant'; content: string; toolCalls?: ToolCallEntry[] }[]
  loading: boolean
}

export default function MessageList({ messages, loading }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((m, i) => (
        <div key={i}>
          <div className={`text-xs ${m.role === 'user'
            ? 'bg-[#45475a] text-[#f9e2af] ml-4 rounded-lg px-3 py-2'
            : 'bg-[#313244] text-[#cdd6f4] mr-4 rounded-lg px-3 py-2'}`}>
            <span className="text-[10px] text-[#6c7086] block mb-0.5">
              {m.role === 'user' ? '👤' : '🤖'}
            </span>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
          {m.toolCalls && m.toolCalls.length > 0 && (
            <ToolCallSection calls={m.toolCalls} />
          )}
        </div>
      ))}
      {loading && <div className="flex items-center gap-2 text-xs text-[#6c7086]"><Loader2 size={12} className="animate-spin" /> 思考中...</div>}
    </div>
  )
}

function ToolCallSection({ calls }: { calls: ToolCallEntry[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="ml-6 mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-[#6c7086] hover:text-[#a6adc8] transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Wrench size={10} />
        <span>调用了 {calls.length} 个工具</span>
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {calls.map((tc, j) => (
            <div key={j} className={`text-[10px] rounded px-2 py-1 ${tc.success ? 'bg-[#1e1e2e]' : 'bg-[#3e1e1e]'}`}>
              <span className="text-[#a6adc8]">{TOOL_LABELS[tc.name] || tc.name}</span>
              <span className={tc.success ? 'text-[#a6e3a1] ml-1' : 'text-[#f38ba8] ml-1'}>
                {tc.success ? '✓' : '✗'}
              </span>
              <div className="text-[#585b70] mt-0.5 truncate">
                {formatToolArgs(tc.name, tc.arguments)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatToolArgs(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'add_task':
      return `${args.date || '?'} ${args.start_time || '?'}-${args.end_time || '?'} | ${args.title || '?'}`
    case 'update_task':
      return `task_id: ${(args.task_id as string)?.slice(0, 8)}...`
    case 'resolve_date':
      return `${args.expression}`
    default:
      return JSON.stringify(args).slice(0, 60)
  }
}
