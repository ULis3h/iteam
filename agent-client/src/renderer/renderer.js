// 错误处理：捕获全局错误并显示
window.onerror = function (message, source, lineno, colno, error) {
  console.error('Global Error:', message, error);
  const errDiv = document.createElement('div');
  errDiv.style.position = 'fixed';
  errDiv.style.bottom = '0';
  errDiv.style.left = '0';
  errDiv.style.right = '0';
  errDiv.style.background = 'rgba(239, 68, 68, 0.9)';
  errDiv.style.color = '#fff';
  errDiv.style.padding = '8px';
  errDiv.style.fontSize = '12px';
  errDiv.style.zIndex = '9999';
  errDiv.textContent = `JS Error: ${message} (${source}:${lineno})`;
  document.body.appendChild(errDiv);
};

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

// DOM元素引用 (将在 DOMContentLoaded 后填充)
let elements = {};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    initElements();
    bindEventListeners();
    loadSavedConfig();
    setupIPCListeners();

    // 默认显示第一个标签页
    switchTab('dashboard');

    addLog('info', 'iTeam Agent Client 已启动');

    // 检查 Electron API
    if (!window.electronAPI) {
      addLog('error', 'Electron IPC API 未加载，功能将受限');
    }
  } catch (err) {
    console.error('Initalization error:', err);
    alert('应用初始化失败: ' + err.message);
  }
});

function initElements() {
  elements = {
    // 导航
    navTabs: document.querySelectorAll('.nav-tab'),
    tabContents: document.querySelectorAll('.tab-content'),

    // 连接状态
    connectionStatus: document.getElementById('connection-status'),

    // 仪表盘元素
    dashboardAiModel: document.getElementById('dashboard-ai-model'),

    // 配置表单
    serverUrl: document.getElementById('server-url'),
    apiKey: document.getElementById('api-key'),
    connectBtn: document.getElementById('connect-btn'),
    disconnectBtn: document.getElementById('disconnect-btn'),

    agentName: document.getElementById('agent-name'),
    agentRole: document.getElementById('agent-role'),
    agentSkills: document.getElementById('agent-skills'),

    aiProvider: document.getElementById('ai-provider'),
    aiModel: document.getElementById('ai-model'),
    apiKeyInput: document.getElementById('api-key-input'),
    apiBaseUrl: document.getElementById('api-base-url'),
    saveConfigBtn: document.getElementById('save-config-btn'),

    // 任务列表
    taskList: document.getElementById('task-list'),

    // 日志
    logTerminal: document.getElementById('log-terminal'),

    // 状态统计
    statusBadge: document.getElementById('agent-status-badge'),
    taskCountBadge: document.getElementById('task-count-badge')
  };
}

// 更新仪表盘 UI 显示
function updateDashboardUI() {
  if (elements.dashboardAiModel && appState.agentConfig) {
    const model = appState.agentConfig.aiModel || '未配置';
    const provider = appState.agentConfig.aiProvider || 'anthropic';
    let providerLabel = provider;

    if (provider === 'anthropic') providerLabel = 'Claude';
    if (provider === 'openai') providerLabel = 'GPT';

    elements.dashboardAiModel.textContent = `${providerLabel} / ${model}`;
  }
}

