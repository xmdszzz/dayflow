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
  const [explicitTaskId, setExplicitTaskId] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)

  useEffect(() => {
    // Listen for tool:confirm-required from main process
    const unsub = window.api.on('tool:confirm-required', (data: unknown) => {
      setPendingConfirm(data as { question: string; options: { label: string; task_id: string; summary: string }[] })
    })
    return () => { unsub() }
  }, [])

  useEffect(() => {
    // Load all pending tasks for @ mention (use local date, not UTC)
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const endDate = new Date(Date.now() + 30 * 86400000)
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    loadTasks(today, end)
  }, [loadTasks])

  if (!visible) return null

  const handleSend = () => {
    if (!input.trim()) return
    const result = processInput(input.trim())
    if (result === 'handled') { setInput(''); return }
    sendMessage(result, explicitTaskId || undefined)
    setInput('')
    setShowMention(false)
    setExplicitTaskId(null)
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
    const task = tasks.find((t) => t.id === taskId)
    const beforeCursor = input.slice(0, cursorPos)
    const afterCursor = input.slice(cursorPos)
    const atIndex = beforeCursor.lastIndexOf('@')
    // Inject full task context into message so LLM has all fields
    let contextBlock = `[任务引用 ${taskId}] ${taskName}`
    if (task) {
      contextBlock += `\n  日期: ${task.date}  时间: ${task.start_time}-${task.end_time}`
      if (task.place) contextBlock += `  地点: ${task.place}`
      if (task.person) contextBlock += `  人物: ${task.person}`
    }
    const newInput = beforeCursor.slice(0, atIndex) + contextBlock + '\n' + afterCursor
    setInput(newInput)
    setExplicitTaskId(taskId)
    setShowMention(false)
  }

  // @mention shows all non-expired tasks (pending + done + cancelled) for review/reference
  const mentionableTasks = tasks.filter((t) => t.status !== 'expired')
  const filteredMentions = mentionableTasks.filter((t) => t.title.includes(mentionQuery) || t.place.includes(mentionQuery) || t.person.includes(mentionQuery))

  // Reset mention index when query changes
  useEffect(() => { setMentionIndex(0) }, [mentionQuery])

  const handleMentionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (!showMention || filteredMentions.length === 0) return false
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionIndex((i) => Math.min(i + 1, filteredMentions.length - 1))
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionIndex((i) => Math.max(i - 1, 0))
      return true
    }
    if (e.key === 'Enter' && filteredMentions[mentionIndex]) {
      e.preventDefault()
      handleMentionSelect(filteredMentions[mentionIndex].id, filteredMentions[mentionIndex].title)
      return true
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setShowMention(false)
      return true
    }
    return false
  }

  return (
    <div className="w-full h-full bg-[#181825] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#313244]">
        <h3 className="text-sm font-semibold">💬 AI 助手</h3>
        <button onClick={onToggle} className="text-[#6c7086] hover:text-[#cdd6f4]"><X size={16} /></button>
      </div>

      {pendingConfirm && (
        <div className="mx-2 mt-2 bg-[#45475a] rounded-lg p-3">
          <p className="text-xs mb-2">{pendingConfirm.question}</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {pendingConfirm.options.map((opt, i) => (
              <button key={i} onClick={() => confirmAction(opt.task_id, `${opt.label}: ${opt.summary}`)}
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
          <MentionPopup query={mentionQuery} tasks={mentionableTasks} onSelect={handleMentionSelect} onClose={() => setShowMention(false)} selectedIndex={mentionIndex} />
        )}
        <ChatInput value={input} onChange={handleInput} onSend={handleSend} disabled={loading} onKeyDown={handleMentionKeyDown} />
      </div>
    </div>
  )
}
