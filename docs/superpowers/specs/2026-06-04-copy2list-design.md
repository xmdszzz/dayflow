# copy2list — 产品设计规格文档

> **版本**：v1.0
> **日期**：2026-06-04
> **状态**：待审阅

---

## 1. 产品概述

### 1.1 定位

copy2list 是一款 Windows 10/11 桌面日程管理工具。核心能力：

- **日历面板**：月 / 周 / 今日三视图，展示每日待办任务
- **AI 聊天面板**：用户用自然语言输入日程，AI 自动解析为结构化任务并写入日历
- **提前提醒**：每个任务到期前 10 分钟通过 Windows 原生通知提醒

### 1.2 使用场景

- 个人单机使用，纯本地应用
- 用户通过自然语言快速录入和修改日程
- 应用常驻系统托盘，后台运行提醒服务

### 1.3 任务数据格式

每条任务包含五个字段：

| 字段 | 示例 | 说明 |
|---|---|---|
| 时间 (time) | `2026-06-04 09:00` | 日期 + 时刻 |
| 地点 (place) | `3号会议室` | 事件发生地点 |
| 人物 (person) | `张总` | 参与人物 |
| 事件 (event) | `项目评审会` | 事件描述 |

---

## 2. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 桌面框架 | Electron 33+ | Web 技术构建桌面 UI，成熟生态，Windows 原生通知 + 托盘支持 |
| 前端框架 | React 19 + TypeScript | 社区最大，中文资料丰富 |
| 状态管理 | Zustand | 轻量、无模板代码、支持中间件 |
| UI 样式 | Tailwind CSS + shadcn/ui | 暗色主题开箱即用，组件精致 |
| 本地数据库 | better-sqlite3 | Electron 下性能最优的 SQLite 绑定，同步 API |
| 大模型 | DeepSeek Chat API | 最高性价比，中文理解强，兼容 OpenAI Function Calling |
| LLM SDK | openai (npm) | 轻量，DeepSeek 原生兼容 OpenAI 格式 |
| 打包分发 | electron-builder | 打包为 Windows .exe/.msi 安装包 |
| 开发语言 | TypeScript (全栈) | 类型安全，Main + Renderer 共享类型 |

---

## 3. 数据模型

### 3.1 表结构

```sql
-- 任务表
CREATE TABLE tasks (
  id          TEXT PRIMARY KEY,              -- UUID v4
  date        TEXT NOT NULL,                 -- '2026-06-04'
  time        TEXT NOT NULL,                 -- '09:00'
  place       TEXT NOT NULL DEFAULT '',      -- 地点
  person      TEXT NOT NULL DEFAULT '',      -- 人物
  event       TEXT NOT NULL,                 -- 事件描述
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | done | cancelled | expired
  chat_count  INTEGER NOT NULL DEFAULT 0,    -- 挂载的聊天消息数量
  notified    INTEGER NOT NULL DEFAULT 0,    -- 是否已发送提醒 (0/1)
  created_at  TEXT NOT NULL,                 -- ISO 8601
  updated_at  TEXT NOT NULL                  -- ISO 8601
);

-- 聊天消息表（任务锚定）
CREATE TABLE chat_messages (
  id          TEXT PRIMARY KEY,              -- UUID v4
  task_id     TEXT NOT NULL,                 -- FK → tasks.id
  role        TEXT NOT NULL,                 -- 'user' | 'assistant' | 'system'
  content     TEXT NOT NULL,                 -- 消息原始内容
  tool_calls  TEXT,                          -- JSON: LLM 返回的 function_call 数组
  created_at  TEXT NOT NULL,                 -- ISO 8601

  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- 长期记忆表（每日压缩摘要）
CREATE TABLE chat_memory (
  id          TEXT PRIMARY KEY,              -- UUID v4
  date        TEXT NOT NULL UNIQUE,          -- '2026-06-04'
  summary     TEXT NOT NULL,                 -- LLM 生成的摘要
  task_count  INTEGER NOT NULL DEFAULT 0,    -- 当天操作的任务数
  keywords    TEXT,                          -- JSON: ["评审","预算","健身"]
  created_at  TEXT NOT NULL                  -- ISO 8601
);

-- 配置表
CREATE TABLE config (
  key         TEXT PRIMARY KEY,              -- 配置键
  value       TEXT NOT NULL                  -- 配置值
);
```

### 3.2 关键索引

