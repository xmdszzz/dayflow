import { useTaskStore } from './taskStore'
import type { Task } from '../../shared/types'

beforeAll(() => {
  (window as any).api = { invoke: vi.fn(), on: vi.fn(() => vi.fn()) }
})

describe('taskStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTaskStore.setState({
      tasks: [],
      selectedDate: null,
      loading: false,
    })
  })

  describe('loadTasks', () => {
    it('loads tasks and sets loading state', async () => {
      const mockTasks: Task[] = [
        { id: '1', date: '2026-06-04', start_time: '09:00', end_time: '10:00', title: 'A', notes: '', place: '', person: '', status: 'pending', chat_count: 0, notified: 0, created_at: '', updated_at: '' },
      ]
      window.api.invoke.mockResolvedValue(mockTasks)

      await useTaskStore.getState().loadTasks('2026-06-01', '2026-06-30')

      const state = useTaskStore.getState()
      expect(state.loading).toBe(false)
      expect(state.tasks).toEqual(mockTasks)
    })
  })

  describe('addTask', () => {
    it('adds task to list', async () => {
      const newTask: Task = { id: 'new', date: '2026-06-04', start_time: '10:00', end_time: '11:00', title: 'B', notes: '', place: '', person: '', status: 'pending', chat_count: 0, notified: 0, created_at: '', updated_at: '' }
      window.api.invoke.mockResolvedValue(newTask)

      await useTaskStore.getState().addTask({ date: '2026-06-04', start_time: '10:00', end_time: '11:00', title: 'B' })

      const state = useTaskStore.getState()
      expect(state.tasks).toHaveLength(1)
      expect(state.tasks[0].id).toBe('new')
    })
  })

  describe('completeTask', () => {
    it('marks task as done', async () => {
      useTaskStore.setState({
        tasks: [{ id: '1', date: '2026-06-04', start_time: '09:00', end_time: '10:00', title: 'A', notes: '', place: '', person: '', status: 'pending', chat_count: 0, notified: 0, created_at: '', updated_at: '' }],
      })
      window.api.invoke.mockResolvedValue(undefined)

      await useTaskStore.getState().completeTask('1')

      const state = useTaskStore.getState()
      expect(state.tasks[0].status).toBe('done')
    })
  })

  describe('deleteTask', () => {
    it('removes task from list', async () => {
      useTaskStore.setState({
        tasks: [{ id: '1', date: '2026-06-04', start_time: '09:00', end_time: '10:00', title: 'A', notes: '', place: '', person: '', status: 'pending', chat_count: 0, notified: 0, created_at: '', updated_at: '' }],
      })
      window.api.invoke.mockResolvedValue(undefined)

      await useTaskStore.getState().deleteTask('1')

      const state = useTaskStore.getState()
      expect(state.tasks).toHaveLength(0)
    })
  })

  describe('selectDate', () => {
    it('sets selected date', () => {
      useTaskStore.getState().selectDate('2026-06-04')
      expect(useTaskStore.getState().selectedDate).toBe('2026-06-04')
    })
  })
})
