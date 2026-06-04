import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'done', aliases: ['d'], description: '标记任务完成。用法: /done <任务关键词>',
  handler: (args, ctx) => {
    if (!args.trim()) {
      ctx.chatStore.sendMessage('请告诉我你想完成哪个任务？例如：/done 项目评审会')
      return
    }
    ctx.chatStore.sendMessage(`完成 ${args}`)
  },
})
