import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'help', aliases: ['h', '?'], description: '列出所有命令',
  handler: (_args, ctx) => {
    ctx.chatStore.sendMessage('可用命令：\n/today, /td — 今日视图\n/week, /wk — 周视图\n/month, /m — 月视图\n/done — 完成任务\n/delete — 删除任务\n/add — 快速添加\n/settings, /cfg — 设置\n/help, /h — 帮助')
  },
})
