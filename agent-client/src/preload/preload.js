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
  }
});

console.log('Preload script loaded');
