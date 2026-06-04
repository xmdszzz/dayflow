<p align="center">
  <h1 align="center">DayFlow</h1>
  <p align="center">AI-Powered Desktop Calendar & Task Manager for Windows</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%2010%2F11-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/version-1.0.0-purple" alt="Version">
</p>

---

## What is DayFlow?

DayFlow turns natural language into structured calendar tasks. Just chat with the AI assistant — tell it your schedule, and it handles the rest. No more clicking through date pickers and time fields.

**"Tomorrow 9am meeting with Zhang in room 3 about Q3 budget"** → becomes a calendar entry with title, time, place, person, and notes.

## Features

- **Natural Language Scheduling** — Type your plans in Chinese; the AI parses dates, times, locations, and participants
- **Three Calendar Views** — Month (overview dots), Week (color-coded cards), Today (Gantt chart with timeline)
- **Smart Task Management** — Complete, cancel, reactivate, or delete tasks. Color-coded status: pending (yellow), done (green), expired/cancelled (red)
- **AI Chat Sidebar** — Multi-turn conversation with DeepSeek LLM, @mention task references, slash commands
- **Free Slot Detection** — The AI finds open time slots and suggests them when you don't specify a time
- **Conflict Warnings** — Overlapping tasks are detected and flagged automatically
- **10-Minute Reminders** — Native Windows notifications before each task starts
- **System Tray** — Runs minimized; shows today's tasks at a glance
- **Task Reviews** — Write post-task retrospectives (lessons learned, outcomes) for completed items
- **Keyboard-Navigable** — Arrow keys, Enter, Escape in mentions and popups

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Framework | Electron 29 |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| State | Zustand |
| Database | better-sqlite3 (WAL mode) |
| AI | DeepSeek Chat API (OpenAI-compatible) |
| Testing | Vitest, Testing Library |
| Build | electron-vite, electron-builder |

## Quick Start

### Prerequisites
- Node.js 18+
- Windows 10/11
- [DeepSeek API Key](https://platform.deepseek.com)

### Install

```bash
git clone https://github.com/xmdszzz/dayflow.git
cd dayflow
npm install
```

### Development

```bash
npm run dev
```

### Build & Package

```bash
npm run build
npm run pack     # Creates unpacked app in dist/
npm run dist     # Creates Windows installer
```

### Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## Architecture

```
Main Process (Node.js)          Renderer Process (Chromium)
├── Database (SQLite)           ├── MonthView / WeekView / TodayView
├── Tool Registry (8+ tools)    ├── ChatPanel (AI sidebar)
├── LLM Service (DeepSeek)      ├── TaskCreateDialog / TaskDetailDialog
├── Reminder Service            ├── DayTasksPopup
├── Compressor (daily memory)   ├── Command Registry (/today, /done...)
├── System Tray                 └── Zustand Stores (task, chat, view, config)
└── IPC Handlers
```

### Tool System

The LLM interacts with the app through a structured tool system (Function Calling):

| Tool | Purpose |
|---|---|
| `add_task` | Create a scheduled task |
| `update_task` | Modify an existing task |
| `cancel_task` | Cancel (soft-delete, keeps record) |
| `delete_task` | Permanent delete with cascade |
| `complete_task` | Mark as done |
| `query_tasks` | Search/query task list |
| `resolve_date` | Deterministic Chinese date parsing |
| `get_now` | Get current date/time |
| `find_free_slots` | Find open time slots in a day |
| `confirm_with_user` | Pause for user confirmation |
| `write_review` | Write retrospective for completed task |

## Project Structure

```
src/
├── main/                   # Electron Main Process
│   ├── index.ts            # App entry, window, tray, lifecycle
│   ├── db.ts               # SQLite schema, CRUD, conflict detection
│   ├── llm.ts              # Context builder, DeepSeek API
│   ├── ipc-handlers.ts     # IPC channel registration
│   ├── reminder.ts         # Dynamic interval reminder service
│   ├── compressor.ts       # Daily chat compression
│   ├── tray.ts             # System tray & menu
│   └── tools/              # Tool registry & implementations
├── renderer/               # React Frontend
│   ├── App.tsx
│   ├── components/
│   │   ├── calendar/       # MonthView, WeekView, TodayView, dialogs
│   │   ├── chat/           # ChatPanel, MessageList, MentionPopup
│   │   ├── layout/         # TitleBar, Sidebar, MainLayout
│   │   └── settings/       # SettingsDialog
│   ├── commands/           # Slash command system
│   ├── stores/             # Zustand stores
│   ├── hooks/              # Custom hooks
│   └── input/              # Input preprocessing pipeline
├── shared/                 # Shared types
├── preload/                # Context bridge
└── test/                   # Integration & regression tests
```

## License

MIT © 2026 DayFlow
