const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  // Claude Code CLI调用
  executeClaudeCode: (command, args) => ipcRenderer.invoke('execute-claude-code', { command, args }),

  // 服务器连接
  connectToServer: (config) => ipcRenderer.invoke('connect-to-server', config),
  disconnectFromServer: () => ipcRenderer.invoke('disconnect-from-server'),

  // 任务管理
  onTaskReceived: (callback) => {
    ipcRenderer.on('task-received', (event, task) => callback(task));
  },
  updateTaskStatus: (taskId, status) => ipcRenderer.invoke('update-task-status', { taskId, status }),

  // Agent配置
  updateAgentConfig: (config) => ipcRenderer.invoke('update-agent-config', config),
  getAgentConfig: () => ipcRenderer.invoke('get-agent-config'),

  // 日志
  onLogMessage: (callback) => {
    ipcRenderer.on('log-message', (event, log) => callback(log));
  },

  // 状态更新
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (event, status) => callback(status));
  },

  // 配置更新（管理端修改角色/技能）
  onConfigUpdated: (callback) => {
    ipcRenderer.on('config-updated', (event, data) => callback(data));
  },

  // ============== MCP API ==============
  mcp: {
    // 连接到MCP服务器
    connect: (name, config) => ipcRenderer.invoke('mcp:connect', { name, config }),
    // 断开MCP服务器
    disconnect: (name) => ipcRenderer.invoke('mcp:disconnect', { name }),
    // 列出工具
    listTools: (serverName) => ipcRenderer.invoke('mcp:list-tools', { serverName }),
    // 调用工具
    callTool: (serverName, toolName, args) => ipcRenderer.invoke('mcp:call-tool', { serverName, toolName, args }),
    // 读取资源
    readResource: (serverName, uri) => ipcRenderer.invoke('mcp:read-resource', { serverName, uri }),
    // 获取连接状态
    status: () => ipcRenderer.invoke('mcp:status'),
  },

  // ============== 追踪 API ==============
  trace: {
    // 获取所有会话
    getSessions: (limit) => ipcRenderer.invoke('trace:get-sessions', { limit }),
    // 获取会话详情
    getSession: (sessionId) => ipcRenderer.invoke('trace:get-session', { sessionId }),
    // 获取当前会话
    getCurrent: () => ipcRenderer.invoke('trace:get-current'),
    // 清理旧数据
    cleanup: (daysToKeep) => ipcRenderer.invoke('trace:cleanup', { daysToKeep }),
  }
});

console.log('Preload script loaded');
