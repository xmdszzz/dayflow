import { getMessagesForDate, saveMemory } from './db'
import { getConfig } from './db'
import OpenAI from 'openai'

export async function compressDate(date: string): Promise<void> {
  const messages = getMessagesForDate(date)
  if (messages.length === 0) return

  const apiKey = getConfig('api_key')
  if (!apiKey) return

  const openai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey })
  const conversationText = messages.map((m) => `[${m.role}] ${m.content}`).join('\n')

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: '你是日程记忆压缩器。将聊天记录压缩为 JSON 摘要。提取：日程操作、偏好、重要备注。返回 JSON: {"summary":"...","keywords":["..."]}',
      },
      { role: 'user', content: `日期: ${date}\n聊天记录:\n${conversationText}` },
    ],
    response_format: { type: 'json_object' },
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')
  await saveMemory({
    date,
    summary: result.summary || '',
    task_count: messages.length,
    keywords: JSON.stringify(result.keywords || []),
  })
}
