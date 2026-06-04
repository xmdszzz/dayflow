import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'week', aliases: ['wk'], description: '切换到周视图',
  handler: (_args, ctx) => { ctx.viewStore.setView('week') },
})
