import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'done', aliases: ['d'], description: '标记任务完成',
  handler: (args, ctx) => { ctx.chatStore.sendMessage(`完成 ${args}`) },
})
