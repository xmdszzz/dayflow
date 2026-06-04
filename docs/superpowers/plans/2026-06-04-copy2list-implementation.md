# copy2list Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows desktop todo app with calendar views (month/week/today), AI chat panel for natural language task input, and 10-minute reminder notifications.

**Architecture:** Electron app with Main Process (Node.js) handling SQLite, tools, reminders, LLM calls; Renderer Process (React) handling UI with InputPipeline for command/@ preprocessing. IPC via contextBridge connects them.

**Tech Stack:** Electron 33+, React 19, TypeScript, Tailwind CSS, shadcn/ui, better-sqlite3, Zustand, date-fns, openai SDK, electron-builder

---

## Phase 1: 项目骨架搭建

### Task 1.1: 初始化 Electron + React 工程

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `electron-builder.yml`
- Create: `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.html`, `src/renderer/main.tsx`
- Create: `electron.vite.config.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "copy2list",
  "version": "1.0.0",
  "description": "Windows desktop todo list with AI chat",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "pack": "electron-builder --dir",
    "dist": "electron-vite build && electron-builder"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "openai": "^4.70.0",
    "date-fns": "^4.0.0",
    "uuid": "^10.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "electron-vite": "^2.3.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

- [ ] **Step 2: 创建 electron.vite.config.ts**

```ts
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
      },
    },
    plugins: [react(), tailwindcss()],
  },
})
```

- [ ] **Step 3: 创建 tsconfig 文件**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./out",
    "declaration": true,
    "types": ["node"]
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*", "electron.vite.config.ts"]
}
```

`tsconfig.web.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/renderer/*"] },
    "types": ["vite/client"]
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 4: 创建 electron-builder.yml**

```yaml
appId: com.copy2list.app
productName: copy2list
directories:
  output: dist
win:
  target: nsis
  icon: resources/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

- [ ] **Step 5: 创建 src/main/index.ts（最小窗口）**

```ts
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { /* stay in tray — handled later */ })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
```

- [ ] **Step 6: 创建 src/preload/index.ts（最小 contextBridge）**

```ts
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
```

- [ ] **Step 7: 创建 src/renderer/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>copy2list</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: 创建 src/renderer/main.tsx + App.tsx（最小 React）**

`src/renderer/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`src/renderer/App.tsx`:
```tsx
function App() {
  return (
    <div className="h-screen bg-[#1e1e2e] text-[#cdd6f4] flex items-center justify-center">
      <h1 className="text-2xl font-bold">copy2list</h1>
    </div>
  )
}

export default App
```

`src/renderer/styles/globals.css`:
```css
@import "tailwindcss";
```

- [ ] **Step 9: 安装依赖并验证**

```bash
npm install
npm run dev
```

预期：Electron 窗口打开，显示 "copy2list" 暗色背景 + 白色标题。

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Electron + React + TypeScript project"
```

---

### Task 1.2: 共享类型定义

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: 创建 src/shared/types.ts**

```ts
// ============ 任务 ============
export type TaskStatus = 'pending' | 'done' | 'cancelled' | 'expired'

export interface Task {
  id: string
  date: string          // YYYY-MM-DD
  time: string          // HH:mm
  place: string
  person: string
  event: string
  status: TaskStatus
  chat_count: number
  notified: number       // 0 | 1
  created_at: string     // ISO 8601
  updated_at: string     // ISO 8601
}

export interface TaskInput {
  date: string
  time: string
  place?: string
  person?: string
  event: string
}

// ============ 聊天 ============
export interface ChatMessage {
  id: string
  task_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls: string | null   // JSON string of OpenAI tool_calls
  created_at: string
}

export interface ChatMemory {
  id: string
  date: string
  summary: string
  task_count: number
  keywords: string | null     // JSON string[]
  created_at: string
}

// ============ Tool ============
export interface ToolCall {
  id: string
  function: {
    name: string
    arguments: string         // JSON string
  }
}

export interface ToolResult {
  success: boolean
  data: unknown
  error?: string
}

// ============ Config ============
export interface AppConfig {
  api_key: string
  reminder_minutes: number
  open_at_login: boolean
  theme: 'dark' | 'light'
}

// ============ IPC 通道 ============
export const IPC_CHANNELS = {
  TASK_LIST: 'task:list',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_COMPLETE: 'task:complete',
  CHAT_SEND: 'chat:send',
  CHAT_CONFIRM: 'chat:confirm',
  CHAT_CANCEL: 'chat:cancel',
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  REMINDER_FIRE: 'reminder:on-fire',
  TOOL_CONFIRM: 'tool:confirm-required',
} as const
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared type definitions"
```

---

### Task 1.3: SQLite 数据库初始化

**Files:**
- Create: `src/main/db.ts`

- [ ] **Step 1: 创建 src/main/db.ts**

```ts
import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'copy2list.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations()
}

function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL,
      time        TEXT NOT NULL,
      place       TEXT NOT NULL DEFAULT '',
      person      TEXT NOT NULL DEFAULT '',
      event       TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      chat_count  INTEGER NOT NULL DEFAULT 0,
      notified    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id          TEXT PRIMARY KEY,
      task_id     TEXT NOT NULL,
      role        TEXT NOT NULL,
      content     TEXT NOT NULL,
      tool_calls  TEXT,
      created_at  TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS chat_memory (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL UNIQUE,
      summary     TEXT NOT NULL,
      task_count  INTEGER NOT NULL DEFAULT 0,
      keywords    TEXT,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_datetime ON tasks(date, time);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_task ON chat_messages(task_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
  `)

  // 默认配置
  const defaults: [string, string][] = [
    ['api_key', ''],
    ['reminder_minutes', '10'],
    ['open_at_login', 'false'],
    ['theme', 'dark'],
  ]
  const insert = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)')
  for (const [k, v] of defaults) insert.run(k, v)
}

// ============ Task CRUD ============
import { v4 as uuid } from 'uuid'
import type { Task, TaskInput, ChatMessage } from '../shared/types'

export function createTask(input: TaskInput): Task {
  const now = new Date().toISOString()
  const task: Task = {
    id: uuid(),
    date: input.date,
    time: input.time,
    place: input.place || '',
    person: input.person || '',
    event: input.event,
    status: 'pending',
    chat_count: 0,
    notified: 0,
    created_at: now,
    updated_at: now,
  }
  db.prepare(`INSERT INTO tasks (id,date,time,place,person,event,status,chat_count,notified,created_at,updated_at)
    VALUES (@id,@date,@time,@place,@person,@event,@status,@chat_count,@notified,@created_at,@updated_at)`).run(task)
  return task
}

export function updateTask(id: string, patch: Partial<Pick<Task, 'date'|'time'|'place'|'person'|'event'|'status'>>): Task | null {
  const sets: string[] = []
  const vals: Record<string, unknown> = { id }
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) { sets.push(`${k}=@${k}`); vals[k] = v }
  }
  if (sets.length === 0) return getTask(id)
  sets.push("updated_at=@now")
  vals.now = new Date().toISOString()
  db.prepare(`UPDATE tasks SET ${sets.join(',')} WHERE id=@id`).run(vals)
  return getTask(id)
}

export function getTask(id: string): Task | null {
  return db.prepare('SELECT * FROM tasks WHERE id=?').get(id) as Task | null
}

export function listTasks(startDate: string, endDate: string): Task[] {
  return db.prepare('SELECT * FROM tasks WHERE date>=? AND date<=? ORDER BY date, time').all(startDate, endDate) as Task[]
}

export function getPendingTasks(): Task[] {
  return db.prepare("SELECT * FROM tasks WHERE status='pending' ORDER BY date, time").all() as Task[]
}

export function getTasksDueIn(minutes: number): Task[] {
  return db.prepare(`
    SELECT * FROM tasks
    WHERE status='pending' AND notified=0
      AND datetime(date || ' ' || time) <= datetime('now', '+' || ? || ' minutes')
      AND datetime(date || ' ' || time) > datetime('now')
  `).all(minutes) as Task[]
}

export function getNextReminderTime(): Date | null {
  const row = db.prepare(`
    SELECT MIN(datetime(date || ' ' || time)) as dt
    FROM tasks WHERE status='pending' AND notified=0
      AND datetime(date || ' ' || time) > datetime('now')
  `).get() as { dt: string | null }
  return row?.dt ? new Date(row.dt) : null
}

export function markNotified(id: string): void {
  db.prepare("UPDATE tasks SET notified=1 WHERE id=?").run(id)
}