```sql
CREATE INDEX idx_tasks_date ON tasks(date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_datetime ON tasks(date, time);      -- 提醒查询热路径
CREATE INDEX idx_chat_messages_task ON chat_messages(task_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);
```

### 3.3 默认配置项

| key | 默认值 | 说明 |
|---|---|---|
| `api_key` | `""` | DeepSeek API Key |
| `reminder_minutes` | `10` | 提前提醒分钟数 |
| `open_at_login` | `false` | 开机自启 |
| `theme` | `dark` | 主题 |

---

## 4. 架构设计

### 4.1 进程模型

```
┌─ Main Process (Node.js) ═══════════════════════════════┐
│                                                         │
│  BrowserWindow  — 主窗口管理                            │
│  SystemTray     — 系统托盘 + 右键菜单                    │
│  Notification   — Windows 原生通知                      │
│  ToolRegistry   — Tool 注册与执行中枢                    │
│  ReminderService — 动态间隔轮询                          │
│  Compressor     — 每日消息压缩                           │
│  ContextBuilder — LLM 请求上下文组装                     │
│  LLMService     — DeepSeek API 调用                     │
│  Database       — better-sqlite3 封装                   │
│                                                         │
│  IPC Handlers   — task:* / chat:* / config:* / tool:*  │
│                                                         │
└──────────────────────┬──────────────────────────────────┘
                       │ IPC (contextBridge)
┌─ Renderer Process (Chromium) ══════════════════════════┐
│                                                         │
│  React 19 + TypeScript                                  │
│  ├── InputPipeline     (指令检测 + @ 解析 + 纯文本)     │
│  ├── CommandRegistry   (/today, /done, /add ...)        │
│  ├── CalendarView      (Month / Week / Today)           │
│  ├── ChatPanel         (消息列表 + @ 补全)               │
│  ├── SettingsDialog    (API Key / 提醒设置)              │
│  └── Zustand Stores    (taskStore, chatStore, viewStore)│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 IPC 通道

| 通道 | 方向 | 用途 |
|---|---|---|
| `task:list` | Renderer → Main | 按日期范围查询任务列表 |
| `task:create` | Renderer → Main | 手动创建任务（非聊天路径） |
| `task:update` | Renderer → Main | 手动更新任务 |
| `task:delete` | Renderer → Main | 手动删除任务 |
| `task:complete` | Renderer → Main | 标记任务完成 |
| `chat:send` | Renderer → Main | 发送聊天消息 → LLM 对话 → 返回结果 |
| `chat:confirm` | Renderer → Main | 用户确认 LLM 的待确认操作 |
| `chat:cancel` | Renderer → Main | 用户取消 LLM 的待确认操作 |
| `config:get` | Renderer → Main | 读取配置 |
| `config:set` | Renderer → Main | 写入配置 |
| `reminder:on-fire` | Main → Renderer | 提醒触发时推送至 UI |
| `tool:confirm-required` | Main → Renderer | LLM 需要用户确认时推送 |

---

## 5. Tool / Skill 系统

### 5.1 设计原则

LLM 不能直接操作数据库或获取系统时间。所有与现实世界交互的能力都通过 **Tool** 暴露。Tool 的定义同步发送给 DeepSeek 作为 Function Calling 的 tools 参数。

### 5.2 ToolRegistry

```ts
// src/main/tools/registry.ts
interface ToolDefinition {
  name: string;
  description: string;           // 给 LLM 的用途说明
  parameters: JSONSchema;        // OpenAI Function Calling 格式
  handler: (args: any) => Promise<ToolResult>;
  requiresConfirmation?: boolean; // 是否需要用户二次确认
}

