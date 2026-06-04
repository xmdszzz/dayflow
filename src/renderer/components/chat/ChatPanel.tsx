import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { useTaskStore } from '@/stores/taskStore'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import MentionPopup from './MentionPopup'
import FoldedSummary from './FoldedSummary'
import { processInput } from '@/input/pipeline'

interface ChatPanelProps { visible: boolean; onToggle: () => void }

export default function ChatPanel({ visible, onToggle }: ChatPanelProps) {
  const { sendMessage, messages, loading, pendingConfirm, confirmAction, cancelAction, setPendingConfirm } = useChatStore()
  const { tasks, loadTasks } = useTaskStore()
  const [input, setInput] = useState('')
  const [showMention, setShowMention] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPos, setCursorPos] = useState(0)

  useEffect(() => {
    // Listen for tool:confirm-required from main process
    const unsub = window.api.on('tool:confirm-required', (data: unknown) => {
      setPendingConfirm(data as { question: string; options: { label: string; task_id: string; summary: string }[] })
    })
    return () => { unsub() }
  }, [])

  useEffect(() => {
    // Load all pending tasks for @ mention
    const today = new Date().toISOString().slice(0, 10)
    const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    loadTasks(today, end)
  }, [])

  if (!visible) return null

  const handleSend = () => {
    if (!input.trim()) return
    const result = processInput(input.trim())
    if (result === 'handled') { setInput(''); return }
    sendMessage(result)
    setInput('')
    setShowMention(false)
  }

  const handleInput = (value: string, cursor: number) => {
    setInput(value)
    setCursorPos(cursor)
    const beforeCursor = value.slice(0, cursor)
    const atMatch = beforeCursor.match(/@([^\s@]*)$/)
    if (atMatch) { setMentionQuery(atMatch[1]); setShowMention(true) }
    else { setShowMention(false) }
  }

  const handleMentionSelect = (taskId: string, taskName: string) => {
    const beforeCursor = input.slice(0, cursorPos)
    const afterCursor = input.slice(cursorPos)
    const atIndex = beforeCursor.lastIndexOf('@')
    const newInput = beforeCursor.slice(0, atIndex) + `[任务引用 ${taskId}] ${taskName}\n` + afterCursor
    setInput(newInput)
    setShowMention(false)
  }

  const pendingTasks = tasks.filter((t) => t.status === 'pending')

  return (
    <div className="w-80 bg-[#181825] border-l border-[#313244] flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#313244]">
        <h3 className="text-sm font-semibold">💬 AI 助手</h3>
        <button onClick={onToggle} className="text-[#6c7086] hover:text-[#cdd6f4]"><X size={16} /></button>
      </div>

      {pendingConfirm && (
        <div className="mx-2 mt-2 bg-[#45475a] rounded-lg p-3">
          <p className="text-xs mb-2">{pendingConfirm.question}</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {pendingConfirm.options.map((opt, i) => (
              <button key={i} onClick={() => confirmAction(opt.task_id)}
                className="w-full text-left text-xs bg-[#585b70] hover:bg-[#6c7086] px-2 py-1 rounded">
                {opt.label}: {opt.summary}
              </button>
            ))}
          </div>
          <button onClick={cancelAction} className="text-[10px] text-[#f38ba8] mt-2 hover:underline">取消</button>
        </div>
      )}

      <MessageList messages={messages} loading={loading} />
      <FoldedSummary />
      <div className="relative">
        {showMention && (
          <MentionPopup query={mentionQuery} tasks={pendingTasks} onSelect={handleMentionSelect} onClose={() => setShowMention(false)} />
        )}
        <ChatInput value={input} onChange={handleInput} onSend={handleSend} disabled={loading} />
      </div>
    </div>
  )
}