// 切换标签页
function switchTab(tabId) {
  // 更新 Tab 样式
  if (elements.navTabs) {
    elements.navTabs.forEach(tab => {
      if (tab.dataset.tab === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  // 更新内容显示
  if (elements.tabContents) {
    elements.tabContents.forEach(content => {
      if (content.id === `tab-${tabId}`) {
        // 恢复 CSS 中定义的 display (flex)
        content.style.display = '';
      } else {
        content.style.display = 'none';
      }
    });
  }
}

// 加载配置
function loadSavedConfig() {
  const savedConfig = localStorage.getItem('agentConfig');
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig);

      // 填充表单
      if (elements.agentName) elements.agentName.value = config.name || '';
      if (elements.agentRole) elements.agentRole.value = config.role || '';
      if (elements.agentSkills) elements.agentSkills.value = config.skills ? config.skills.join(',') : '';

      if (elements.aiProvider) {
        elements.aiProvider.value = config.aiProvider || 'anthropic';
        updateModelOptions(); // 更新模型选项
      }

      if (elements.aiModel) elements.aiModel.value = config.aiModel || 'claude-sonnet-4-5';
      if (elements.apiKeyInput) elements.apiKeyInput.value = config.apiKey || '';
      if (elements.apiBaseUrl) elements.apiBaseUrl.value = config.apiBaseUrl || '';

      appState.agentConfig = config;

      // 同步更新仪表盘
      updateDashboardUI();

    } catch (e) {
      console.error('加载配置失败', e);
      addLog('error', '加载保存的配置失败');
    }
  }
}

// 保存配置
function saveConfig() {
  const config = {
    name: elements.agentName ? elements.agentName.value.trim() : '',
    role: elements.agentRole ? elements.agentRole.value : '',
    skills: elements.agentSkills ? elements.agentSkills.value.split(',').map(s => s.trim()).filter(s => s) : [],
    aiProvider: elements.aiProvider ? elements.aiProvider.value : 'anthropic',
    aiModel: elements.aiModel ? elements.aiModel.value : '',
    apiKey: elements.apiKeyInput ? elements.apiKeyInput.value.trim() : '',
    apiBaseUrl: elements.apiBaseUrl ? elements.apiBaseUrl.value.trim() : ''
  };

  if (!config.name || !config.role) {
    addLog('warning', '请填写完整的 Agent 信息');
    switchTab('config');
    return;
  }

  appState.agentConfig = config;
  localStorage.setItem('agentConfig', JSON.stringify(config));

  // 更新仪表盘
  updateDashboardUI();

  // 通知主进程
  if (window.electronAPI) {
    window.electronAPI.updateAgentConfig(config);
  }

  addLog('success', '配置已保存');
}

// 绑定事件
function bindEventListeners() {
  // Tab 切换
  if (elements.navTabs) {
    elements.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });
  }

  // 连接控制
  if (elements.connectBtn) {
    elements.connectBtn.addEventListener('click', connectToServer);
  }

  if (elements.disconnectBtn) {
    elements.disconnectBtn.addEventListener('click', disconnectFromServer);
  }

  // 配置保存
  if (elements.saveConfigBtn) {
    elements.saveConfigBtn.addEventListener('click', saveConfig);
  }

  // 监听输入变化自动更新 State
  if (elements.serverUrl) {
    elements.serverUrl.addEventListener('change', () => {
      appState.serverUrl = elements.serverUrl.value;
    });
  }

  if (elements.apiKey) {
    elements.apiKey.addEventListener('change', () => {
      appState.apiKey = elements.apiKey.value;
    });
  }

  // AI Provider change
  if (elements.aiProvider) {
    elements.aiProvider.addEventListener('change', updateModelOptions);
  }
}

// 更新模型选项
function updateModelOptions() {
  if (!elements.aiProvider) return;

  const provider = elements.aiProvider.value;
  const claudeModels = document.getElementById('claude-models');
  const openaiModels = document.getElementById('openai-models');

  if (!claudeModels || !openaiModels) return;

  if (provider === 'anthropic') {
    claudeModels.style.display = '';
    openaiModels.style.display = 'none';
  } else if (provider === 'openai') {
    claudeModels.style.display = 'none';
    openaiModels.style.display = '';
  } else {
    claudeModels.style.display = '';
    openaiModels.style.display = '';
  }
}

// IPC 监听
function setupIPCListeners() {
  if (!window.electronAPI) return;

  window.electronAPI.onTaskReceived((task) => {
    addTask(task);
    addLog('info', `收到新任务: ${task.title}`);
  });

  window.electronAPI.onLogMessage((log) => {
    addLog(log.level, log.message);
  });

  window.electronAPI.onStatusUpdate((status) => {
    updateStatus(status);
  });
}

// 连接逻辑
async function connectToServer() {
  if (!appState.agentConfig.name) {
    addLog('warning', '请先保存 Agent 配置');
    switchTab('config');
    return;
  }

  elements.connectBtn.disabled = true;
  elements.connectBtn.textContent = '连接中...';
  addLog('info', `正在连接到 ${appState.serverUrl}...`);

  try {
    if (!window.electronAPI) throw new Error('Electron API 不可用');

    const result = await window.electronAPI.connectToServer({
      url: appState.serverUrl,
      apiKey: appState.apiKey,
      agentConfig: appState.agentConfig
    });

    if (result.success) {
      appState.connected = true;
      updateConnectionUI(true);
      addLog('success', '已连接到服务器');
    } else {
      throw new Error(result.error || '连接失败');
    }
  } catch (error) {
    console.error('连接错误:', error);
    addLog('error', `连接失败: ${error.message}`);
    elements.connectBtn.disabled = false;
    elements.connectBtn.textContent = '连接服务器';
  }
}

