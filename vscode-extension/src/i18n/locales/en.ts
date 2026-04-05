/**
 * English locale strings for the iTeam extension.
 */
export const en = {
  // -- Sidebar --
  'sidebar.connection': 'Connection',
  'sidebar.device': 'Device',
  'sidebar.workspace': 'Workspace',
  'sidebar.tasks': 'Tasks',
  'sidebar.recentTraces': 'Recent Traces',
  'sidebar.settings': 'Settings',
  'sidebar.dashboard': 'Dashboard',
  'sidebar.connect': 'Connect',
  'sidebar.disconnect': 'Disconnect',
  'sidebar.noWorkspace': 'No workspace',
  'sidebar.noTasks': 'No tasks',
  'sidebar.noTraces': 'No traces',
  'sidebar.branch': 'branch',
  'sidebar.deviceAuto': 'Auto',

  // -- Status Bar --
  'statusBar.off': 'iTeam: Off',
  'statusBar.connecting': 'iTeam: ...',
  'statusBar.idle': 'iTeam: Idle',
  'statusBar.error': 'iTeam: Error',
  'statusBar.working': 'iTeam: {0}',
  'statusBar.tooltip.disconnected': 'iTeam: Disconnected. Click to connect.',
  'statusBar.tooltip.connecting': 'iTeam: Connecting...',
  'statusBar.tooltip.connected': 'iTeam: Connected. Click for options.',
  'statusBar.tooltip.working': 'iTeam: Working — {0}',
  'statusBar.tooltip.error': 'iTeam: Connection error. Click to reconnect.',

  // -- Task Tree --
  'taskTree.running': 'Running',
  'taskTree.pending': 'Pending',
  'taskTree.noTasks': 'No tasks',

  // -- Connection Commands --
  'cmd.alreadyConnected': 'iTeam: Already connected.',
  'cmd.serverNotConfigured': 'iTeam: Server URL not configured.',
  'cmd.openSettings': 'Open Settings',
  'cmd.connectedToServer': 'iTeam: Connected to server.',
  'cmd.connectionFailed': 'iTeam: Connection failed — {0}',
  'cmd.notConnected': 'iTeam: Not connected.',
  'cmd.disconnected': 'iTeam: Disconnected.',
  'cmd.deviceInfoTitle': 'iTeam Device Info',
  'cmd.deviceInfoPlaceholder': 'Device information',
  'cmd.deviceId': 'Device ID: {0}',
  'cmd.status': 'Status: {0}',
  'cmd.server': 'Server: {0}',
  'cmd.role': 'Role: {0}',
  'cmd.skills': 'Skills: {0}',
  'cmd.ai': 'AI: {0}',

  // -- Config Commands --
  'cmd.setRoleTitle': 'Set Device Role',
  'cmd.setRolePlaceholder': 'Current: {0}',
  'cmd.roleSetTo': 'iTeam: Role set to {0}',
  'cmd.setSkillsTitle': 'Set Device Skills',
  'cmd.setSkillsPrompt': 'Enter skills separated by commas',
  'cmd.setSkillsPlaceholder': 'typescript, react, nodejs',
  'cmd.skillsSetTo': 'iTeam: Skills set to {0}',

  // -- Task Commands --
  'cmd.noPendingTasks': 'iTeam: No pending tasks.',
  'cmd.taskAlreadyRunning': 'iTeam: A task is already running — {0}',
  'cmd.selectTaskTitle': 'Select Task to Execute',
  'cmd.selectTaskPlaceholder': 'Choose a task from the queue',

  // -- Task Service --
  'task.promptCopied': 'iTeam: Task prompt copied to clipboard.',
  'task.execute': 'Execute',
  'task.defer': 'Defer',
  'task.received': 'iTeam Task: {0}',
  'task.apiKeyNotConfigured': 'Anthropic API key not configured. Set "iteam.anthropicApiKey" in settings.',
  'task.taskTitle': '=== Task: {0} ===',
  'task.model': 'Model: {0}',
  'task.modelApi': 'Model: {0} (Anthropic API)',
  'task.taskCompleted': '=== Task completed ===',

  // -- Extension --
  'ext.roleChanged': 'iTeam: Role changed {0} -> {1}',
  'ext.configUpdated': 'iTeam: Config updated — role: {0}',

  // -- Language --
  'cmd.switchLanguage': 'Switch Language',
} as const;

export type LocaleKey = keyof typeof en;
