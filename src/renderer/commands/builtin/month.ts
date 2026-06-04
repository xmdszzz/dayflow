import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'month', aliases: ['m'], description: '切换到月视图',
  handler: (_args, ctx) => { ctx.viewStore.setView('month') },
})