interface ToolResult {
  success: boolean;
  data: any;
  error?: string;
}

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void;
  getOpenAITools(): object[];     // 转为 OpenAI tools 数组格式
  async execute(name: string, args: any): Promise<ToolResult>;
}
```

### 5.3 全部 Tool 定义

#### Tool 1: `add_task`

| 属性 | 值 |
|---|---|
| **描述** | 创建一个新的日程任务。用户首次提及某个日程时使用。 |
| **Parameters** | `date` (required), `time` (required), `event` (required), `place` (optional), `person` (optional) |
| **Handler** | 生成 UUID → `INSERT INTO tasks` → 创建关联 `chat_messages` (user + assistant) → 更新 `chat_count` |
| **Returns** | `{ task_id, task: {...} }` |

#### Tool 2: `update_task`

| 属性 | 值 |
|---|---|
| **描述** | 修改已有任务任意字段。需指定 task_id。若用户明确指定了目标任务（@ 引用已由前端解析注入 task_id），直接执行。若通过语义匹配推断，需附加 confidence。 |
| **Parameters** | `task_id` (required), `date`, `time`, `place`, `person`, `event` (all optional), `confidence` (optional: `"high"` \| `"low"`) |
| **Handler** | 检查 task 存在且 status=pending → `UPDATE tasks SET ...` → 插入 assistant 消息 |
| **Returns** | `{ task_id, changes, new_summary }` |
| **规则** | confidence 为 "low" 或无法确定 task_id 时 → 调用 `confirm_with_user`，不执行实际操作 |

#### Tool 3: `delete_task`

| 属性 | 值 |
|---|---|
| **描述** | 删除/取消任务。需用户确认。 |
| **Parameters** | `task_id` (required) |
| **Handler** | `UPDATE tasks SET status='cancelled'` → 触发消息折叠 → 触发压缩 |
| **Returns** | `{ task_id, deleted_summary }` |
| **requiresConfirmation** | `true` |

#### Tool 4: `query_tasks`

| 属性 | 值 |
|---|---|
| **描述** | 按条件查询日程列表。 |
| **Parameters** | `date` (optional), `date_range` (optional: `{start, end}`), `status` (optional), `keyword` (optional) |
| **Handler** | `SELECT * FROM tasks WHERE ...` |
| **Returns** | `{ tasks: Task[], count: number }` |

#### Tool 5: `complete_task`

| 属性 | 值 |
|---|---|
| **描述** | 标记任务为已完成。完成后该任务的所有聊天记录折叠。 |
| **Parameters** | `task_id` (required) |
| **Handler** | `UPDATE tasks SET status='done'` → 触发消息折叠 → 触发压缩 |
| **Returns** | `{ task_id, event }` |

#### Tool 6: `get_now`

| 属性 | 值 |
|---|---|
| **描述** | 获取当前日期和时间。作为所有日期计算的基准参考点。 |
| **Parameters** | 无 |
| **Handler** | `new Date()` → 格式化返回 |
| **Returns** | `{ datetime: "2026-06-04T15:30:00+08:00", date: "2026-06-04", time: "15:30", weekday: "星期四", week: "W23" }` |

#### Tool 7: `resolve_date`

| 属性 | 值 |
|---|---|
| **描述** | **确定性日期解析器。** 将中文相对日期表达解析为绝对日期 YYYY-MM-DD。LLM **不得**自行计算日期，必须调用此 Tool。 |
| **Parameters** | `expression` (required): 相对日期表达字符串, `reference_date` (optional): 基准日期，默认今天 |
| **Handler** | TypeScript 实现的纯函数中文日期解析引擎，使用 `date-fns` 做日期运算。100% 确定性，无随机性。 |
| **Returns** | `{ date: "2026-06-05", weekday: "星期五", expression: "明天" }` |

**支持的表达式与解析逻辑：**

| 类别 | 表达式 | date-fns 操作 |
|---|---|---|
| 天偏移 | 今天 / 明天 / 后天 / 大后天 / 昨天 / 前天 | `addDays(today, 0/+1/+2/+3/-1/-2)` |
| 周X | 下周三 / 下周二 / 上周五 | `addWeeks(nextDay(today, targetDay), 1)` |
| 月偏移 | 下个月5号 / 下下个月 / 上个月 | `addMonths(today, ±1/±2)` |
| 年偏移 | 明年 / 后年 / 明年初 | `addYears` / setMonth(0) |
| 模糊范围 | 周末 / 最近几天 | 返回 `{start_date, end_date}` |

**实现概要：**

```ts
// src/main/tools/system-tools.ts
import { addDays, addWeeks, addMonths, nextDay, startOfWeek } from 'date-fns';

const PATTERNS: [RegExp, (match: RegExpMatchArray, ref: Date) => string][] = [
  [/^今天$/,   () => fmt(ref)],
  [/^明天$/,   () => fmt(addDays(ref, 1))],
  [/^后天$/,   () => fmt(addDays(ref, 2))],
  [/^大后天$/, () => fmt(addDays(ref, 3))],
  [/^昨天$/,   () => fmt(addDays(ref, -1))],
  [/^前天$/,   () => fmt(addDays(ref, -2))],
  // ...更多模式按优先级排列
];

