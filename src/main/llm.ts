import OpenAI from 'openai'
import { getActiveTaskMessages, getMessagesByTask, getMemories, getConfig, addChatMessage } from './db'
import { toolRegistry } from './tools/registry'

const SYSTEM_PROMPT = `你是日程管理助手。核心工作：将用户的自然语言日程描述转为结构化操作，通过 function calling 操作日程。

## 核心规则：日期必须通过 resolve_date 工具解析
用户输入中的相对日期表达（"明天""下周三""下个月5号"）绝对不要自行计算。
必须先调用 resolve_date 工具获取绝对日期，再将结果传入 add_task / update_task。

正确流程：
  用户: "明天下午3点到5点在3号会议室跟张总开项目评审会"
  → 调用 resolve_date("明天") → { date: "2026-06-05" }
  → 调用 add_task({ date: "2026-06-05", start_time: "15:00", end_time: "17:00", title: "项目评审会", place: "3号会议室", person: "张总" })

错误流程（严禁）：
  → 直接调用 add_task({ date: "2026-06-05", ... })  ← 不要自己算日期

## 任务字段说明
- title: 简短标题（必填，~50字）。提取核心事件描述。
- start_time / end_time: 开始/结束时间（必填，HH:mm 24小时制）。用户说"上午9点到11点"→ start_time: "09:00", end_time: "11:00"。只说"9点"未指定结束时间时，默认 +1 小时。
- notes: 备注（可选）。自动提取用户输入中的非结构化信息：背景、准备事项、链接、附件说明等。用户在结构化字段之外提到的所有细节都应放入 notes。
- place: 地点（可选）。未提到则留空。
- person: 参与人物（可选）。未提到则留空。

## 时间冲突处理
add_task 和 update_task 会自动检测时间冲突并返回 conflicts 数组。如果返回中有冲突，在回复中标注 ⚠️ 并说明冲突的任务。
示例回复："已添加「项目评审会」15:00-17:00。⚠️ 与「周会」16:00-17:00 有60分钟重叠，请注意。"

## 插入任务的推荐流程
当用户想在特定日期添加任务但未指定具体时间时：
1. 调用 find_free_slots 查询该日空闲时段
2. 根据用户需求评估所需时长，筛选合适的空闲时段
3. 列出可选时段供用户选择，标注每个时段的时长
4. 用户确认后调用 add_task

## 其他规则
1. 所有 date 参数必须是 YYYY-MM-DD 绝对值。未指定具体日期的 → resolve_date("明天") 或 resolve_date("今天")
2. 时间 24 小时制："早上8点"→ 08:00, "下午3点"→ 15:00
3. 未指定地点/人物 → 留空字符串，不编造
4. 需要修改/删除已有任务 → 消息中有上下文就用 task_id，没有就调 query_tasks 查找
5. 无法唯一确定目标任务 → 调用 confirm_with_user，不要猜测
6. 取消任务（保留记录）用 cancel_task，永久删除（不可恢复）用 delete_task。两个操作前都必须 confirm_with_user
7. 回复简洁，只告知操作结果

## 任务复盘（Review）
用户可通过 @任务名 引用已完成的任务并请求复盘。流程：
1. 用户输入 "@任务名 复盘：具体内容..."
2. 调用 write_review(task_id, content) 写入复盘
3. content 参数需经过美化：修正错别字和语法，提炼关键信息，保持简洁（2-5句话），保留用户的真实感受和具体细节
4. 回复确认："已写入复盘：..."

用户也可以直接要求查看已完成的任务：
→ 调用 query_tasks(include_completed=true) 查询已完成的任务列表`

