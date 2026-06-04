import OpenAI from 'openai'
import { getActiveTaskMessages, getMessagesByTask, getMemories, getConfig } from './db'
import { toolRegistry } from './tools/registry'

const SYSTEM_PROMPT = `你是日程管理助手。核心工作：将用户的自然语言日程描述转为结构化操作，通过 function calling 操作日程。

## 核心规则：日期必须通过 resolve_date 工具解析
用户输入中的相对日期表达（"明天""下周三""下个月5号"）绝对不要自行计算。
必须先调用 resolve_date 工具获取绝对日期，再将结果传入 add_task / update_task。

正确流程：
  用户: "明天下午3点开会"
  → 调用 resolve_date("明天") → { date: "2026-06-05" }
  → 调用 add_task({ date: "2026-06-05", time: "15:00", event: "开会" })

错误流程（严禁）：
  → 直接调用 add_task({ date: "2026-06-05", ... })  ← 不要自己算日期

## 其他规则
1. 所有 date 参数必须是 YYYY-MM-DD 绝对值。未指定具体日期的 → resolve_date("明天") 或 resolve_date("今天")
2. 时间 24 小时制："早上8点"→ 08:00, "下午3点"→ 15:00
3. 未指定地点/人物 → 留空字符串，不编造
4. 需要修改/删除已有任务 → 消息中有上下文就用 task_id，没有就调 query_tasks 查找
5. 无法唯一确定目标任务 → 调用 confirm_with_user，不要猜测
6. 检测到时间冲突 → 回复标注 ⚠️
7. 删除任务前必须 confirm_with_user
8. 回复简洁，只告知操作结果`

function buildContext(userMessage: string, explicitTaskId?: string): OpenAI.ChatCompletionMessageParam[] {
  const activeMessages = getActiveTaskMessages(20)
  const currentTaskMsgs = explicitTaskId ? getMessagesByTask(explicitTaskId) : []
  const recentMemories = getMemories(7)

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: `当前时间：${new Date().toISOString()}` },
  ]

  if (recentMemories.length > 0) {
    messages.push({ role: 'system', content: `近期记忆：${recentMemories.map((m) => m.summary).join('\n')}` })
  }

  for (const m of activeMessages.reverse()) {
    messages.push({ role: m.role as 'user' | 'assistant', content: m.content })
  }

  const seen = new Set(activeMessages.map((m) => m.id))
  for (const m of currentTaskMsgs) {
    if (!seen.has(m.id)) messages.push({ role: m.role as 'user' | 'assistant', content: m.content })
  }

  messages.push({ role: 'user', content: userMessage })
  return messages
}

export async function sendChatMessage(
  userMessage: string, explicitTaskId?: string,
): Promise<{ reply: string; toolResults: unknown[] }> {
  const apiKey = getConfig('api_key')
  if (!apiKey) return { reply: '请先在设置中配置 DeepSeek API Key', toolResults: [] }

  const openai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey })
  const messages = buildContext(userMessage, explicitTaskId)
  const tools = toolRegistry.getOpenAITools()
  const toolResults: unknown[] = []

  for (let round = 0; round < 5; round++) {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      tools: tools as OpenAI.ChatCompletionTool[],
      tool_choice: 'auto',
    })

    const choice = response.choices[0]
    if (!choice) break

    if (choice.finish_reason === 'stop') {
      const content = choice.message.content || '操作完成'
      return { reply: content, toolResults }
    }

    if (choice.message.tool_calls) {
      messages.push({ role: 'assistant', content: choice.message.content || '', tool_calls: choice.message.tool_calls })

      for (const tc of choice.message.tool_calls) {
        const args = JSON.parse(tc.function.arguments)
        const result = await toolRegistry.execute(tc.function.name, args)
        toolResults.push({ tool: tc.function.name, args, result })

        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
      }
    }
  }

  return { reply: '操作完成', toolResults }
}