function resolveDate(expression: string, reference?: string): ResolveResult {
  const ref = reference ? new Date(reference) : new Date();
  for (const [pattern, fn] of PATTERNS) {
    const m = expression.match(pattern);
    if (m) return { date: fn(m, ref), expression };
  }
  throw new Error(`无法解析日期表达: ${expression}`);
}
```

#### Tool 8: `confirm_with_user`

| 属性 | 值 |
|---|---|
| **描述** | LLM 无法确定用户意图时，暂停并请求用户确认。不执行实际操作。 |
| **Parameters** | `question` (required), `options` (required: `[{label, task_id, summary}]`) |
| **Handler** | 向 Renderer 发送 `tool:confirm-required` → 暂停当前对话 → 等待 `chat:confirm` / `chat:cancel` |
| **Returns** | `{ user_choice: string, confirmed: boolean }` |

### 5.4 Tool 调用完整流程

```
用户输入 (Renderer)
  → IPC 'chat:send'
  → ContextBuilder 组装 messages + tools
  → DeepSeek API (with tools)
  → LLM 返回 tool_calls[]
  → ToolRegistry.execute(toolName, args)
       ├── 数据类 tool → SQLite 操作 → 返回结果
       └── 交互类 tool → 通知 Renderer → 等待用户 → 返回结果
  → 结果送回 DeepSeek (assistant role + tool_call_id)
  → LLM 生成自然语言确认
  → 返回 Renderer: 聊天消息 + 任务变更
  → Renderer 刷新 UI
```

---

## 6. 聊天上下文管理

### 6.1 任务锚定模型

**核心规则：每条 chat_messages 记录必须有 `task_id`，不可为空。**

```
Task Node: "项目评审会" (t-001, status: pending)
  ├── msg-001 [user]      "明天上午9点跟张总开会"
  ├── msg-002 [assistant]  "已添加：6月5日 09:00 项目评审会"
  ├── msg-003 [user]      "@项目评审会 改到10点"
  └── msg-004 [assistant]  "已修改：6月5日 10:00 项目评审会"

Task Node: "健身" (t-002, status: done)  ← 已完成
  ├── msg-005 [user]      "晚上8点健身"         🔥 折叠
  └── msg-006 [assistant]  "已添加：..."         🔥 折叠
```

### 6.2 折叠触发规则

| 触发条件 | 动作 |
|---|---|
| 用户手动标记完成 (task.status → done) | 该 task 下的所有消息立即折叠 |
| 用户取消任务 (task.status → cancelled) | 同上 |
| 任务时间 < 当前时间 且 status=pending 未操作 | ReminderService 检测 → 通知用户 → 用户确认后折叠 |
| 应用启动时检查 | 所有过期且未确认的任务 → 批量标记 expired → 消息折叠 |

### 6.3 上下文构建 (ContextBuilder)

每次发送消息时，Main Process 组装发送给 DeepSeek 的 messages 数组：

```ts
function buildContext(userMessage: string, explicitTaskId?: string) {
  // 1. 取活跃消息：JOIN tasks WHERE status='pending' AND 未过期，最近 20 条
  const activeMessages = db.getActiveTaskMessages(20);

  // 2. 当前操作的任务的完整消息历史（@ 引用时）
  const currentTaskMsgs = explicitTaskId
    ? db.getMessagesByTask(explicitTaskId)
    : [];

  // 3. 最近 7 天长期记忆
  const recentMemories = db.getMemories(7);

  // 4. 已折叠任务统计
  const foldedSummary = db.getFoldedSummary();

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: `当前时间：${getNow()}` },
    ...(recentMemories.length > 0
      ? [{ role: 'system' as const, content: `近期记忆：${recentMemories.map(m => m.summary).join('\n')}` }]
      : []),
    ...activeMessages,
    ...currentTaskMsgs,
    { role: 'user', content: userMessage },
  ];
}
```

**说明：**
- 不再注入活跃任务列表 → LLM 需要时调用 `query_tasks` tool 主动查询
- 已折叠任务不单独占一条 system 消息 → 已折叠的消息根本不在 activeMessages 中，自然无感知
- system 消息极简：角色规则 + 当前时间 + 近期记忆（可选）

### 6.4 每日压缩

| 属性 | 说明 |
|---|---|
| **触发时机** | ① 应用启动时检查昨天 → ② 每小时定时检查跨天 → ③ 任务完成/取消时立即触发该任务的消息压缩 |
| **压缩方式** | 取目标日期的所有消息 → 发给 DeepSeek 生成 JSON 摘要 → 存 `chat_memory` 表 |
| **压缩 Prompt** | 提取关键信息：日程操作、讨论偏好、重要备注。返回 JSON：`{summary, keywords, task_count}` |
| **成本** | 每次压缩约 500 token，非频繁操作 |

---

## 7. 输入预处理系统（Command + @ 引用）

### 7.1 设计原则

**@ 引用和斜杠命令都在客户端预处理阶段拦截处理，不进入 LLM 对话循环。** 参考 Claude Code 的 `processUserInput` 机制：指令和引用在 Renderer 层面被解析、替换、路由，LLM 只收到已解析好的纯文本上下文。

### 7.2 预处理管道 (Input Pipeline)

```
用户原始输入
      │
      ▼