// ============ Chat Messages ============
export function addChatMessage(task_id: string, role: string, content: string, tool_calls?: string): ChatMessage {
  const msg: ChatMessage = {
    id: uuid(), task_id, role: role as ChatMessage['role'], content,
    tool_calls: tool_calls || null, created_at: new Date().toISOString(),
  }
  db.prepare('INSERT INTO chat_messages (id,task_id,role,content,tool_calls,created_at) VALUES (@id,@task_id,@role,@content,@tool_calls,@created_at)').run(msg)
  db.prepare('UPDATE tasks SET chat_count=chat_count+1 WHERE id=?').run(task_id)
  return msg
}

export function getActiveTaskMessages(limit: number): ChatMessage[] {
  return db.prepare(`
    SELECT cm.* FROM chat_messages cm
    JOIN tasks t ON cm.task_id=t.id
    WHERE t.status='pending'
      AND datetime(t.date || ' ' || t.time) > datetime('now')
    ORDER BY cm.created_at DESC LIMIT ?
  `).all(limit) as ChatMessage[]
}

export function getMessagesByTask(taskId: string): ChatMessage[] {
  return db.prepare('SELECT * FROM chat_messages WHERE task_id=? ORDER BY created_at').all(taskId) as ChatMessage[]
}

export function getMessagesForDate(date: string): ChatMessage[] {
  return db.prepare(`
    SELECT cm.* FROM chat_messages cm
    JOIN tasks t ON cm.task_id=t.id
    WHERE t.date=? ORDER BY cm.created_at
  `).all(date) as ChatMessage[]
}

// ============ Chat Memory ============
export function getMemories(days: number): ChatMemory[] {
  return db.prepare('SELECT * FROM chat_memory ORDER BY date DESC LIMIT ?').all(days) as ChatMemory[]
}

export function saveMemory(memory: Omit<ChatMemory, 'id' | 'created_at'>): void {
  const id = uuid()
  const now = new Date().toISOString()
  db.prepare('INSERT OR REPLACE INTO chat_memory (id,date,summary,task_count,keywords,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, memory.date, memory.summary, memory.task_count, memory.keywords, now)
}

// ============ Config ============
export function getConfig(key: string): string {
  const row = db.prepare('SELECT value FROM config WHERE key=?').get(key) as { value: string } | undefined
  return row?.value ?? ''
}

export function setConfig(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value)
}

export function getDatabase(): Database.Database {
  return db
}
```

- [ ] **Step 2: 在 main/index.ts 中调用 initDatabase**

```ts
// 在 app.whenReady() 回调中，createWindow() 之前添加:
import { initDatabase } from './db'
initDatabase()
```

- [ ] **Step 3: Commit**

```bash
git add src/main/db.ts src/main/index.ts
git commit -m "feat: add SQLite database with full schema and CRUD"
```

---

### Task 1.4: IPC 处理器 + preload 暴露

**Files:**
- Create: `src/main/ipc-handlers.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

- [ ] **Step 1: 创建 src/main/ipc-handlers.ts**

```ts
import { ipcMain } from 'electron'
import { createTask, updateTask, getTask, listTasks, addChatMessage, getConfig, setConfig, getDatabase } from './db'
import type { TaskInput } from '../shared/types'

export function registerIpcHandlers(): void {
  ipcMain.handle('task:list', (_e, startDate: string, endDate: string) => {
    return listTasks(startDate, endDate)
  })

  ipcMain.handle('task:create', (_e, input: TaskInput) => {
    return createTask(input)
  })

  ipcMain.handle('task:update', (_e, id: string, patch: Record<string, unknown>) => {
    return updateTask(id, patch)
  })

  ipcMain.handle('task:delete', (_e, id: string) => {
    return updateTask(id, { status: 'cancelled' })
  })

  ipcMain.handle('task:complete', (_e, id: string) => {
    return updateTask(id, { status: 'done' })
  })

  ipcMain.handle('config:get', (_e, key: string) => {
    return getConfig(key)
  })

  ipcMain.handle('config:set', (_e, key: string, value: string) => {
    return setConfig(key, value)
  })
}
```

- [ ] **Step 2: 在 main/index.ts 注册 IPC**

```ts
// 在 initDatabase() 之后添加:
import { registerIpcHandlers } from './ipc-handlers'
registerIpcHandlers()
```

- [ ] **Step 3: 更新 preload/index.ts 暴露全部通道**

```ts
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
```

- [ ] **Step 4: 在 renderer 中创建 API 类型声明**

`src/renderer/types/electron.d.ts`:
```ts
export {}

declare global {
  interface Window {
    api: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc-handlers.ts src/main/index.ts src/preload/index.ts src/renderer/types/
git commit -m "feat: add IPC handlers and preload API bridge"
```

---

### Task 1.5: React UI 骨架 — 布局 + 侧边栏 + 三视图占位

**Files:**
- Create: `src/renderer/components/layout/TitleBar.tsx`
- Create: `src/renderer/components/layout/Sidebar.tsx`
- Create: `src/renderer/components/layout/MainLayout.tsx`
- Create: `src/renderer/components/calendar/MonthView.tsx`
- Create: `src/renderer/components/calendar/WeekView.tsx`
- Create: `src/renderer/components/calendar/TodayView.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: TitleBar**

`src/renderer/components/layout/TitleBar.tsx`:
```tsx
export default function TitleBar() {
  return (
    <div className="h-8 bg-[#11111b] flex items-center px-3 drag-region select-none">
      <span className="text-[#a6adc8] text-xs font-medium">copy2list</span>
    </div>
  )
}
```

- [ ] **Step 2: Sidebar**

`src/renderer/components/layout/Sidebar.tsx`:
```tsx
import { Calendar, Columns, Sun, Settings } from 'lucide-react'

type ViewType = 'month' | 'week' | 'today'

interface SidebarProps {
  currentView: ViewType
  onNavigate: (view: ViewType) => void
  onSettings: () => void
}

