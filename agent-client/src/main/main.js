const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const socketService = require('../services/socket-service');
const claudeService = require('../services/claude-service');

let mainWindow;
let agentConfig = null;
let taskQueue = [];
let currentTask = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    },
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#1a1a2e'
  });

  // macOS: 设置 Dock 图标
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, '../../build/icon.png'));
  }

  // 加载应用
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 初始化服务
function initializeServices() {
  // Socket服务事件监听
  socketService.on('taskReceived', (task) => {
    handleTaskReceived(task);
  });

  socketService.on('statusUpdate', (status) => {
    sendToRenderer('status-update', status);
  });

  socketService.on('error', (error) => {
    sendLog('error', error.message);
  });

  socketService.on('connected', () => {
    sendLog('success', '已连接到iTeam服务器');
    // 启动心跳
    startHeartbeat();
  });

  socketService.on('disconnected', () => {
    sendLog('info', '已断开服务器连接');
    stopHeartbeat();
  });

  // Claude服务事件监听
  claudeService.on('started', (data) => {
    sendLog('info', `开始执行任务: ${data.task.title}`);
    socketService.updateStatus('working');
  });

  claudeService.on('output', (data) => {
    sendLog('info', data.data);
  });

  claudeService.on('error', (data) => {
    sendLog('error', data.data || data.error.message);
  });

  claudeService.on('complete', (data) => {
    handleTaskComplete(data.task, data.result);
  });
}

// 处理任务接收
function handleTaskReceived(task) {
  sendLog('info', `收到新任务: ${task.title}`);
  sendToRenderer('task-received', task);

  // 添加到任务队列
  taskQueue.push(task);

  // 如果当前没有任务在执行，开始执行
  if (!currentTask) {
    processNextTask();
  }
}

// 处理下一个任务
async function processNextTask() {
  if (taskQueue.length === 0) {
    currentTask = null;
    socketService.updateStatus('idle');
    return;
  }

  currentTask = taskQueue.shift();

  try {
    // 更新任务状态为执行中
    socketService.updateTaskStatus(currentTask.id, 'running');

    // 执行任务，传入agentConfig
    await claudeService.executeTask(currentTask, agentConfig);
  } catch (error) {
    sendLog('error', `任务执行失败: ${error.message}`);
    socketService.updateTaskStatus(currentTask.id, 'failed', {
      error: error.message
    });

    // 继续处理下一个任务
    processNextTask();
  }
}

// 处理任务完成
function handleTaskComplete(task, result) {
  if (result.success) {
    sendLog('success', `任务完成: ${task.title}`);
    socketService.updateTaskStatus(task.id, 'completed', {
      output: result.stdout
    });
  } else {
    sendLog('error', `任务失败: ${task.title}`);
    socketService.updateTaskStatus(task.id, 'failed', {
      error: result.stderr
    });
  }

  // 处理下一个任务
  setTimeout(() => {
    processNextTask();
  }, 1000);
}

// 心跳定时器
let heartbeatInterval = null;

function startHeartbeat() {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(() => {
    socketService.sendHeartbeat();
  }, 30000); // 每30秒发送一次心跳
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// 发送消息到渲染进程
function sendToRenderer(channel, data) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(channel, data);
  }
}

// 发送日志到渲染进程
function sendLog(level, message) {
  sendToRenderer('log-message', { level, message });
}

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  createWindow();
  initializeServices();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 清理资源
    socketService.disconnect();
    stopHeartbeat();
    app.quit();
  }
});

// ============== IPC通信处理器 ==============

// 应用信息
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

// 连接服务器
ipcMain.handle('connect-to-server', async (event, config) => {
  try {
    const result = await socketService.connect(config);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 断开服务器
ipcMain.handle('disconnect-from-server', async () => {
  try {
    await socketService.disconnect();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 更新Agent配置
ipcMain.handle('update-agent-config', async (event, config) => {
  agentConfig = config;

  // 通知 socket 服务更新配置
  socketService.updateAgentConfig(config);

  sendLog('info', `AI配置已更新: ${config.aiProvider}/${config.aiModel}`);
  return { success: true };
});

// 获取Agent配置
ipcMain.handle('get-agent-config', async () => {
  return agentConfig;
});

// 执行Claude Code
ipcMain.handle('execute-claude-code', async (event, { command, args }) => {
  try {
    const result = await claudeService.executeTask({
      type: 'custom',
      prompt: command,
      args: args
    });
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 更新任务状态
ipcMain.handle('update-task-status', async (event, { taskId, status }) => {
  socketService.updateTaskStatus(taskId, status);
  return { success: true };
});

console.log('iTeam Agent Client started');
