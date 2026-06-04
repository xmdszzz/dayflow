// Mock Electron API for renderer tests (globals like vi are available via vitest globals:true)
Object.defineProperty(window, 'api', {
  value: {
    invoke: (...args: unknown[]) => (window.api as any).__invoke(...args),
    on: (...args: unknown[]) => (window.api as any).__on(...args),
    __invoke: () => Promise.resolve(null),
    __on: () => () => {},
  },
  writable: true,
})


