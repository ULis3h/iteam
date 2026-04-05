/**
 * 中文（简体）翻译文件
 */
import type { LocaleKey } from './en';

export const zhCN: Record<LocaleKey, string> = {
  // -- 侧边栏 --
  'sidebar.connection': '连接',
  'sidebar.device': '设备',
  'sidebar.workspace': '工作区',
  'sidebar.tasks': '任务',
  'sidebar.recentTraces': '最近追踪',
  'sidebar.settings': '设置',
  'sidebar.dashboard': '仪表盘',
  'sidebar.connect': '连接',
  'sidebar.disconnect': '断开',
  'sidebar.noWorkspace': '无工作区',
  'sidebar.noTasks': '暂无任务',
  'sidebar.noTraces': '暂无追踪',
  'sidebar.branch': '分支',
  'sidebar.deviceAuto': '自动',

  // -- 状态栏 --
  'statusBar.off': 'iTeam: 离线',
  'statusBar.connecting': 'iTeam: ...',
  'statusBar.idle': 'iTeam: 空闲',
  'statusBar.error': 'iTeam: 错误',
  'statusBar.working': 'iTeam: {0}',
  'statusBar.tooltip.disconnected': 'iTeam: 已断开，点击连接',
  'statusBar.tooltip.connecting': 'iTeam: 连接中...',
  'statusBar.tooltip.connected': 'iTeam: 已连接，点击查看选项',
  'statusBar.tooltip.working': 'iTeam: 工作中 — {0}',
  'statusBar.tooltip.error': 'iTeam: 连接错误，点击重新连接',

  // -- 任务树 --
  'taskTree.running': '运行中',
  'taskTree.pending': '等待中',
  'taskTree.noTasks': '暂无任务',

  // -- 连接命令 --
  'cmd.alreadyConnected': 'iTeam: 已连接。',
  'cmd.serverNotConfigured': 'iTeam: 服务器 URL 未配置。',
  'cmd.openSettings': '打开设置',
  'cmd.connectedToServer': 'iTeam: 已连接到服务器。',
  'cmd.connectionFailed': 'iTeam: 连接失败 — {0}',
  'cmd.notConnected': 'iTeam: 未连接。',
  'cmd.disconnected': 'iTeam: 已断开。',
  'cmd.deviceInfoTitle': 'iTeam 设备信息',
  'cmd.deviceInfoPlaceholder': '设备信息',
  'cmd.deviceId': '设备 ID: {0}',
  'cmd.status': '状态: {0}',
  'cmd.server': '服务器: {0}',
  'cmd.role': '角色: {0}',
  'cmd.skills': '技能: {0}',
  'cmd.ai': 'AI: {0}',

  // -- 配置命令 --
  'cmd.setRoleTitle': '设置设备角色',
  'cmd.setRolePlaceholder': '当前: {0}',
  'cmd.roleSetTo': 'iTeam: 角色已设置为 {0}',
  'cmd.setSkillsTitle': '设置设备技能',
  'cmd.setSkillsPrompt': '输入技能，用逗号分隔',
  'cmd.setSkillsPlaceholder': 'typescript, react, nodejs',
  'cmd.skillsSetTo': 'iTeam: 技能已设置为 {0}',

  // -- 任务命令 --
  'cmd.noPendingTasks': 'iTeam: 没有待执行的任务。',
  'cmd.taskAlreadyRunning': 'iTeam: 任务正在运行 — {0}',
  'cmd.selectTaskTitle': '选择要执行的任务',
  'cmd.selectTaskPlaceholder': '从队列中选择一个任务',

  // -- 任务服务 --
  'task.promptCopied': 'iTeam: 任务提示已复制到剪贴板。',
  'task.execute': '执行',
  'task.defer': '稍后',
  'task.received': 'iTeam 任务: {0}',
  'task.apiKeyNotConfigured': 'Anthropic API 密钥未配置，请在设置中配置 "iteam.anthropicApiKey"。',
  'task.taskTitle': '=== 任务: {0} ===',
  'task.model': '模型: {0}',
  'task.modelApi': '模型: {0} (Anthropic API)',
  'task.taskCompleted': '=== 任务完成 ===',

  // -- 插件 --
  'ext.roleChanged': 'iTeam: 角色已变更 {0} -> {1}',
  'ext.configUpdated': 'iTeam: 配置已更新 — 角色: {0}',

  // -- 语言 --
  'cmd.switchLanguage': '切换语言',
};