┌─────────────────────────────┐
│ Step 1: 指令检测             │
│ 匹配 / 前缀 → 路由到 Command │
│ 如 /today、/done t-001      │
│ → 直接执行，不发 LLM         │
└─────────────┬───────────────┘
      │ (非指令)
      ▼
┌─────────────────────────────┐
│ Step 2: @ 引用解析           │
│ 匹配 @前缀 → 查询 task      │
│ → 替换为任务上下文注入文本    │
└─────────────┬───────────────┘
      │
      ▼
┌─────────────────────────────┐
│ Step 3: 纯文本               │
│ 无需预处理 → 原样保留        │
└─────────────┬───────────────┘
      │
      ▼
  发送到 Main Process (chat:send)
  → ContextBuilder → DeepSeek
```

### 7.3 @ 引用：客户端解析，零 Token 浪费

**核心规则：@ 引用的任务上下文在 Renderer 端解析并注入文本，LLM 收到的是已经包含完整任务信息的消息。**

#### 示例

```
用户输入:
  "@项目评审会 改到下午3点"

Renderer 预处理后:
  "[任务引用 t-001]
   事件: 项目评审会
   时间: 2026-06-05 10:00
   地点: 3号会议室
   人物: 张总
   ──────────────
   改到下午3点"

→ 发送给 DeepSeek 的 user message 已经是替换后的版本
→ LLM 直接拿到 task_id=t-001，无需语义匹配
→ update_task 的 confidence 对于 @ 引用永远是 "explicit"
```

#### @ 自动补全 UI

- 触发字符：`@`
- 候选列表：所有 `status='pending'` 的任务
- 过滤方式：模糊匹配任务事件名 + 地点 + 人物
- 交互：↑↓ 选择 / Enter 确认 / Esc 关闭
- 显示内容：任务名 + 日期时间 + 地点人物

### 7.4 斜杠命令系统 (Command Registry)

参考 Claude Code 的 Command 注册机制，所有 `/command` 在预处理阶段被拦截路由，不进入 LLM。

```ts
// src/renderer/commands/registry.ts
interface CommandDefinition {
  name: string;                              // '/today'
  aliases?: string[];                        // ['/td']
  description: string;                       // 给用户的帮助文本
  handler: (args: string, context: CommandContext) => CommandResult;
  // context 提供: taskStore, chatStore, IPC 通道等
}

class CommandRegistry {
  private commands: Map<string, CommandDefinition> = new Map();

  register(cmd: CommandDefinition): void;
  match(input: string): { command: CommandDefinition, args: string } | null;
  execute(name: string, args: string): Promise<CommandResult>;
}
```

#### Phase 1 内置命令

| 命令 | 别名 | 功能 | 示例 |
|---|---|---|---|
| `/help` | `/h` | 列出所有可用命令 | `/help` |
| `/today` | `/td` | 切换到今日视图 | `/today` |
| `/week` | `/wk` | 切换到周视图 | `/week` |
| `/month` | `/m` | 切换到月视图 | `/month` |
| `/done` | `/d` | 标记任务完成 | `/done t-001` |
| `/delete` | `/del` | 取消任务 | `/delete t-001` |
| `/add` | `/a` | 打开快速添加面板 | `/add` |
| `/settings` | `/cfg` | 打开设置 | `/settings` |

#### 扩展性

后续可注册更多命令（如 `/export`、`/stats`），只需实现 `CommandDefinition` 接口并 `registry.register()`。命令放在 `src/renderer/commands/` 目录下，按功能分文件。

### 7.5 语义匹配（无 @ 时）

当用户输入不包含 @ 引用时，LLM 仍需通过语义匹配判断目标任务：

| 场景 | 用户输入 | LLM 行为 |
|---|---|---|
| **语义明确** | "把会议改到下午3点" | 对比活跃任务列表 → 匹配到「项目评审会」→ confidence=high → 执行 |
| **语义模糊** | "改到下午3点" | 无法唯一匹配 → confidence=low → 调用 `confirm_with_user` → 列出候选 |

**优化：无 @ 时不发全量活跃任务列表。** 只注入当前对话中最近引用的 3 个任务的摘要，大幅减少 system prompt token。LLM 需要更多候选时调用 `query_tasks` 主动查询。

### 7.6 更新后的消息流转

```
用户输入: "@项目评审会 改到下午3点"