async function disconnectFromServer() {
  try {
    if (window.electronAPI) {
      await window.electronAPI.disconnectFromServer();
    }
    appState.connected = false;
    updateConnectionUI(false);
    addLog('info', '已断开连接');
  } catch (error) {
    addLog('error', `断开失败: ${error.message}`);
  }
}

function updateConnectionUI(connected) {
  if (connected) {
    elements.connectBtn.style.display = 'none';
    elements.disconnectBtn.style.display = 'flex';
    elements.connectionStatus.innerHTML = '<span class="status-indicator online"></span><span>已连接</span>';
    elements.connectionStatus.classList.add('connected');

    // 更新 Header Badge
    if (elements.statusBadge) {
      elements.statusBadge.className = 'badge badge-success';
      elements.statusBadge.textContent = 'ONLINE';
    }
  } else {
    elements.connectBtn.style.display = 'flex';
    elements.connectBtn.disabled = false;
    elements.connectBtn.textContent = '连接服务器';
    elements.disconnectBtn.style.display = 'none';
    elements.connectionStatus.innerHTML = '<span class="status-indicator offline"></span><span>未连接</span>';
    elements.connectionStatus.classList.remove('connected');

    if (elements.statusBadge) {
      elements.statusBadge.className = 'badge badge-neutral';
      elements.statusBadge.textContent = 'OFFLINE';
    }
  }
}

// 任务管理
function addTask(task) {
  appState.tasks.unshift(task); // 新任务在最前
  renderTasks();

  // 更新 Badge
  if (elements.taskCountBadge) {
    const activeCount = appState.tasks.filter(t => t.status === 'running' || t.status === 'pending').length;
    elements.taskCountBadge.textContent = activeCount;
    elements.taskCountBadge.style.display = activeCount > 0 ? 'inline-flex' : 'none';
  }
}

function renderTasks() {
  const container = elements.taskList;
  if (!container) return;

  if (appState.tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 48px; margin-bottom: 16px;">☕</div>
        <p>暂无任务</p>
        <small style="color: var(--text-tertiary);">等待服务器分配任务...</small>
      </div>
    `;
    return;
  }

  container.innerHTML = appState.tasks.map(task => `
    <div class="data-row task-row" data-id="${task.id}">
      <div class="col-name">
        <div class="task-icon">${getTaskIcon(task.type)}</div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-weight: 500;">${task.title}</span>
          <span style="font-size: 12px; color: var(--text-tertiary);">${task.id.slice(0, 8)}...</span>
        </div>
      </div>
      
      <div class="col-status">
        ${getStatusBadge(task.status)}
      </div>
      
      <div class="col-progress">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${task.progress || 0}%; background: var(--accent-blue)"></div>
        </div>
      </div>
      
      <div class="col-time">
        ${formatTime(task.createdAt)}
      </div>
      
      <div class="col-actions">
        <button class="icon-btn-small" title="查看详情">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function getTaskIcon(type) {
  // 根据任务类型返回简单图标
  return '⚡';
}

function getStatusBadge(status) {
  const map = {
    pending: '<span class="badge badge-warning">等待中</span>',
    running: '<span class="badge badge-pro">执行中</span>',
    completed: '<span class="badge badge-success">已完成</span>',
    failed: '<span class="badge badge-error">失败</span>'
  };
  return map[status] || `<span class="badge">${status}</span>`;
}

// 日志管理
function addLog(level, message) {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  appState.logs.push({ time: timeStr, level, message });
  if (appState.logs.length > 200) appState.logs.shift();

  if (elements.logTerminal) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    let levelClass = 'info';
    if (level === 'error') levelClass = 'error';
    if (level === 'success') levelClass = 'success';
    if (level === 'warning') levelClass = 'warning';

    entry.innerHTML = `
      <span class="log-time">[${timeStr}]</span>
      <span class="log-level ${levelClass}">${level.toUpperCase()}</span>
      <span class="log-message">${message}</span>
    `;

    elements.logTerminal.appendChild(entry);
    elements.logTerminal.scrollTop = elements.logTerminal.scrollHeight;
  }
}

function updateStatus(status) {
  // 更新 UI 上的状态显示
  if (status.agentStatus && elements.statusBadge) {
    elements.statusBadge.textContent = status.agentStatus.toUpperCase();
  }
}

function formatTime(ts) {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleTimeString();
  } catch (e) {
    return '-';
  }
}
