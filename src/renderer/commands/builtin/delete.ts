import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'delete', aliases: ['del'], description: '删除任务。用法: /delete <任务关键词>',
  handler: (args, ctx) => {
    if (!args.trim()) {
      ctx.chatStore.sendMessage('请告诉我你想删除哪个任务？例如：/delete 项目评审会')
      return
    }
    ctx.chatStore.sendMessage(`取消 ${args}`)
  },
})