┌─ Renderer ─────────────────────────┐
│ 1. InputPipeline.parse()           │
│    检测到 @ → 查询 taskStore       │
│    → 替换 @mention 为任务上下文    │
│ 2. chatStore.sendMessage(processed)│
│    → IPC 'chat:send'              │
└────────────┬───────────────────────┘
             │ { userMessage: "[任务引用 t-001] ...", explicitTaskId: "t-001" }
             ▼
┌─ Main Process ─────────────────────┐
│ 3. ContextBuilder                  │
│    explicitTaskId → 注入该 task    │
│    的完整消息历史                  │
│ 4. DeepSeek API                   │
│    → tool_call: update_task       │
│       { task_id: "t-001",          │
│         time: "15:00" }           │
│ 5. ToolRegistry.execute()         │
│ 6. LLM 生成确认 → 返回 Renderer   │
└────────────────────────────────────┘
```

---

## 8. 提醒系统

### 8.1 方案选择：动态间隔轮询

采用**动态间隔 `setInterval`**（非固定 30 秒，非多 timer）：

```ts
class ReminderService {
  private timer: ReturnType<typeof setInterval> | null = null;

  schedule() {
    const interval = this.calcInterval();
    this.timer = setInterval(() => {
      this.checkAndNotify();
      this.reschedule();
    }, interval);
  }

  private calcInterval(): number {
    const next = db.getNextReminderTime();
    // SELECT MIN(datetime(date || ' ' || time))
    // FROM tasks WHERE status='pending' AND notified=0
    if (!next) return 5 * 60 * 1000;           // 今日无事：5分钟低频保活
    const diff = next.getTime() - Date.now();
    return Math.max(1000, Math.min(diff, 30000)); // clamp [1s, 30s]
  }