export default function Sidebar({ currentView, onNavigate, onSettings }: SidebarProps) {
  const items: { id: ViewType; icon: typeof Calendar; label: string }[] = [
    { id: 'month', icon: Calendar, label: '月视图' },
    { id: 'week', icon: Columns, label: '周视图' },
    { id: 'today', icon: Sun, label: '今日' },
  ]

  return (
    <div className="w-14 bg-[#11111b] flex flex-col items-center py-3 gap-2">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors
            ${currentView === id ? 'bg-[#cba6f7] text-[#1e1e2e]' : 'text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#313244]'}`}
          title={label}
        >
          <Icon size={20} />
        </button>
      ))}
      <div className="mt-auto">
        <button
          onClick={onSettings}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#313244] transition-colors"
          title="设置"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 三视图占位**

`src/renderer/components/calendar/MonthView.tsx`:
```tsx
export default function MonthView() {
  return <div className="flex-1 p-4 text-[#a6adc8]">月视图 — 开发中</div>
}
```

`src/renderer/components/calendar/WeekView.tsx`:
```tsx
export default function WeekView() {
  return <div className="flex-1 p-4 text-[#a6adc8]">周视图 — 开发中</div>
}
```

`src/renderer/components/calendar/TodayView.tsx`:
```tsx
export default function TodayView() {
  return <div className="flex-1 p-4 text-[#a6adc8]">今日 — 开发中</div>
}
```

- [ ] **Step 4: MainLayout**

`src/renderer/components/layout/MainLayout.tsx`:
```tsx
import { useState } from 'react'
import Sidebar from './Sidebar'
import MonthView from '../calendar/MonthView'
import WeekView from '../calendar/WeekView'
import TodayView from '../calendar/TodayView'

type ViewType = 'month' | 'week' | 'today'

export default function MainLayout() {
  const [view, setView] = useState<ViewType>('today')

  return (
    <div className="flex-1 flex">
      <Sidebar currentView={view} onNavigate={setView} onSettings={() => {}} />
      <div className="flex-1 flex">
        {view === 'month' && <MonthView />}
        {view === 'week' && <WeekView />}
        {view === 'today' && <TodayView />}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 更新 App.tsx**

```tsx
import TitleBar from './components/layout/TitleBar'
import MainLayout from './components/layout/MainLayout'

function App() {
  return (
    <div className="h-screen bg-[#1e1e2e] text-[#cdd6f4] flex flex-col overflow-hidden">
      <TitleBar />
      <MainLayout />
    </div>
  )
}

export default App
```

- [ ] **Step 6: 安装 lucide-react 图标库**

```bash
npm install lucide-react
```

- [ ] **Step 7: 验证 — `npm run dev`，检查三个视图可切换**

- [ ] **Step 8: Commit**

```bash
git add src/renderer/
git commit -m "feat: add layout shell with sidebar navigation and view placeholders"
```

---

## Phase 2: 日历核心

### Task 2.1: Zustand Stores（taskStore, viewStore, configStore）

**Files:**
- Create: `src/renderer/stores/viewStore.ts`
- Create: `src/renderer/stores/taskStore.ts`
- Create: `src/renderer/stores/configStore.ts`

- [ ] **Step 1: viewStore**

`src/renderer/stores/viewStore.ts`:
```ts
import { create } from 'zustand'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, addWeeks, subMonths, subWeeks } from 'date-fns'

export type ViewType = 'month' | 'week' | 'today'

interface ViewState {
  view: ViewType
  currentDate: Date

  setView: (v: ViewType) => void
  goNext: () => void
  goPrev: () => void
  goToday: () => void

  // 派生数据
  monthRange: () => { start: string; end: string }
  weekRange: () => { start: string; end: string }
}

export const useViewStore = create<ViewState>((set, get) => ({
  view: 'today',
  currentDate: new Date(),

  setView: (v) => set({ view: v, currentDate: new Date() }),

  goNext: () => set((s) => ({
    currentDate: s.view === 'month' ? addMonths(s.currentDate, 1)
      : s.view === 'week' ? addWeeks(s.currentDate, 1) : s.currentDate,
  })),

  goPrev: () => set((s) => ({
    currentDate: s.view === 'month' ? subMonths(s.currentDate, 1)
      : s.view === 'week' ? subWeeks(s.currentDate, 1) : s.currentDate,
  })),

  goToday: () => set({ currentDate: new Date(), view: 'today' }),

  monthRange: () => {
    const d = get().currentDate
    return {
      start: formatDate(startOfMonth(d)),
      end: formatDate(endOfMonth(d)),
    }
  },

  weekRange: () => {
    const d = get().currentDate
    return {
      start: formatDate(startOfWeek(d, { weekStartsOn: 1 })),
      end: formatDate(endOfWeek(d, { weekStartsOn: 1 })),
    }
  },
}))

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 2: taskStore**

`src/renderer/stores/taskStore.ts`:
```ts
import { create } from 'zustand'
import type { Task, TaskInput } from '../../shared/types'

interface TaskState {
  tasks: Task[]
  selectedDate: string | null
  loading: boolean

  loadTasks: (start: string, end: string) => Promise<void>
  addTask: (input: TaskInput) => Promise<Task>
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<void>
  selectDate: (date: string) => void
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedDate: null,
  loading: false,

  loadTasks: async (start, end) => {
    set({ loading: true })
    const tasks = await window.api.invoke('task:list', start, end) as Task[]
    set({ tasks, loading: false })
  },

  addTask: async (input) => {
    const task = await window.api.invoke('task:create', input) as Task
    set((s) => ({ tasks: [...s.tasks, task] }))
    return task
  },

  updateTask: async (id, patch) => {
    await window.api.invoke('task:update', id, patch)
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  },

  deleteTask: async (id) => {
    await window.api.invoke('task:delete', id)
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },

  completeTask: async (id) => {
    await window.api.invoke('task:complete', id)
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: 'done' as const } : t)),
    }))
  },

  selectDate: (date) => set({ selectedDate: date }),
}))
```

- [ ] **Step 3: configStore**

`src/renderer/stores/configStore.ts`:
```ts
import { create } from 'zustand'
import type { AppConfig } from '../../shared/types'

interface ConfigState {
  config: AppConfig
  loaded: boolean
  load: () => Promise<void>
  set: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => Promise<void>
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: { api_key: '', reminder_minutes: 10, open_at_login: false, theme: 'dark' },
  loaded: false,

  load: async () => {
    const keys: (keyof AppConfig)[] = ['api_key', 'reminder_minutes', 'open_at_login', 'theme']
    const config: AppConfig = {} as AppConfig
    for (const k of keys) {
      const v = await window.api.invoke('config:get', k) as string
      ;(config as Record<string, unknown>)[k] = k === 'reminder_minutes' ? parseInt(v) || 10
        : k === 'open_at_login' ? v === 'true' : v
    }
    set({ config, loaded: true })
  },

  set: async (key, value) => {
    await window.api.invoke('config:set', key, String(value))
    set((s) => ({ config: { ...s.config, [key]: value } }))
  },
}))
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/stores/
git commit -m "feat: add Zustand stores for tasks, views, and config"
```

---

### Task 2.2: 月视图 — MonthGrid + DayCell + DayDetailPanel

**Files:**
- Create: `src/renderer/components/calendar/DayCell.tsx`
- Create: `src/renderer/components/calendar/DayDetailPanel.tsx`
- Create: `src/renderer/components/calendar/TaskRow.tsx`
- Modify: `src/renderer/components/calendar/MonthView.tsx`
- Modify: `src/renderer/components/layout/MainLayout.tsx` (wire stores)

- [ ] **Step 1: 重写 MonthView.tsx**

```tsx
import { useEffect, useMemo } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday } from 'date-fns'
import { useViewStore } from '@/stores/viewStore'
import { useTaskStore } from '@/stores/taskStore'
import DayCell from './DayCell'
import DayDetailPanel from './DayDetailPanel'

export default function MonthView() {
  const { currentDate, goNext, goPrev, monthRange } = useViewStore()
  const { tasks, loadTasks, selectedDate } = useTaskStore()

  const range = monthRange()

  useEffect(() => { loadTasks(range.start, range.end) }, [currentDate])

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  const tasksByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) { map[t.date] = (map[t.date] || 0) + 1 }
    return map
  }, [tasks])

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={goPrev} className="text-[#a6adc8] hover:text-[#cdd6f4] text-lg">◀</button>
        <h2 className="text-lg font-semibold">{format(currentDate, 'yyyy年M月')}</h2>
        <button onClick={goNext} className="text-[#a6adc8] hover:text-[#cdd6f4] text-lg">▶</button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-[#6c7086] mb-1">
        {['一','二','三','四','五','六','日'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 flex-1 gap-px bg-[#313244] rounded-lg overflow-hidden">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            date={day}
            taskCount={tasksByDate[format(day, 'yyyy-MM-dd')] || 0}
            isCurrentMonth={isSameMonth(day, currentDate)}
            isToday={isToday(day)}
          />
        ))}
      </div>
      {selectedDate && <DayDetailPanel date={selectedDate} tasks={tasks.filter((t) => t.date === selectedDate)} />}
    </div>
  )
}
```

- [ ] **Step 2: DayCell.tsx**

```tsx
import { format } from 'date-fns'
import { useTaskStore } from '@/stores/taskStore'

interface DayCellProps {
  date: Date
  taskCount: number
  isCurrentMonth: boolean
  isToday: boolean
}

export default function DayCell({ date, taskCount, isCurrentMonth, isToday }: DayCellProps) {
  const { selectDate } = useTaskStore()
  const dateStr = format(date, 'yyyy-MM-dd')

  return (
    <button
      onClick={() => dateStr && selectDate(dateStr)}
      className={`bg-[#1e1e2e] p-1.5 flex flex-col items-center gap-0.5 min-h-[60px] transition-colors hover:bg-[#313244] ${
        !isCurrentMonth ? 'opacity-30' : ''
      }`}
    >
      <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
        isToday ? 'bg-[#cba6f7] text-[#1e1e2e] font-bold' : 'text-[#cdd6f4]'
      }`}>
        {format(date, 'd')}
      </span>
      {taskCount > 0 && (
        <span className="text-[10px] text-[#a6adc8] bg-[#313244] px-1 rounded">{taskCount}</span>
      )}
    </button>
  )
}
```

- [ ] **Step 3: DayDetailPanel.tsx**

```tsx
import type { Task } from '../../../shared/types'
import TaskRow from './TaskRow'

interface DayDetailPanelProps {
  date: string
  tasks: Task[]
}

export default function DayDetailPanel({ date, tasks }: DayDetailPanelProps) {
  return (
    <div className="border-t border-[#313244] mt-3 pt-3">
      <h3 className="text-sm font-semibold mb-2">{date}</h3>
      {tasks.length === 0
        ? <p className="text-xs text-[#6c7086]">暂无日程</p>
        : tasks.map((t) => <TaskRow key={t.id} task={t} />)}
    </div>
  )
}
```

- [ ] **Step 4: TaskRow.tsx**

```tsx
import type { Task } from '../../../shared/types'
import { useTaskStore } from '@/stores/taskStore'

const COLORS = ['#f38ba8', '#89b4fa', '#a6e3a1', '#fab387', '#cba6f7', '#f9e2af']

export default function TaskRow({ task }: { task: Task }) {
  const { completeTask, deleteTask } = useTaskStore()
  const colorIdx = task.id.charCodeAt(0) % COLORS.length
  const done = task.status === 'done'

  return (
    <div className={`flex items-center gap-3 py-1.5 px-2 rounded text-xs ${
      done ? 'opacity-40 line-through' : 'hover:bg-[#313244]'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[colorIdx] }} />
      <span className="w-12 flex-shrink-0 text-[#a6adc8]">{task.time}</span>
      <span className="w-20 truncate">{task.place || '—'}</span>
      <span className="w-16 truncate">{task.person || '—'}</span>
      <span className="flex-1 truncate">{task.event}</span>
      {!done && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => completeTask(task.id)} className="text-[#a6e3a1] hover:bg-[#45475a] px-1 rounded">✓</button>
          <button onClick={() => deleteTask(task.id)} className="text-[#f38ba8] hover:bg-[#45475a] px-1 rounded">✕</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 更新 MainLayout 连接 store**

