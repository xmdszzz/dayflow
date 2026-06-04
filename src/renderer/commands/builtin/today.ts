import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'today', aliases: ['td'], description: '切换到今日视图',
  handler: (_args, ctx) => { ctx.viewStore.setView('today') },
})
