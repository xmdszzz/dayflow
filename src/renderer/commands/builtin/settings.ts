import { commandRegistry } from '../registry'
commandRegistry.register({
  name: 'settings', aliases: ['cfg'], description: '打开设置面板',
  handler: (_args, _ctx) => {
    window.api.invoke('open-settings')
  },
})