```tsx
import { useViewStore } from '@/stores/viewStore'
import { useConfigStore } from '@/stores/configStore'
import { useEffect } from 'react'

// 在 MainLayout 组件开头添加:
const setView = useViewStore((s) => s.setView)
const loadConfig = useConfigStore((s) => s.load)
useEffect(() => { loadConfig() }, [])
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/calendar/ src/renderer/components/layout/MainLayout.tsx
git commit -m "feat: implement month view with day grid and task list"
```

---

### Task 2.3: 周视图 + 今日视图

**Files:**
- Modify: `src/renderer/components/calendar/WeekView.tsx`
- Create: `src/renderer/components/calendar/TaskCard.tsx`
- Modify: `src/renderer/components/calendar/TodayView.tsx`

- [ ] **Step 1: 重写 WeekView**

```tsx
import { useEffect, useMemo } from 'react'
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns'
import { useViewStore } from '@/stores/viewStore'
import { useTaskStore } from '@/stores/taskStore'
import { isToday } from 'date-fns'

export default function WeekView() {
  const { currentDate, goNext, goPrev, weekRange } = useViewStore()
  const { tasks, loadTasks } = useTaskStore()
  const range = weekRange()

  useEffect(() => { loadTasks(range.start, range.end) }, [currentDate])

  const days = useMemo(() => {
    const s = startOfWeek(currentDate, { weekStartsOn: 1 })
    const e = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: s, end: e })
  }, [currentDate])

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof tasks> = {}
    for (const d of days) {
      const key = format(d, 'yyyy-MM-dd')
      map[key] = tasks.filter((t) => t.date === key)
    }
    return map
  }, [tasks, days])

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={goPrev} className="text-[#a6adc8] hover:text-[#cdd6f4] text-lg">◀</button>
        <h2 className="text-lg font-semibold">
          {format(days[0], 'M月d日')} — {format(days[6], 'M月d日')}
        </h2>
        <button onClick={goNext} className="text-[#a6adc8] hover:text-[#cdd6f4] text-lg">▶</button>
      </div>
      <div className="flex-1 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDate[key] || []
          return (
            <div key={key} className={`flex flex-col rounded-lg p-2 ${
              isToday(day) ? 'bg-[#313244] border border-[#cba6f7]' : 'bg-[#181825]'
            }`}>
              <div className="text-xs text-[#6c7086] mb-2">
                <span>{format(day, 'EEE')}</span>
                <span className={`ml-1 font-bold ${isToday(day) ? 'text-[#cba6f7]' : 'text-[#cdd6f4]'}`}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {dayTasks.map((t) => (
                  <div key={t.id} className="text-[10px] bg-[#45475a] rounded px-1.5 py-0.5 truncate">
                    {t.time} {t.event}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TaskCard.tsx**

```tsx
import type { Task } from '../../../shared/types'
import { useTaskStore } from '@/stores/taskStore'

const COLORS = ['#f38ba8', '#89b4fa', '#a6e3a1', '#fab387', '#cba6f7', '#f9e2af']

