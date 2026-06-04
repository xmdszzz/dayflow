import { Loader2 } from 'lucide-react'

interface MessageListProps {
  messages: { role: 'user' | 'assistant'; content: string }[]
  loading: boolean
}

export default function MessageList({ messages, loading }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((m, i) => (
        <div key={i} className={`text-xs ${m.role === 'user'
          ? 'bg-[#45475a] text-[#f9e2af] ml-4 rounded-lg px-3 py-2'
          : 'bg-[#313244] text-[#89b4fa] mr-4 rounded-lg px-3 py-2'}`}>
          <span className="text-[10px] text-[#6c7086] block mb-0.5">{m.role === 'user' ? '👤' : '🤖'}</span>
          {m.content}
        </div>
      ))}
      {loading && <div className="flex items-center gap-2 text-xs text-[#6c7086]"><Loader2 size={12} className="animate-spin" /> 思考中...</div>}
    </div>
  )
}
