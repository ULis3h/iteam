// WebSocket event names (must match server/src/websocket/index.ts)
export const WS_EVENTS = {
  // Client -> Server
  DEVICE_REGISTER: 'device:register',
  DEVICE_STATUS: 'device:status',
  DEVICE_HEARTBEAT: 'device:heartbeat',
  DEVICE_CONFIG_UPDATE: 'device:config-update',
  TASK_UPDATE: 'task:update',
  TASK_STATUS: 'task:status',
  TRACE_SESSION: 'trace:session',
  TRACE_ENTRY: 'trace:entry',
  TRACE_SUBSCRIBE: 'trace:subscribe',
  TRACE_UNSUBSCRIBE: 'trace:unsubscribe',
  PING: 'ping',

  // Server -> Client
  DEVICE_REGISTERED: 'device:registered',
  DEVICE_CONFIG_UPDATED: 'device:config-updated',
  TASK_ASSIGNED: 'task:assigned',
  STATUS_UPDATE: 'status:update',
  HEARTBEAT_ACK: 'heartbeat:ack',
  PONG: 'pong',
  TRACE_SESSION_UPDATE: 'trace:session:update',
  TRACE_ENTRY_UPDATE: 'trace:entry:update',
  ERROR: 'error',
} as const;

// Default configuration values
export const DEFAULTS = {
  SERVER_URL: 'http://localhost:3000',
  DEVICE_TYPE: 'vscode',
  HEARTBEAT_INTERVAL: 30000,
  AI_PROVIDER: 'anthropic',
  AI_MODEL: 'claude-sonnet-4-5',
  ROLE: 'fullstack',
} as const;

// VS Code command IDs
export const COMMANDS = {
  CONNECT: 'iteam.connect',
  DISCONNECT: 'iteam.disconnect',
  SET_ROLE: 'iteam.setRole',
  SET_SKILLS: 'iteam.setSkills',
  EXECUTE_TASK: 'iteam.executeTask',
  SHOW_DEVICE_INFO: 'iteam.showDeviceInfo',
  SHOW_LOGS: 'iteam.showLogs',
  OPEN_DASHBOARD: 'iteam.openDashboard',
} as const;

// Extension identifiers
export const EXTENSION_ID = 'iteam-vscode';
export const OUTPUT_CHANNEL_NAME = 'iTeam';
export const STATUS_BAR_ID = 'iteam-status';