export default function TaskCard({ task }: { task: Task }) {
  const { completeTask } = useTaskStore()
  const colorIdx = task.id.charCodeAt(0) % COLORS.length
  const done = task.status === 'done'

  return (
    <div className={`bg-[#313244] rounded-lg p-3 border-l-2 ${done ? 'opacity-40' : ''}`}
         style={{ borderLeftColor: COLORS[colorIdx] }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">{task.time}</span>
        {!done && (
          <button onClick={() => completeTask(task.id)}
            className="text-xs text-[#a6e3a1] bg-[#45475a] hover:bg-[#585b70] px-2 py-0.5 rounded">
            ✓ 完成
          </button>
        )}
      </div>
      <h4 className="font-medium mb-1">{task.event}</h4>
      <div className="text-xs text-[#a6adc8] flex gap-4">
        {task.place && <span>📍 {task.place}</span>}
        {task.person && <span>👤 {task.person}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 重写 TodayView**

```tsx
import { useEffect } from 'react'
import { format, isToday } from 'date-fns'
import { useTaskStore } from '@/stores/taskStore'
import TaskCard from './TaskCard'

export default function TodayView() {
  const { tasks, loadTasks } = useTaskStore()
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => { loadTasks(today, today) }, [])

  const todayTasks = tasks.filter((t) => t.date === today).sort((a, b) => a.time.localeCompare(b.time))
  const pending = todayTasks.filter((t) => t.status === 'pending')
  const done = todayTasks.filter((t) => t.status === 'done')

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold">
          {format(new Date(), 'yyyy年M月d日')}
          <span className="text-sm font-normal text-[#a6adc8] ml-2">
            {format(new Date(), 'EEEE')}
          </span>
        </h2>
        <p className="text-xs text-[#6c7086] mt-1">{pending.length} 个待办</p>
      </div>
      <div className="space-y-3">
        {pending.map((t) => <TaskCard key={t.id} task={t} />)}
      </div>
      {done.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm text-[#6c7086] mb-3">已完成 ({done.length})</h3>
          <div className="space-y-2 opacity-60">
            {done.map((t) => <TaskCard key={t.id} task={t} />)}
          </div>
        </div>
      )}
      {todayTasks.length === 0 && (
        <p className="text-[#6c7086] text-sm mt-20 text-center">今天没有日程，在聊天面板里添加吧</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/calendar/
git commit -m "feat: implement week view and today view"
```

---

## Phase 3: AI 聊天 + 指令系统

### Task 3.1: ToolRegistry + 全部 8 个 Tool

**Files:**
- Create: `src/main/tools/registry.ts`
- Create: `src/main/tools/task-tools.ts`
- Create: `src/main/tools/system-tools.ts`
- Create: `src/main/tools/interact-tools.ts`

- [ ] **Step 1: registry.ts**

```ts
import type { ToolResult } from '../../shared/types'

interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
  handler: (args: Record<string, unknown>) => Promise<ToolResult>
  requiresConfirmation?: boolean
}

class ToolRegistry {
  private tools = new Map<string, ToolDef>()

  register(tool: ToolDef): void { this.tools.set(tool.name, tool) }

  getOpenAITools(): object[] {
    return Array.from(this.tools.values()).map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }))
  }

  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) return { success: false, data: null, error: `Unknown tool: ${name}` }
    // 需要确认的 tool 不直接执行，返回 pending 状态
    if (tool.requiresConfirmation) {
      return { success: true, data: { pending_confirmation: true, tool: name, args } }
    }
    return tool.handler(args)
  }

  getTool(name: string): ToolDef | undefined { return this.tools.get(name) }
}

export const toolRegistry = new ToolRegistry()
export type { ToolDef }
```

- [ ] **Step 2: task-tools.ts**

```ts
import { v4 as uuid } from 'uuid'
import { toolRegistry } from './registry'
import { createTask, updateTask, getTask, addChatMessage, listTasks, getDatabase } from '../db'
import type { TaskInput } from '../../shared/types'

toolRegistry.register({
  name: 'add_task',
  description: '创建一个新的日程任务',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: '日期 YYYY-MM-DD 绝对值' },
      time: { type: 'string', description: '时间 HH:mm 24小时制' },
      event: { type: 'string', description: '事件描述' },
      place: { type: 'string', description: '地点（可选）' },
      person: { type: 'string', description: '人物（可选）' },
    },
    required: ['date', 'time', 'event'],
  },
  async handler(args) {
    const task = createTask(args as unknown as TaskInput)
    return { success: true, data: { task_id: task.id, task } }
  },
})

toolRegistry.register({
  name: 'update_task',
  description: '修改已有任务。需提供 task_id 和要修改的字段',
  parameters: {
    type: 'object',
    properties: {
      task_id: { type: 'string', description: '任务 ID' },
      date: { type: 'string', description: '新日期 YYYY-MM-DD' },
      time: { type: 'string', description: '新时间 HH:mm' },
      place: { type: 'string', description: '新地点' },
      person: { type: 'string', description: '新人物' },
      event: { type: 'string', description: '新事件' },
    },
    required: ['task_id'],
  },
  async handler(args) {
    const { task_id, ...patch } = args as Record<string, unknown>
    const task = updateTask(task_id, patch)
    if (!task) return { success: false, data: null, error: 'Task not found' }
    return { success: true, data: { task_id, task } }
  },
})

toolRegistry.register({
  name: 'delete_task',
  description: '删除/取消一个任务',
  parameters: {
    type: 'object',
    properties: { task_id: { type: 'string', description: '任务 ID' } },
    required: ['task_id'],
  },
  requiresConfirmation: true,
  async handler(args) {
    const { task_id } = args as Record<string, string>
    const task = updateTask(task_id, { status: 'cancelled' })
    return { success: true, data: { task_id, task } }
  },
})

toolRegistry.register({
  name: 'query_tasks',
  description: '按条件查询日程列表',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: '查询特定日期 YYYY-MM-DD' },
      start_date: { type: 'string', description: '起始日期' },
      end_date: { type: 'string', description: '结束日期' },
      status: { type: 'string', enum: ['pending', 'done', 'cancelled'] },
      keyword: { type: 'string', description: '搜索关键词' },
    },
  },
  async handler(args) {
    const { date, start_date, end_date, status } = args as Record<string, string>
    const db = getDatabase()
    let sql = 'SELECT * FROM tasks WHERE 1=1'
    const params: unknown[] = []
    if (date) { sql += ' AND date=?'; params.push(date) }
    if (start_date && end_date) { sql += ' AND date>=? AND date<=?'; params.push(start_date, end_date) }
    if (status) { sql += ' AND status=?'; params.push(status) }
    sql += ' ORDER BY date, time'
    const tasks = db.prepare(sql).all(...params)
    return { success: true, data: { tasks, count: (tasks as unknown[]).length } }
  },
})

toolRegistry.register({
  name: 'complete_task',
  description: '标记任务为已完成',
  parameters: {
    type: 'object',
    properties: { task_id: { type: 'string', description: '任务 ID' } },
    required: ['task_id'],
  },
  async handler(args) {
    const { task_id } = args as Record<string, string>
    const task = updateTask(task_id, { status: 'done' })
    return { success: true, data: { task_id, task } }
  },
})
```

- [ ] **Step 3: system-tools.ts**

```ts
import { addDays, addWeeks, addMonths, nextDay, format as fmtDate } from 'date-fns'
import { toolRegistry } from './registry'

toolRegistry.register({
  name: 'get_now',
  description: '获取当前日期时间。作为所有日期计算的基准。',
  parameters: { type: 'object', properties: {} },
  async handler() {
    const now = new Date()
    return {
      success: true,
      data: {
        datetime: now.toISOString(),
        date: fmtDate(now, 'yyyy-MM-dd'),
        time: fmtDate(now, 'HH:mm'),
        weekday: '周' + ['日','一','二','三','四','五','六'][now.getDay()],
      },
    }
  },
})

// resolve_date — 中文日期表达式 → 绝对日期
const WEEKDAY_MAP: Record<string, number> = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':0,'天':0 }

function resolveExpr(expr: string, ref: Date): string {
  const p: [RegExp, () => string][] = [
    [/^今天$/,   () => fmtDate(ref, 'yyyy-MM-dd')],
    [/^明天$/,   () => fmtDate(addDays(ref, 1), 'yyyy-MM-dd')],
    [/^后天$/,   () => fmtDate(addDays(ref, 2), 'yyyy-MM-dd')],
    [/^大后天$/, () => fmtDate(addDays(ref, 3), 'yyyy-MM-dd')],
    [/^昨天$/,   () => fmtDate(addDays(ref, -1), 'yyyy-MM-dd')],
    [/^前天$/,   () => fmtDate(addDays(ref, -2), 'yyyy-MM-dd')],
  ]
  for (const [re, fn] of p) { if (re.test(expr)) return fn() }

  // 下周三 / 下周二
  const weekMatch = expr.match(/^(上|下)?周([一二三四五六日天])$/)
  if (weekMatch) {
    const offset = weekMatch[1] === '上' ? -1 : weekMatch[1] === '下' ? 1 : 0
    const target = WEEKDAY_MAP[weekMatch[2]] ?? 0
    const d = addWeeks(nextDay(ref, target), offset)
    return fmtDate(d, 'yyyy-MM-dd')
  }

  // 下个月X号
  const monthMatch = expr.match(/^(上|下)?个?月(\d{1,2})?号?$/)
  if (monthMatch) {
    const offset = monthMatch[1] === '上' ? -1 : monthMatch[1] === '下' ? 1 : 0
    const day = monthMatch[2] ? parseInt(monthMatch[2]) : fmtDate(ref, 'd')
    const d = addMonths(ref, offset)
    d.setDate(Math.min(parseInt(day as unknown as string), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
    return fmtDate(d, 'yyyy-MM-dd')
  }

  throw new Error(`Cannot resolve date expression: ${expr}`)
}

toolRegistry.register({
  name: 'resolve_date',
  description: '将中文相对日期表达解析为绝对日期 YYYY-MM-DD。支持：今天/明天/后天/大后天/昨天/前天/下周三/上周五/下个月5号等。严禁自行计算日期，必须调用此工具。',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: '中文相对日期表达，如"明天""下周三"' },
      reference_date: { type: 'string', description: '基准日期 YYYY-MM-DD，默认今天' },
    },
    required: ['expression'],
  },
  async handler(args) {
    const { expression, reference_date } = args as Record<string, string>
    const ref = reference_date ? new Date(reference_date) : new Date()
    try {
      const date = resolveExpr(expression, ref)
      return { success: true, data: { date, expression } }
    } catch {
      return { success: false, data: null, error: `Cannot resolve: ${expression}` }
    }
  },
})
```

- [ ] **Step 4: interact-tools.ts**

```ts
import { toolRegistry } from './registry'

let pendingConfirmation: {
  resolve: (value: { user_choice: string; confirmed: boolean }) => void
} | null = null

toolRegistry.register({
  name: 'confirm_with_user',
  description: '无法确定用户意图时请求确认。列出候选任务让用户选择。',
  parameters: {
    type: 'object',
    properties: {
      question: { type: 'string', description: '向用户提问的问题' },
      options: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            task_id: { type: 'string' },
            summary: { type: 'string' },
          },
        },
        description: '候选任务列表',
      },
    },
    required: ['question', 'options'],
  },
  async handler(args) {
    const { question, options } = args as Record<string, unknown>
    // 通过 IPC 发送确认请求到 Renderer
    return new Promise((resolve) => {
      pendingConfirmation = { resolve }
      const { BrowserWindow } = require('electron')
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('tool:confirm-required', { question, options })
    })
  },
})

export function resolveConfirmation(choice: string): void {
  if (pendingConfirmation) {
    pendingConfirmation.resolve({ user_choice: choice, confirmed: true })
    pendingConfirmation = null
  }
}

export function cancelConfirmation(): void {
  if (pendingConfirmation) {
    pendingConfirmation.resolve({ user_choice: '', confirmed: false })
    pendingConfirmation = null
  }
}
```

需要确保所有 tool 文件被 import（在 main/index.ts 中添加）:

```ts
import './tools/task-tools'
import './tools/system-tools'
import './tools/interact-tools'
```

- [ ] **Step 5: Commit**

```bash
git add src/main/tools/
git commit -m "feat: implement ToolRegistry with 8 tools"
```

---

### Task 3.2: LLM 服务 — ContextBuilder + DeepSeek 调用

**Files:**
- Create: `src/main/llm.ts`

- [ ] **Step 1: 创建 src/main/llm.ts**

```ts
import OpenAI from 'openai'
import { getActiveTaskMessages, getMessagesByTask, getMemories, getConfig, addChatMessage } from './db'
import { toolRegistry } from './tools/registry'
import type { ChatMessage } from '../shared/types'

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
    messages.push({
      role: 'system',
      content: `近期记忆：${recentMemories.map((m) => m.summary).join('\n')}`,
    })
  }

  // 活跃消息
  for (const m of activeMessages.reverse()) {
    messages.push({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })
  }

  // 当前任务上下文
  const seen = new Set(activeMessages.map((m) => m.id))
  for (const m of currentTaskMsgs) {
    if (!seen.has(m.id)) {
      messages.push({ role: m.role as 'user' | 'assistant', content: m.content })
    }
  }

  messages.push({ role: 'user', content: userMessage })
  return messages
}

export async function sendChatMessage(
  userMessage: string,
  explicitTaskId?: string,
): Promise<{ reply: string; toolResults: unknown[] }> {
  const apiKey = getConfig('api_key')
  if (!apiKey) return { reply: '请先在设置中配置 DeepSeek API Key', toolResults: [] }

  const openai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey })
  const messages = buildContext(userMessage, explicitTaskId)
  const tools = toolRegistry.getOpenAITools()

  const toolResults: unknown[] = []

  // 支持多轮 tool call
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
      messages.push({
        role: 'assistant',
        content: choice.message.content || '',
        tool_calls: choice.message.tool_calls,
      })

      for (const tc of choice.message.tool_calls) {
        const args = JSON.parse(tc.function.arguments)
        const result = await toolRegistry.execute(tc.function.name, args)
        toolResults.push({ tool: tc.function.name, args, result })

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        })
      }
    }
  }

  return { reply: '操作完成', toolResults }
}
```

- [ ] **Step 2: 在 ipc-handlers.ts 注册 chat:send handler**

```ts
// 在 ipc-handlers.ts 中添加:
import { sendChatMessage } from './llm'

ipcMain.handle('chat:send', async (_e, userMessage: string, explicitTaskId?: string) => {
  return sendChatMessage(userMessage, explicitTaskId)
})
```

- [ ] **Step 3: Commit**

```bash
git add src/main/llm.ts src/main/ipc-handlers.ts
git commit -m "feat: implement LLM service with ContextBuilder and DeepSeek integration"
```

---

### Task 3.3: ChatPanel UI + @ 自动补全

**Files:**
- Create: `src/renderer/stores/chatStore.ts`
- Create: `src/renderer/components/chat/ChatPanel.tsx`
- Create: `src/renderer/components/chat/MessageList.tsx`
- Create: `src/renderer/components/chat/TaskGroup.tsx`
- Create: `src/renderer/components/chat/ChatInput.tsx`
- Create: `src/renderer/components/chat/MentionPopup.tsx`
- Create: `src/renderer/components/chat/FoldedSummary.tsx`
- Modify: `src/renderer/components/layout/MainLayout.tsx` (add ChatPanel)

- [ ] **Step 1: chatStore**

`src/renderer/stores/chatStore.ts`:
```ts
import { create } from 'zustand'

interface ChatState {
  messages: { role: 'user' | 'assistant'; content: string }[]
  loading: boolean
  pendingConfirm: { question: string; options: { label: string; task_id: string; summary: string }[] } | null

  sendMessage: (text: string) => Promise<void>
  confirmAction: (choice: string) => Promise<void>
  cancelAction: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    { role: 'assistant', content: '你好！我是日程助手。直接告诉我你的安排，比如"明天上午9点跟张总在办公室开项目评审会"。' },
  ],
  loading: false,
  pendingConfirm: null,

  sendMessage: async (text) => {
    set((s) => ({ messages: [...s.messages, { role: 'user', content: text }], loading: true }))
    try {
      const result = await window.api.invoke('chat:send', text) as { reply: string; toolResults: unknown[] }
      set((s) => ({ messages: [...s.messages, { role: 'assistant', content: result.reply }], loading: false }))
    } catch (e) {
      set((s) => ({
        messages: [...s.messages, { role: 'assistant', content: `错误: ${String(e)}` }],
        loading: false,
      }))
    }
  },

  confirmAction: async (choice) => {
    await window.api.invoke('chat:confirm', choice)
    set({ pendingConfirm: null })
  },

  cancelAction: () => set({ pendingConfirm: null }),
}))
```

- [ ] **Step 2: ChatPanel.tsx**

```tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import MentionPopup from './MentionPopup'
import { useTaskStore } from '@/stores/taskStore'

interface ChatPanelProps {
  visible: boolean
  onToggle: () => void
}

export default function ChatPanel({ visible, onToggle }: ChatPanelProps) {
  const { sendMessage, messages, loading } = useChatStore()
  const { tasks } = useTaskStore()
  const [input, setInput] = useState('')
  const [showMention, setShowMention] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPos, setCursorPos] = useState(0)

  if (!visible) return null

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
    setShowMention(false)
  }

  const handleInput = (value: string, cursor: number) => {
    setInput(value)
    setCursorPos(cursor)

    // 检测 @ 触发
    const beforeCursor = value.slice(0, cursor)
    const atMatch = beforeCursor.match(/@([^\s@]*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setShowMention(true)
    } else {
      setShowMention(false)
    }
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
        <button onClick={onToggle} className="text-[#6c7086] hover:text-[#cdd6f4]">
          <X size={16} />
        </button>
      </div>
      <MessageList messages={messages} loading={loading} />
      <div className="relative">
        {showMention && (
          <MentionPopup
            query={mentionQuery}
            tasks={pendingTasks}
            onSelect={handleMentionSelect}
            onClose={() => setShowMention(false)}
          />
        )}
        <ChatInput value={input} onChange={handleInput} onSend={handleSend} disabled={loading} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: ChatInput.tsx**

```tsx
import { Send } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string, cursor: number) => void
  onSend: () => void
  disabled: boolean
}

export default function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  return (
    <div className="flex items-center gap-1 p-2 border-t border-[#313244]">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value, e.target.selectionStart || 0)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
          }
        }}
        disabled={disabled}
        placeholder="输入日程，如 @项目评审会 改到3点..."
        rows={2}
        className="flex-1 bg-[#313244] text-[#cdd6f4] text-xs rounded px-2 py-1.5 resize-none outline-none placeholder:text-[#6c7086] disabled:opacity-50"
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="p-2 text-[#cba6f7] hover:bg-[#313244] rounded disabled:opacity-30"
      >
        <Send size={16} />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: MentionPopup.tsx**