function buildContext(
  userMessage: string,
  explicitTaskId?: string,
  recentMessages?: { role: string; content: string }[],
): OpenAI.ChatCompletionMessageParam[] {
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

  // Include renderer-side recent history (live conversation thread, survives even when
  // messages aren't yet linked to a task in the DB — e.g. during multi-turn scheduling)
  const seenContent = new Set<string>()
  if (recentMessages && recentMessages.length > 0) {
    for (const m of recentMessages) {
      const key = `${m.role}:${m.content}`
      seenContent.add(key)
      messages.push({ role: m.role as 'user' | 'assistant', content: m.content })
    }
  }

  // Also include DB-persisted messages from active tasks (catches context from past sessions),
  // but deduplicate against what the renderer already sent
  for (const m of activeMessages.reverse()) {
    const key = `${m.role}:${m.content}`
    if (!seenContent.has(key)) {
      seenContent.add(key)
      messages.push({ role: m.role as 'user' | 'assistant', content: m.content })
    }
  }

  for (const m of currentTaskMsgs) {
    const key = `${m.role}:${m.content}`
    if (!seenContent.has(key)) {
      seenContent.add(key)
      messages.push({ role: m.role as 'user' | 'assistant', content: m.content })
    }
  }

  messages.push({ role: 'user', content: userMessage })
  return messages
}

export async function sendChatMessage(
  userMessage: string, explicitTaskId?: string, recentMessages?: { role: string; content: string }[],
): Promise<{ reply: string; toolCalls: ToolCallRecord[]; affectedTasks: string[] }> {
  const apiKey = getConfig('api_key')
  if (!apiKey) return { reply: '请先在设置中配置 DeepSeek API Key', toolCalls: [], affectedTasks: [] }

  const openai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey })
  const messages = buildContext(userMessage, explicitTaskId, recentMessages)
  const tools = toolRegistry.getOpenAITools()
  const toolCalls: ToolCallRecord[] = []
  const affectedTaskIds = new Set<string>()

  try {
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
      const reply = choice.message.content || '操作完成'

      // Save messages to DB linked to affected tasks
      const taskIds = [...affectedTaskIds]
      const primaryTaskId = taskIds.length > 0 ? taskIds[0] : (explicitTaskId || null)

      if (primaryTaskId) {
        addChatMessage(primaryTaskId, 'user', userMessage)
        addChatMessage(primaryTaskId, 'assistant', reply, JSON.stringify(toolCalls))
      }
      // When no task is affected (e.g. LLM asked a question without creating a task),
      // the renderer's recentHistory already preserves the conversation thread.
      // DB persistence of orphan messages is handled by the renderer-side buffer.

      return { reply, toolCalls, affectedTasks: taskIds }
    }

    if (choice.message.tool_calls) {
      messages.push({ role: 'assistant', content: choice.message.content || '', tool_calls: choice.message.tool_calls })

      for (const tc of choice.message.tool_calls) {
        const args = JSON.parse(tc.function.arguments)
        const result = await toolRegistry.execute(tc.function.name, args)

        const record: ToolCallRecord = {
          name: tc.function.name,
          arguments: args,
          result: result.success ? result.data : { error: result.error },
          success: result.success,
        }
        toolCalls.push(record)

        // Track affected task IDs
        const taskId = (args as Record<string, string>).task_id
        if (taskId) affectedTaskIds.add(taskId)
        if (result.success && (result.data as Record<string, unknown>)?.task_id) {
          affectedTaskIds.add((result.data as Record<string, string>).task_id)
        }

        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
      }
    }
  }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Return a friendly error message that the renderer can display
    if (message.includes('401') || message.includes('Unauthorized') || message.includes('Invalid API Key')) {
      return { reply: 'API Key 无效，请在设置中检查你的 DeepSeek API Key', toolCalls: [], affectedTasks: [] }
    }
    if (message.includes('429') || message.includes('rate')) {
      return { reply: '请求太频繁，请稍后再试', toolCalls: [], affectedTasks: [] }
    }
    if (message.includes('timeout') || message.includes('ETIMEDOUT') || message.includes('ECONNREFUSED')) {
      return { reply: '无法连接到 DeepSeek API，请检查网络连接', toolCalls: [], affectedTasks: [] }
    }
    return { reply: `AI 服务出错: ${message}`, toolCalls: [], affectedTasks: [] }
  }

  return { reply: '操作完成', toolCalls, affectedTasks: [...affectedTaskIds] }
}

export interface ToolCallRecord {
  name: string
  arguments: Record<string, unknown>
  result: unknown
  success: boolean
}
