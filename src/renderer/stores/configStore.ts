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
    const config = {} as Record<string, unknown>
    for (const k of keys) {
      const v = await window.api.invoke('config:get', k) as string
      config[k] = k === 'reminder_minutes' ? parseInt(v) || 10 : k === 'open_at_login' ? v === 'true' : v
    }
    set({ config: config as unknown as AppConfig, loaded: true })
  },
  set: async (key, value) => {
    await window.api.invoke('config:set', key, String(value))
    set((s) => ({ config: { ...s.config, [key]: value } }))
  },
}))