```tsx
import type { Task } from '../../../shared/types'

interface MentionPopupProps {
  query: string
  tasks: Task[]
  onSelect: (taskId: string, taskName: string) => void
  onClose: () => void
}

export default function MentionPopup({ query, tasks, onSelect, onClose }: MentionPopupProps) {
  const filtered = tasks.filter((t) =>
    t.event.includes(query) || t.place.includes(query) || t.person.includes(query),
  )

  return (
    <div className="absolute bottom-full left-2 right-2 mb-1 bg-[#45475a] rounded-lg shadow-lg max-h-32 overflow-y-auto">
      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-xs text-[#6c7086]">无匹配任务</div>
      ) : (
        filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id, t.event)}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#585b70] flex items-center gap-2"
          >
            <span className="text-[#a6e3a1]">📌</span>
            <span className="text-[#cdd6f4] font-medium">{t.event}</span>
            <span className="text-[#a6adc8]">{t.date} {t.time}</span>
          </button>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 5: MessageList.tsx + TaskGroup.tsx + FoldedSummary.tsx**

`MessageList.tsx`:
```tsx
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
          <span className="text-[10px] text-[#6c7086] block mb-0.5">
            {m.role === 'user' ? '👤' : '🤖'}
          </span>
          {m.content}
        </div>
      ))}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-[#6c7086]">
          <Loader2 size={12} className="animate-spin" /> 思考中...
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: 在 MainLayout 中添加 ChatPanel**

```tsx
// MainLayout.tsx 中添加:
import { useState } from 'react'
import ChatPanel from '../chat/ChatPanel'

// 在 Sidebar 的 onSettings 旁添加聊天切换:
const [chatVisible, setChatVisible] = useState(true)

// 在 Sidebar 上添加聊天按钮（或者直接在主区域右侧）
// 在 return 的 flex div 最后:
{chatVisible && <ChatPanel visible={chatVisible} onToggle={() => setChatVisible(false)} />}
{!chatVisible && (
  <button
    onClick={() => setChatVisible(true)}
    className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#cba6f7] text-[#1e1e2e] rounded-l-lg px-1 py-3 text-xs"
  >
    💬
  </button>
)}
```

- [ ] **Step 7: Commit**

```bash
git add src/renderer/stores/chatStore.ts src/renderer/components/chat/ src/renderer/components/layout/MainLayout.tsx
git commit -m "feat: implement chat panel with @ mention autocomplete"
```

---

### Task 3.4: InputPipeline + CommandRegistry

**Files:**
- Create: `src/renderer/input/pipeline.ts`
- Create: `src/renderer/commands/types.ts`
- Create: `src/renderer/commands/registry.ts`
- Create: `src/renderer/commands/builtin/today.ts`, `week.ts`, `month.ts`, `done.ts`, `delete.ts`, `add.ts`, `settings.ts`, `help.ts`

- [ ] **Step 1: pipeline.ts**

```ts
import { commandRegistry } from '../commands/registry'
import { useChatStore } from '../stores/chatStore'
import { useViewStore } from '../stores/viewStore'

export function processInput(raw: string): 'handled' | string {
  // Step 1: 指令检测
  if (raw.startsWith('/')) {
    const match = commandRegistry.match(raw)
    if (match) {
      match.command.handler(match.args, {
        viewStore: useViewStore.getState(),
        taskStore: null!, // 由具体命令使用
        chatStore: useChatStore.getState(),
      })
      return 'handled'
    }
  }

  // Step 2: 已经是预处理后的文本，直接返回
  return raw
}
```

- [ ] **Step 2: commands/types.ts**

```ts
import type { useViewStore, useTaskStore, useChatStore } from '../../stores'

export interface CommandContext {
  viewStore: ReturnType<typeof useViewStore.getState>
  taskStore: ReturnType<typeof useTaskStore.getState>
  chatStore: ReturnType<typeof useChatStore.getState>
}

export interface CommandDefinition {
  name: string
  aliases?: string[]
  description: string
  handler: (args: string, ctx: CommandContext) => void
}
```

- [ ] **Step 3: commands/registry.ts**

```ts
import type { CommandDefinition, CommandContext } from './types'

class CommandRegistry {
  private commands = new Map<string, CommandDefinition>()

  register(cmd: CommandDefinition): void {
    this.commands.set(cmd.name, cmd)
    if (cmd.aliases) {
      for (const alias of cmd.aliases) this.commands.set(alias, cmd)
    }
  }

  match(input: string): { command: CommandDefinition; args: string } | null {
    const parts = input.slice(1).split(/\s+/)
    const name = parts[0]
    const cmd = this.commands.get(name)
    if (!cmd) return null
    const args = parts.slice(1).join(' ')
    return { command: cmd, args }
  }
}

export const commandRegistry = new CommandRegistry()
```

- [ ] **Step 4: 8 个内置命令**

`builtin/today.ts`:
```ts
import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'today', aliases: ['td'],
  description: '切换到今日视图',
  handler: (_args, ctx) => { ctx.viewStore.setView('today') },
})
```

`builtin/week.ts`:
```ts
import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'week', aliases: ['wk'],
  description: '切换到周视图',
  handler: (_args, ctx) => { ctx.viewStore.setView('week') },
})
```

`builtin/month.ts`:
```ts
import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'month', aliases: ['m'],
  description: '切换到月视图',
  handler: (_args, ctx) => { ctx.viewStore.setView('month') },
})
```

`builtin/help.ts`:
```ts
import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'help', aliases: ['h', '?'],
  description: '列出所有命令',
  handler: (_args, ctx) => {
    const cmds = [
      '/help, /h — 显示帮助',
      '/today, /td — 今日视图',
      '/week, /wk — 周视图',
      '/month, /m — 月视图',
      '/done <任务名> — 完成任务',
      '/delete <任务名> — 删除任务',
      '/add — 快速添加面板',
      '/settings, /cfg — 打开设置',
    ].join('\n')
    ctx.chatStore.sendMessage(`可用命令：\n${cmds}`)
  },
})
```

- [ ] **Step 5: 在 ChatInput 中集成 InputPipeline**

修改 `ChatInput`（或 `ChatPanel`）的 `handleSend` 中调用 `processInput`:

```ts
// 在 handleSend 中:
const result = processInput(input)
if (result === 'handled') {
  setInput('')
  return
}
sendMessage(result)
```

- [ ] **Step 6: 确保所有 builtin 被 import**

`src/renderer/commands/index.ts`:
```ts
import './builtin/today'
import './builtin/week'
import './builtin/month'
import './builtin/help'
```

在 App.tsx 中 import: `import './commands'`

- [ ] **Step 7: Commit**

```bash
git add src/renderer/input/ src/renderer/commands/
git commit -m "feat: implement InputPipeline and CommandRegistry with 4 builtin commands"
```

---

### Task 3.5: 补全 — confirm IPC + 剩余内置命令

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Create: `src/renderer/commands/builtin/done.ts`
- Create: `src/renderer/commands/builtin/delete.ts`
- Create: `src/renderer/commands/builtin/add.ts`
- Create: `src/renderer/commands/builtin/settings.ts`
- Modify: `src/renderer/commands/index.ts`

- [ ] **Step 1: 在 ipc-handlers.ts 注册 chat:confirm / chat:cancel**

```ts
// 在 registerIpcHandlers() 中添加:
import { resolveConfirmation, cancelConfirmation } from './tools/interact-tools'

ipcMain.handle('chat:confirm', (_e, choice: string) => {
  resolveConfirmation(choice)
})

ipcMain.handle('chat:cancel', () => {
  cancelConfirmation()
})
```

- [ ] **Step 2: 4 个剩余命令**

`builtin/done.ts`:
```ts
import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'done', aliases: ['d'],
  description: '标记任务完成。用法: /done <事件关键词>',
  handler: (args, ctx) => {
    const tasks = ctx.viewStore // 由调用方注入
    // 简化：通过 chat:send 让 LLM 处理
    ctx.chatStore.sendMessage(`完成 ${args}`)
  },
})
```

`builtin/delete.ts`:
```ts
import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'delete', aliases: ['del'],
  description: '删除任务。用法: /delete <事件关键词>',
  handler: (args, ctx) => { ctx.chatStore.sendMessage(`取消 ${args}`) },
})
```

`builtin/add.ts`:
```ts
import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'add', aliases: ['a'],
  description: '快速添加任务。用法: /add <自然语言描述>',
  handler: (args, ctx) => {
    if (!args) ctx.viewStore.setView('today')
    else ctx.chatStore.sendMessage(args)
  },
})
```

`builtin/settings.ts`:
```ts
import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'settings', aliases: ['cfg'],
  description: '打开设置面板',
  handler: (_args, ctx) => {
    // 通过 IPC 通知 Main 打开设置
    window.api.invoke('open-settings')
  },
})
```

- [ ] **Step 3: 更新 commands/index.ts**

```ts
import './builtin/today'
import './builtin/week'
import './builtin/month'
import './builtin/help'
import './builtin/done'
import './builtin/delete'
import './builtin/add'
import './builtin/settings'
```

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc-handlers.ts src/renderer/commands/
git commit -m "feat: add confirm IPC handlers and remaining builtin commands"
```

---

### Task 3.6: FoldedSummary 组件

**Files:**
- Create: `src/renderer/components/chat/FoldedSummary.tsx`

- [ ] **Step 1: FoldedSummary.tsx**

```tsx
export default function FoldedSummary() {
  return (
    <details className="text-[#6c7086] text-[10px] bg-[#181825] px-2 py-1 rounded mx-2">
      <summary className="cursor-pointer hover:text-[#a6adc8]">📦 已完成/过期任务已折叠</summary>
      <div className="mt-1 pl-3 text-[#585b70]">任务完成后其聊天记录自动折叠，释放上下文窗口</div>
    </details>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/chat/FoldedSummary.tsx
git commit -m "feat: add folded summary component"
```

---

## Phase 4: 上下文管理

### Task 4.1: 滑动窗口 + 消息折叠 + 每日压缩

**Files:**
- Create: `src/main/compressor.ts`
- Modify: `src/main/index.ts` (schedule compression)

- [ ] **Step 1: 创建 src/main/compressor.ts**

```ts
import { getMessagesForDate, saveMemory, getDatabase } from './db'
import { getConfig } from './db'
import OpenAI from 'openai'

export async function compressDate(date: string): Promise<void> {
  const messages = getMessagesForDate(date)
  if (messages.length === 0) return

  const apiKey = getConfig('api_key')
  if (!apiKey) return  // 没有 API key 则跳过压缩

  const openai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey })
  const conversationText = messages.map((m) => `[${m.role}] ${m.content}`).join('\n')

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是日程记忆压缩器。将聊天记录压缩为 JSON 摘要。提取：日程操作、偏好、重要备注。
返回 JSON: {"summary":"...","keywords":["..."]}`,
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

// 折叠已完成/过期任务的消息（在 DB 层面由 JOIN 自动过滤，无需额外操作）
// 只在 UI 展示时统计折叠数
export function getFoldedSummary(): { count: number; tasks: string[] } {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT t.id, t.event, t.date FROM tasks t
    WHERE t.status IN ('done','cancelled','expired')
       OR datetime(t.date || ' ' || t.time) <= datetime('now')
    ORDER BY t.date DESC LIMIT 10
  `).all() as { id: string; event: string; date: string }[]
  return { count: rows.length, tasks: rows.map((r) => `${r.event}(${r.date})`) }
}
```

- [ ] **Step 2: 在 main/index.ts 中调度压缩**

```ts
import { compressDate } from './compressor'
import { format, subDays } from 'date-fns'

