import { create } from 'zustand'
import { startOfMonth, endOfMonth, startOfWeek as sow, endOfWeek as eow, addMonths, addWeeks, subMonths, subWeeks, format } from 'date-fns'

export type ViewType = 'month' | 'week' | 'today'

interface ViewState {
  view: ViewType
  currentDate: Date
  setView: (v: ViewType) => void
  goNext: () => void
  goPrev: () => void
  goToday: () => void
  monthRange: () => { start: string; end: string }
  weekRange: () => { start: string; end: string }
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

export const useViewStore = create<ViewState>((set, get) => ({
  view: 'today',
  currentDate: new Date(),
  setView: (v) => set({ view: v, currentDate: new Date() }),
  goNext: () => set((s) => ({
    currentDate: s.view === 'month' ? addMonths(s.currentDate, 1) : s.view === 'week' ? addWeeks(s.currentDate, 1) : s.currentDate,
  })),
  goPrev: () => set((s) => ({
    currentDate: s.view === 'month' ? subMonths(s.currentDate, 1) : s.view === 'week' ? subWeeks(s.currentDate, 1) : s.currentDate,
  })),
  goToday: () => set({ currentDate: new Date(), view: 'today' }),
  monthRange: () => {
    const d = get().currentDate
    return { start: fmt(startOfMonth(d)), end: fmt(endOfMonth(d)) }
  },
  weekRange: () => {
    const d = get().currentDate
    return { start: fmt(sow(d, { weekStartsOn: 1 })), end: fmt(eow(d, { weekStartsOn: 1 })) }
  },
}))
