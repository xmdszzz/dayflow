import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'add', aliases: ['a'], description: '快速添加任务',
  handler: (args, ctx) => {
    if (!args) ctx.viewStore.setView('today')
    else ctx.chatStore.sendMessage(args)
  },
})