// 检查并压缩昨天的数据
function scheduleCompression(): void {
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  compressDate(yesterday).catch(() => { /* silent */ })

  // 每小时检查一次
  setInterval(() => {
    const y = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    compressDate(y).catch(() => {})
  }, 3600_000)
}

// 在 app.whenReady 中调用:
scheduleCompression()
```

- [ ] **Step 3: Commit**

```bash
git add src/main/compressor.ts src/main/index.ts
git commit -m "feat: implement daily chat compression and sliding window"
```

---

## Phase 5: 提醒 & 托盘

### Task 5.1: ReminderService + 托盘

**Files:**
- Create: `src/main/reminder.ts`
- Create: `src/main/tray.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: src/main/reminder.ts**

```ts
import { Notification } from 'electron'
import { getTasksDueIn, markNotified, getNextReminderTime, getConfig } from './db'

let timer: ReturnType<typeof setInterval> | null = null

export function startReminderService(): void {
  schedule()
}

function schedule(): void {
  const interval = calcInterval()
  timer = setInterval(() => {
    checkAndNotify()
    reschedule()
  }, interval)
}

function calcInterval(): number {
  const next = getNextReminderTime()
  if (!next) return 5 * 60 * 1000
  const diff = next.getTime() - Date.now()
  return Math.max(1000, Math.min(diff, 30000))
}

function reschedule(): void {
  if (timer) clearInterval(timer)
  schedule()
}

function checkAndNotify(): void {
  const minutes = parseInt(getConfig('reminder_minutes')) || 10
  const tasks = getTasksDueIn(minutes)
  for (const task of tasks) {
    new Notification({
      title: `⏰ ${minutes}分钟后 · ${task.event}`,
      body: `📍 ${task.place || '—'}  👤 ${task.person || '—'}\n🕐 ${task.date} ${task.time}`,
      silent: false,
    }).on('click', () => {
      const { BrowserWindow } = require('electron')
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.show()
        win.focus()
        win.webContents.send('reminder:on-fire', task.id)
      }
    })
    markNotified(task.id)
  }
}
```

