const io = require('socket.io-client');
const os = require('os');

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.config = null;
    this.deviceId = null;
    this.eventHandlers = {
      taskReceived: [],
      statusUpdate: [],
      configUpdated: [],
      connected: [],
      disconnected: [],
      error: []
    };
  }

  // 连接到服务器
  connect(config) {
    return new Promise((resolve, reject) => {
      try {
        const { url, apiKey, agentConfig } = config;
        this.config = config;

        // 创建socket连接
        this.socket = io(url, {
          transports: ['websocket'],
          auth: {
            apiKey: apiKey
          }
        });

        // 连接成功
        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.connected = true;

          // 注册设备
          this.registerDevice(agentConfig);

          this.emit('connected');
          resolve({ success: true });
        });

        // 连接错误
        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.emit('error', { message: '连接错误: ' + error.message });
          reject(error);
        });

        // 断开连接
        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected:', reason);
          this.connected = false;
          this.emit('disconnected', { reason });
        });

        // 接收任务
        this.socket.on('task:assigned', (task) => {
          console.log('Task received:', task);
          this.emit('taskReceived', task);
        });

        // 状态更新
        this.socket.on('status:update', (status) => {
          console.log('Status update:', status);
          this.emit('statusUpdate', status);
        });

        // 设备注册确认
        this.socket.on('device:registered', (data) => {
          console.log('Device registered:', data);
          this.deviceId = data.id || data.deviceId;
        });

        // 设备配置更新（角色/技能变更）
        this.socket.on('device:config-updated', (data) => {
          console.log('[SocketService] 收到配置更新:', data.name, data.role);
          this.emit('configUpdated', data);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // 注册设备
  registerDevice(agentConfig) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    // 保存配置以便后续使用
    this.agentConfig = agentConfig;

    const deviceInfo = {
      name: agentConfig.name,
      type: 'claude-code',
      os: os.platform(),
      ip: '127.0.0.1', // 本地IP，可以后续改进获取真实IP
      metadata: {
        role: agentConfig.role,
        skills: agentConfig.skills,
        aiProvider: agentConfig.aiProvider || 'anthropic',
        aiModel: agentConfig.aiModel || 'claude-sonnet-4-5',
        arch: os.arch(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      }
    };

    console.log('Registering device:', deviceInfo);
    this.socket.emit('device:register', deviceInfo);
  }

  // 断开连接
  disconnect() {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
        this.connected = false;
        this.deviceId = null;
      }
      resolve({ success: true });
    });
  }

  // 更新设备状态
  updateStatus(status) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('device:status', {
      deviceId: this.deviceId,
      status: status
    });
  }

  // 更新任务状态
  updateTaskStatus(taskId, status, result = null) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('task:status', {
      taskId: taskId,
      status: status,
      result: result,
      deviceId: this.deviceId
    });
  }

  // 发送心跳
  sendHeartbeat() {
    if (!this.socket || !this.connected) {
      return;
    }

    const heartbeatData = {
      deviceId: this.deviceId,
      timestamp: Date.now(),
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage()
    };

    // 包含当前AI配置信息
    if (this.agentConfig) {
      heartbeatData.aiProvider = this.agentConfig.aiProvider;
      heartbeatData.aiModel = this.agentConfig.aiModel;
    }

    this.socket.emit('device:heartbeat', heartbeatData);
  }

  // 更新Agent配置
  updateAgentConfig(agentConfig) {
    this.agentConfig = agentConfig;

    // 如果已连接，发送配置更新到服务器
    if (this.socket && this.connected && this.deviceId) {
      this.socket.emit('device:config-update', {
        deviceId: this.deviceId,
        aiProvider: agentConfig.aiProvider,
        aiModel: agentConfig.aiModel,
        role: agentConfig.role,
        skills: agentConfig.skills
      });
    }
  }

  // 注册事件处理器
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
  }

  // 触发事件
  emit(event, data) {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // 检查连接状态
  isConnected() {
    return this.connected;
  }

  // 获取设备ID
  getDeviceId() {
    return this.deviceId;
  }
}

module.exports = new SocketService();
