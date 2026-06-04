import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'delete', aliases: ['del'], description: '删除任务',
  handler: (args, ctx) => { ctx.chatStore.sendMessage(`取消 ${args}`) },
})