- [ ] **Step 2: src/main/tray.ts**

```ts
import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import path from 'path'
import { getPendingTasks } from './db'

let tray: Tray | null = null

export function createTray(): void {
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('copy2list')

  updateTrayMenu()
  tray.on('double-click', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) { win.show(); win.focus() }
  })
}

export function updateTrayMenu(): void {
  const tasks = getPendingTasks()
  const taskItems = tasks.slice(0, 5).map((t) => ({
    label: `${t.time} · ${t.event}`,
    enabled: false,
  }))

  const menu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) { win.show(); win.focus() }
    }},
    { type: 'separator' },
    { label: `今日 ${tasks.length} 个任务`, enabled: false },
    ...(tasks.length > 0 ? taskItems : [{ label: '暂无任务', enabled: false }]),
    { type: 'separator' },
    { label: '设置', click: () => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('open-settings')
    }},
    { type: 'separator' },
    { label: '退出', click: () => { app.exit(0) } },
  ])

  if (tray) tray.setContextMenu(menu)
}

// 定时刷新菜单
setInterval(updateTrayMenu, 60_000)
```

- [ ] **Step 3: 更新 main/index.ts**

```ts
import { startReminderService } from './reminder'
import { createTray } from './tray'

// 在 createWindow() 之后:
createTray()
startReminderService()

// 关闭窗口时最小化到托盘而不是退出:
mainWindow.on('close', (e) => {
  e.preventDefault()
  mainWindow.hide()
})
```

- [ ] **Step 4: 创建托盘图标占位**

```bash
mkdir -p resources
# 使用一个简单的 16x16 PNG 作为托盘图标
```

`resources/tray-icon.png`: 需要创建一个 16x16 的 PNG 图标。可以用任何简单图标，后续替换。

- [ ] **Step 5: Commit**

```bash
git add src/main/reminder.ts src/main/tray.ts src/main/index.ts resources/
git commit -m "feat: implement reminder service and system tray"
```

---

## Phase 6: 设置 & 打包

### Task 6.1: SettingsDialog

**Files:**
- Create: `src/renderer/components/settings/SettingsDialog.tsx`
- Modify: `src/renderer/components/layout/MainLayout.tsx`

- [ ] **Step 1: SettingsDialog.tsx**

```tsx
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useConfigStore } from '@/stores/configStore'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { config, set } = useConfigStore()
  const [apiKey, setApiKey] = useState(config.api_key)
  const [reminderMinutes, setReminderMinutes] = useState(config.reminder_minutes)
  const [openAtLogin, setOpenAtLogin] = useState(config.open_at_login)

  useEffect(() => {
    setApiKey(config.api_key)
    setReminderMinutes(config.reminder_minutes)
    setOpenAtLogin(config.open_at_login)
  }, [config, open])

  if (!open) return null

  const handleSave = async () => {
    await set('api_key', apiKey)
    await set('reminder_minutes', reminderMinutes)
    await set('open_at_login', openAtLogin)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1e1e2e] border border-[#313244] rounded-xl w-[420px] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">⚙️ 设置</h2>
          <button onClick={onClose} className="text-[#6c7086] hover:text-[#cdd6f4]"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#a6adc8] block mb-1">DeepSeek API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-[#313244] text-[#cdd6f4] text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#cba6f7]"
            />
            <p className="text-[10px] text-[#6c7086] mt-1">
              从 <a href="https://platform.deepseek.com" className="text-[#89b4fa] hover:underline">platform.deepseek.com</a> 获取
            </p>
          </div>

          <div>
            <label className="text-xs text-[#a6adc8] block mb-1">提前提醒</label>
            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(parseInt(e.target.value))}
              className="w-full bg-[#313244] text-[#cdd6f4] text-sm rounded-lg px-3 py-2 outline-none"
            >
              <option value={5}>5 分钟</option>
              <option value={10}>10 分钟</option>
              <option value={15}>15 分钟</option>
              <option value={30}>30 分钟</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs text-[#a6adc8]">开机自启</label>
            <button
              onClick={() => setOpenAtLogin(!openAtLogin)}
              className={`w-10 h-5 rounded-full transition-colors ${openAtLogin ? 'bg-[#a6e3a1]' : 'bg-[#45475a]'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${openAtLogin ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-1.5 text-xs text-[#a6adc8] hover:text-[#cdd6f4]">取消</button>
          <button onClick={handleSave} className="px-4 py-1.5 text-xs bg-[#cba6f7] text-[#1e1e2e] rounded-lg font-medium hover:bg-[#b4befe]">
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 在 MainLayout 中连接设置**

```tsx
// MainLayout.tsx 中添加:
import SettingsDialog from '../settings/SettingsDialog'
const [settingsOpen, setSettingsOpen] = useState(false)

// Sidebar onSettings:
onSettings={() => setSettingsOpen(true)}

// 在 return 末尾:
<SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/settings/ src/renderer/components/layout/MainLayout.tsx
git commit -m "feat: implement settings dialog with API key config"
```

---

### Task 6.2: 打包配置

**Files:**
- Modify: `electron-builder.yml`
- Modify: `package.json`

- [ ] **Step 1: 完善 electron-builder.yml**

```yaml
appId: com.copy2list.app
productName: copy2list
directories:
  output: dist
files:
  - out/**/*
  - resources/**/*
win:
  target: nsis
  icon: resources/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
extraResources:
  - from: resources/
    to: resources/
```

- [ ] **Step 2: 验证打包**

```bash
npm run build
npm run pack
```

预期：`dist/` 目录下生成 `copy2list Setup x.x.x.exe` 安装包。

- [ ] **Step 3: 创建应用图标**

在 `resources/` 下放置 `icon.ico`（至少 256×256）和 `tray-icon.png`（16×16）。

- [ ] **Step 4: Commit**

```bash
git add electron-builder.yml resources/
git commit -m "feat: configure electron-builder for Windows distribution"
```

---

## 附录：快速开发命令

```bash
npm run dev      # 开发模式（热重载）
npm run build    # 构建所有进程
npm run dist     # 构建 + 打包安装包
```
