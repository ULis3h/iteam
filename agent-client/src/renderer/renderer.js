// 应用状态
let appState = {
  connected: false,
  serverUrl: 'http://localhost:3000',
  apiKey: 'iteam-device-key',
  agentConfig: {
    name: '',
    role: '',
    skills: []
  },
  tasks: [],
  logs: []
};

// DOM元素
const elements = {
  // 连接相关
  serverUrl: document.getElementById('server-url'),
  apiKey: document.getElementById('api-key'),
  connectBtn: document.getElementById('connect-btn'),
  disconnectBtn: document.getElementById('disconnect-btn'),
  connectionStatus: document.getElementById('connection-status'),

  // Agent配置
  agentName: document.getElementById('agent-name'),
  agentRole: document.getElementById('agent-role'),
  agentSkills: document.getElementById('agent-skills'),
  saveConfigBtn: document.getElementById('save-config-btn'),

  // AI模型配置
  aiProvider: document.getElementById('ai-provider'),
  aiModel: document.getElementById('ai-model'),
  apiKeyInput: document.getElementById('api-key-input'),
  apiBaseUrl: document.getElementById('api-base-url'),
  toggleApiKey: document.getElementById('toggle-api-key'),

  // 状态显示
  agentStatus: document.getElementById('agent-status'),
  taskQueueCount: document.getElementById('task-queue-count'),
  completedTasksCount: document.getElementById('completed-tasks-count'),

  // 任务和日志
  taskList: document.getElementById('task-list'),
  logTerminal: document.getElementById('log-terminal'),

  // 版本号
  appVersion: document.getElementById('app-version')
};

// 初始化
async function initialize() {
  // 获取应用版本
  try {
    const version = await window.electronAPI.getAppVersion();
    elements.appVersion.textContent = `v${version}`;
  } catch (error) {
    console.error('Failed to get app version:', error);
  }

  // 加载保存的配置
  loadSavedConfig();

  // 绑定事件监听器
  bindEventListeners();

  // 设置IPC监听器
  setupIPCListeners();

  addLog('info', 'iTeam Agent Client 已启动');
}

// 加载保存的配置
function loadSavedConfig() {
  const savedConfig = localStorage.getItem('agentConfig');
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig);
      elements.agentName.value = config.name || '';
      elements.agentRole.value = config.role || '';
      elements.agentSkills.value = config.skills ? config.skills.join(',') : '';

      // 加载AI模型配置
      elements.aiProvider.value = config.aiProvider || 'anthropic';
      elements.aiModel.value = config.aiModel || 'claude-sonnet-4-5';
      elements.apiKeyInput.value = config.apiKey || '';
      elements.apiBaseUrl.value = config.apiBaseUrl || '';

      appState.agentConfig = config;

      // 更新模型选项显示
      updateModelOptions();
    } catch (error) {
      console.error('Failed to load saved config:', error);
    }
  }
}

// 保存配置
function saveConfig() {
  const config = {
    name: elements.agentName.value.trim(),
    role: elements.agentRole.value,
    skills: elements.agentSkills.value.split(',').map(s => s.trim()).filter(s => s),
    aiProvider: elements.aiProvider.value,
    aiModel: elements.aiModel.value,
    apiKey: elements.apiKeyInput.value.trim(),
    apiBaseUrl: elements.apiBaseUrl.value.trim()
  };

  if (!config.name) {
    addLog('warning', '请输入设备名称');
    return;
  }

  if (!config.role) {
    addLog('warning', '请选择角色');
    return;
  }

  if (!config.apiKey) {
    addLog('warning', '请输入API Key');
    return;
  }

  appState.agentConfig = config;
  localStorage.setItem('agentConfig', JSON.stringify(config));

  // 通知主进程更新配置
  window.electronAPI.updateAgentConfig(config);

  addLog('success', '配置已保存');
}

// 绑定事件监听器
function bindEventListeners() {
  // 连接按钮
  elements.connectBtn.addEventListener('click', connectToServer);
  elements.disconnectBtn.addEventListener('click', disconnectFromServer);

  // 保存配置按钮
  elements.saveConfigBtn.addEventListener('click', saveConfig);

  // 服务器地址和API Key变化时保存
  elements.serverUrl.addEventListener('change', () => {
    appState.serverUrl = elements.serverUrl.value;
    localStorage.setItem('serverUrl', appState.serverUrl);
  });

  elements.apiKey.addEventListener('change', () => {
    appState.apiKey = elements.apiKey.value;
    localStorage.setItem('apiKey', appState.apiKey);
  });

  // AI提供商切换时更新模型选项
  elements.aiProvider.addEventListener('change', updateModelOptions);

  // API Key显示/隐藏切换
  elements.toggleApiKey.addEventListener('click', (e) => {
    e.preventDefault();
    const input = elements.apiKeyInput;
    input.type = input.type === 'password' ? 'text' : 'password';
  });
}