  reschedule() {
    clearInterval(this.timer!);
    this.schedule();
  }
}
```

### 8.2 核心特性

| 特性 | 实现 |
|---|---|
| **精度** | 1~30 秒（最近任务越近越精准） |
| **开销** | 仅 1 个 interval，每次一次简单 SQL 查询 |
| **休眠恢复** | 醒来后下一次区间自动补上，无需补偿逻辑 |
| **任务变更响应** | `reschedule()` 重建 timer，对 UI 层透明 |

### 8.3 通知触发

```ts
checkAndNotify() {
  const tasks = db.getTasksDueIn(reminderMinutes);
  // SELECT * FROM tasks
  // WHERE status='pending' AND notified=0
  //   AND datetime(date || ' ' || time) <= datetime('now', '+' || ? || ' minutes')
  //   AND datetime(date || ' ' || time) > datetime('now')

  for (const task of tasks) {
    new Notification({
      title: `⏰ ${reminderMinutes}分钟后 · ${task.event}`,
      body: `📍 ${task.place}  👤 ${task.person}\n🕐 ${task.date} ${task.time}`,
      silent: false,
    }).on('click', () => {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('navigate', { view: 'today', highlight: task.id });
    });

    db.markNotified(task.id); // UPDATE tasks SET notified=1
  }
}
```

### 8.4 系统托盘

- 应用关闭 → 最小化到托盘（不退出）
- 托盘图标持续运行提醒服务
- 右键菜单：
  - 显示主窗口
  - 今日任务列表（N 条）
  - ──────────
  - 设置
  - 退出（真正退出进程）

### 8.5 开机自启

```ts
app.setLoginItemSettings({
  openAtLogin: configStore.get('open_at_login') === 'true',
});
```

---

## 9. UI 设计

### 9.1 窗口规格

- 默认尺寸：1200 × 780 px
- 最小尺寸：900 × 600 px
- 主题：暗色（Catppuccin Mocha 色板）
- 自定义标题栏

### 9.2 组件树

```
App
├── TitleBar (自定义标题栏)
├── Layout
│   ├── Sidebar (左侧导航, w-14)
│   │   ├── NavItem("月视图", icon: Calendar)
│   │   ├── NavItem("周视图", icon: Columns)
│   │   ├── NavItem("今日", icon: Sun)
│   │   └── SettingsButton(icon: Gear)
│   ├── MainContent (flex-1)
│   │   ├── [月视图] MonthView
│   │   │   ├── MonthHeader (◀ 2026年6月 ▶)
│   │   │   ├── MonthGrid (7×6)
│   │   │   │   └── DayCell (日期号 + 任务圆点指示)
│   │   │   └── DayDetailPanel (点击日期展开)
│   │   │       └── TaskRow[] (● 时间 地点 人物 事件 ✓)
│   │   │
│   │   ├── [周视图] WeekView
│   │   │   ├── WeekHeader (◀ 6月1日-7日 ▶)
│   │   │   └── WeekGrid (7列 × 时间轴)
│   │   │       └── TaskBlock (按时段排布)
│   │   │
│   │   └── [今日] TodayView
│   │       ├── DateBanner (2026年6月4日 星期四)
│   │       ├── TimelineView (时间轴排列)
│   │       │   └── TaskCard[] (完整信息 + 倒计时)
│   │       └── QuickAddButton
│   │
│   └── ChatPanel (右侧, w-80, 可折叠)
│       ├── ChatHeader ("AI 助手" + 折叠按钮)
│       ├── MessageList
│       │   ├── TaskGroup[] (按 task 分组)
│       │   │   ├── TaskBanner (📌 任务名 · 时间)
│       │   │   ├── UserMessage / AssistantMessage
│       │   │   └── ActionPreview (待确认的操作卡片)
│       │   └── FoldedSummary (📦 N个任务已折叠)
│       ├── MentionPopup (@ 自动补全浮层)
│       └── ChatInput (textarea + 发送按钮)
│
├── SettingsDialog (Modal)
│   ├── API Key 配置 (password input)
│   ├── 提醒设置 (提前 N 分钟下拉)
│   ├── 开机自启开关
│   └── 关于
│
└── SystemTray
```

### 9.3 三个视图定位

| 视图 | 适用场景 | 特点 |
|---|---|---|
| **月视图** | 全局规划、快速跳转 | 日历网格，日期上有任务圆点；点击日期在下方展开当日任务列表 |
| **周视图** | 本周安排审视 | 7 列时间轴，任务按时段垂直排布，直观看到冲突和空闲 |
| **今日** | 日常高频使用 | 时间轴 + 大卡片 + 倒计时 + 快速完成按钮，信息密度最高 |

---

## 10. System Prompt

### 10.1 设计原则

**LLM 的单一职责：理解自然语言 → 调用 Tool 操作日程。** 它不知道 @ 语法、不知道斜杠命令、不知道前端预处理——这些是 InputPipeline 的事。LLM 只看到纯文本消息和可用的 Tool 列表。

### 10.2 System Prompt

```markdown
## 角色
你是日程管理助手。核心工作：将用户的自然语言日程描述转为结构化操作，通过 function calling 操作日程。

## 核心规则：日期必须通过 resolve_date 工具解析

用户输入中的相对日期表达（"明天""下周三""下个月5号"）**绝对不要自行计算**。
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
8. 回复简洁，只告知操作结果
```

### 10.3 动态注入内容

每次 LLM 请求由 ContextBuilder 组装的完整 messages 数组：

```
[system] 角色 + 规则
[system] 当前时间：2026-06-04 15:30 星期四
[system] 近期记忆：6月3日添加了2个任务，偏好上午安排会议...
[user/assistant × 20]  滑动窗口内活跃消息
[user]  预处理后的用户输入
```

**注意：不再注入「活跃任务列表」作为 system 消息。** LLM 需要查找任务时主动调用 `query_tasks` tool。这更符合 Tool 系统的设计哲学——LLM 按需获取数据，而非被动接收可能不需要的上下文。

---

## 11. 项目结构

```
copy2list/
├── package.json
├── tsconfig.json
├── electron-builder.yml               # 打包配置
├── tailwind.config.ts
│
├── src/
│   ├── main/                           # Electron Main Process
│   │   ├── index.ts                    # 入口: app ready, 创建窗口/托盘, IPC 注册
│   │   ├── db.ts                       # SQLite 初始化 + 迁移 + CRUD
│   │   ├── tools/
│   │   │   ├── registry.ts             # ToolRegistry 类
│   │   │   ├── task-tools.ts           # add/update/delete/query/complete_task
│   │   │   ├── system-tools.ts         # get_now
│   │   │   └── interact-tools.ts       # confirm_with_user
│   │   ├── llm.ts                      # ContextBuilder + DeepSeek API 调用
│   │   ├── reminder.ts                 # ReminderService (动态间隔轮询)
│   │   ├── compressor.ts              # 每日压缩 + 消息折叠
│   │   ├── tray.ts                     # 系统托盘菜单
│   │   └── ipc-handlers.ts            # 全部 IPC 通道注册
│   │
│   ├── renderer/                       # React 前端
│   │   ├── index.html
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── TitleBar.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── MainLayout.tsx
│   │   │   ├── calendar/
│   │   │   │   ├── MonthView.tsx
│   │   │   │   ├── WeekView.tsx
│   │   │   │   ├── TodayView.tsx
│   │   │   │   ├── DayCell.tsx
│   │   │   │   ├── DayDetailPanel.tsx
│   │   │   │   ├── TaskRow.tsx
│   │   │   │   └── TaskCard.tsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── TaskGroup.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── MentionPopup.tsx
│   │   │   │   └── FoldedSummary.tsx
│   │   │   └── settings/
│   │   │       └── SettingsDialog.tsx
│   │   ├── commands/                   # 斜杠命令系统
│   │   │   ├── registry.ts             # CommandRegistry 类
│   │   │   ├── builtin/                # 内置命令
│   │   │   │   ├── help.ts
│   │   │   │   ├── today.ts
│   │   │   │   ├── week.ts
│   │   │   │   ├── month.ts
│   │   │   │   ├── done.ts
│   │   │   │   ├── delete.ts
│   │   │   │   ├── add.ts
│   │   │   │   └── settings.ts
│   │   │   └── types.ts                # CommandDefinition, CommandContext
│   │   ├── input/                      # 输入预处理管道
│   │   │   └── pipeline.ts             # InputPipeline: 指令检测 → @ 解析 → 纯文本
│   │   ├── stores/
│   │   │   ├── taskStore.ts
│   │   │   ├── chatStore.ts
│   │   │   ├── viewStore.ts
│   │   │   └── configStore.ts
│   │   └── hooks/
│   │       ├── useIPC.ts
│   │       ├── useMention.ts
│   │       └── useNotification.ts
│   │
│   └── shared/                         # Main & Renderer 共享
│       └── types.ts                    # Task, Message, ToolCall, Config, IPC channels
│
├── resources/                          # 应用图标
│   ├── icon.ico
│   └── tray-icon.png
│
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-06-04-copy2list-design.md  # 本文档
```

---

## 12. 开发阶段规划

### Phase 1：骨架搭建
- Electron 工程初始化、窗口管理
- SQLite 初始化 + 基础 CRUD
- React 项目搭建 + 三视图骨架 + 侧边导航
- IPC 通道基础联通

### Phase 2：日历核心
- 月视图完整实现（日历网格 + 点击展开详情）
- 周视图完整实现
- 今日视图完整实现
- 任务手动 CRUD（编辑/完成/删除）

### Phase 3：AI 聊天 + 指令系统
- ToolRegistry + 8 个 Tool 实现
- ContextBuilder + DeepSeek API 对接
- ChatPanel UI（消息列表 + 输入框）
- **InputPipeline**（指令检测 + @ 解析 + 纯文本）
- @ 自动补全（MentionPopup）
- **CommandRegistry** + 8 个内置斜杠命令
- 任务锚定消息模型

### Phase 4：上下文管理
- 滑动窗口 + 折叠逻辑
- 每日压缩 + 长期记忆
- confirm_with_user 交互闭环

### Phase 5：提醒 & 托盘
- ReminderService（动态间隔轮询）
- Windows 原生通知
- 系统托盘 + 菜单
- 开机自启

### Phase 6：设置 & 打磨
- SettingsDialog（API Key / 提醒设置）
- 错误处理、加载状态
- 打包配置 + electron-builder

---

## 13. 待定项

以下项目留待后续迭代：

- [ ] 任务重复规则（每周X、每月X号）
- [ ] 任务标签/分类
- [ ] 数据导出（ICS 日历格式）
- [ ] 多语言支持
- [ ] 自动更新 (electron-updater)
- [ ] 数据统计面板