// 根据AI提供商更新模型选项
function updateModelOptions() {
  const provider = elements.aiProvider.value;
  const claudeModels = document.getElementById('claude-models');
  const openaiModels = document.getElementById('openai-models');

  if (provider === 'anthropic') {
    claudeModels.style.display = '';
    openaiModels.style.display = 'none';
    // 选择第一个Claude模型
    elements.aiModel.value = 'claude-sonnet-4-5';
  } else if (provider === 'openai') {
    claudeModels.style.display = 'none';
    openaiModels.style.display = '';
    // 选择第一个OpenAI模型
    elements.aiModel.value = 'gpt-4-turbo';
  } else {
    // custom - 显示所有选项
    claudeModels.style.display = '';
    openaiModels.style.display = '';
  }
}

// 设置IPC监听器
function setupIPCListeners() {
  // 接收任务
  window.electronAPI.onTaskReceived((task) => {
    addTask(task);
    addLog('info', `收到新任务: ${task.title}`);
  });

  // 接收日志
  window.electronAPI.onLogMessage((log) => {
    addLog(log.level, log.message);
  });

  // 状态更新
  window.electronAPI.onStatusUpdate((status) => {
    updateStatus(status);
  });
}

// 连接到服务器
async function connectToServer() {
  if (!appState.agentConfig.name) {
    addLog('warning', '请先配置Agent信息');
    return;
  }

  addLog('info', `正在连接到 ${appState.serverUrl}...`);
  elements.connectBtn.disabled = true;

  try {
    const result = await window.electronAPI.connectToServer({
      url: appState.serverUrl,
      apiKey: appState.apiKey,
      agentConfig: appState.agentConfig
    });

    if (result.success) {
      appState.connected = true;
      updateConnectionStatus(true);
      elements.connectBtn.disabled = true;
      elements.disconnectBtn.disabled = false;
      addLog('success', '已连接到服务器');
    } else {
      throw new Error(result.error || '连接失败');
    }
  } catch (error) {
    addLog('error', `连接失败: ${error.message}`);
    elements.connectBtn.disabled = false;
  }
}

// 断开服务器连接
async function disconnectFromServer() {
  addLog('info', '正在断开连接...');

  try {
    await window.electronAPI.disconnectFromServer();
    appState.connected = false;
    updateConnectionStatus(false);
    elements.connectBtn.disabled = false;
    elements.disconnectBtn.disabled = true;
    addLog('info', '已断开连接');
  } catch (error) {
    addLog('error', `断开连接失败: ${error.message}`);
  }
}

// 更新连接状态
function updateConnectionStatus(connected) {
  const statusIndicator = elements.connectionStatus.querySelector('.status-indicator');
  const statusText = elements.connectionStatus.querySelector('.status-text');

  if (connected) {
    statusIndicator.classList.remove('offline');
    statusIndicator.classList.add('online');
    statusText.textContent = '已连接';
  } else {
    statusIndicator.classList.remove('online');
    statusIndicator.classList.add('offline');
    statusText.textContent = '未连接';
  }
}

// 添加任务到列表
function addTask(task) {
  appState.tasks.push(task);
  renderTaskList();
  updateTaskCounts();
}

// 渲染任务列表
function renderTaskList() {
  if (appState.tasks.length === 0) {
    elements.taskList.innerHTML = `
      <div class="empty-state">
        <p>暂无任务</p>
        <small>连接到服务器后，任务将自动显示在这里</small>
      </div>
    `;
    return;
  }

  elements.taskList.innerHTML = appState.tasks.map(task => `
    <div class="task-item" data-task-id="${task.id}">
      <div class="task-header">
        <span class="task-title">${task.title}</span>
        <span class="task-status ${task.status}">${getTaskStatusText(task.status)}</span>
      </div>
      <div class="task-description">${task.description || '无描述'}</div>
      <div class="task-meta">
        <span>优先级: ${task.priority || '普通'}</span>
        <span>创建时间: ${formatTime(task.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

// 获取任务状态文本
function getTaskStatusText(status) {
  const statusMap = {
    pending: '待处理',
    running: '执行中',
    completed: '已完成',
    failed: '失败'
  };
  return statusMap[status] || status;
}

// 更新任务计数
function updateTaskCounts() {
  const queueCount = appState.tasks.filter(t => t.status === 'pending').length;
  const completedCount = appState.tasks.filter(t => t.status === 'completed').length;

  elements.taskQueueCount.textContent = queueCount;
  elements.completedTasksCount.textContent = completedCount;
}

// 更新状态
function updateStatus(status) {
  if (status.agentStatus) {
    elements.agentStatus.textContent = status.agentStatus;
  }
}

// 添加日志
function addLog(level, message) {
  const now = new Date();
  const time = now.toTimeString().split(' ')[0];

  const logEntry = {
    time,
    level,
    message
  };

  appState.logs.push(logEntry);

  // 限制日志数量
  if (appState.logs.length > 100) {
    appState.logs.shift();
  }

  renderLog(logEntry);
}

// 渲染日志
function renderLog(log) {
  const logElement = document.createElement('div');
  logElement.className = 'log-entry';
  logElement.innerHTML = `
    <span class="log-time">[${log.time}]</span>
    <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
    <span class="log-message">${log.message}</span>
  `;

  elements.logTerminal.appendChild(logElement);

  // 自动滚动到底部
  elements.logTerminal.scrollTop = elements.logTerminal.scrollHeight;
}

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN');
}

// 启动应用
initialize();
