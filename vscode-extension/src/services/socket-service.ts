import { io, Socket } from 'socket.io-client';
import * as vscode from 'vscode';
import { WS_EVENTS, DEFAULTS } from '../utils/constants';
import { getSystemInfo, getDeviceName } from '../utils/system-info';
import { logger } from '../utils/logger';
import type {
  DeviceInfo,
  DeviceRegistered,
  DeviceStatus,
  HeartbeatData,
  Task,
  TaskStatusUpdate,
  ConfigUpdate,
  ConnectionState,
  TraceSession,
  TraceEntry,
} from '../types';
import type { ConfigService } from './config-service';

export class SocketService implements vscode.Disposable {
  private socket: Socket | null = null;
  private deviceId: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private configService: ConfigService;

  private _state: ConnectionState = 'disconnected';
  private readonly _onStateChanged = new vscode.EventEmitter<ConnectionState>();
  private readonly _onTaskAssigned = new vscode.EventEmitter<Task>();
  private readonly _onConfigUpdated = new vscode.EventEmitter<ConfigUpdate>();
  private readonly _onDeviceRegistered = new vscode.EventEmitter<DeviceRegistered>();

  readonly onStateChanged = this._onStateChanged.event;
  readonly onTaskAssigned = this._onTaskAssigned.event;
  readonly onConfigUpdated = this._onConfigUpdated.event;
  readonly onDeviceRegistered = this._onDeviceRegistered.event;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  get state(): ConnectionState {
    return this._state;
  }

  get isConnected(): boolean {
    return this._state === 'connected';
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  async connect(): Promise<void> {
    if (this.socket) {
      this.disconnect();
    }

    const url = this.configService.serverUrl;
    const apiKey = this.configService.apiKey;

    this.setState('connecting');
    logger.info(`Connecting to ${url}...`);

    return new Promise((resolve, reject) => {
      this.socket = io(url, {
        transports: ['websocket'],
        auth: { apiKey },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        reconnectionAttempts: Infinity,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        logger.info('WebSocket connected');
        this.setState('connected');
        this.registerDevice();
        this.startHeartbeat();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        logger.error(`Connection error: ${error.message}`);
        if (this._state === 'connecting') {
          this.setState('error');
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        logger.warn(`Disconnected: ${reason}`);
        this.stopHeartbeat();
        if (reason !== 'io client disconnect') {
          // Unintentional disconnect — Socket.io will auto-reconnect
          this.setState('connecting');
        } else {
          this.setState('disconnected');
        }
      });

      this.socket.io.on('reconnect', () => {
        logger.info('Reconnected to server');
        this.setState('connected');
        this.registerDevice();
        this.startHeartbeat();
      });

      this.socket.io.on('reconnect_attempt', (attempt) => {
        logger.info(`Reconnection attempt ${attempt}`);
      });

      // Server events
      this.socket.on(WS_EVENTS.DEVICE_REGISTERED, (data: DeviceRegistered) => {
        this.deviceId = data.id || data.deviceId || null;
        logger.info(`Device registered: ${data.name} (${this.deviceId})`);
        this._onDeviceRegistered.fire(data);
      });

      this.socket.on(WS_EVENTS.TASK_ASSIGNED, (task: Task) => {
        logger.info(`Task received: ${task.title || task.id}`);
        this._onTaskAssigned.fire(task);
      });

      this.socket.on(WS_EVENTS.DEVICE_CONFIG_UPDATED, (data: ConfigUpdate) => {
        logger.info(`Config updated: role=${data.role}`);
        this._onConfigUpdated.fire(data);
      });

      this.socket.on(WS_EVENTS.HEARTBEAT_ACK, () => {
        // Heartbeat acknowledged, connection is healthy
      });

      this.socket.on(WS_EVENTS.ERROR, (error: { message: string }) => {
        logger.error(`Server error: ${error.message}`);
      });
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.deviceId = null;
    this.setState('disconnected');
    logger.info('Disconnected from server');
  }

  private registerDevice(): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    const deviceInfo: DeviceInfo = {
      name: getDeviceName(this.configService.deviceName),
      type: DEFAULTS.DEVICE_TYPE,
      os: process.platform,
      ip: '127.0.0.1',
      metadata: getSystemInfo({
        role: this.configService.role,
        skills: this.configService.skills,
        aiProvider: this.configService.aiProvider,
        aiModel: this.configService.aiModel,
      }),
    };

    logger.info(`Registering device: ${deviceInfo.name}`);
    this.socket.emit(WS_EVENTS.DEVICE_REGISTER, deviceInfo);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    const interval = this.configService.heartbeatInterval;

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendHeartbeat(): void {
    if (!this.socket || !this.isConnected || !this.deviceId) {
      return;
    }

    const data: HeartbeatData = {
      deviceId: this.deviceId,
      timestamp: Date.now(),
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      aiProvider: this.configService.aiProvider,
      aiModel: this.configService.aiModel,
    };

    this.socket.emit(WS_EVENTS.DEVICE_HEARTBEAT, data);
  }

  updateStatus(status: DeviceStatus['status']): void {
    if (!this.socket || !this.isConnected || !this.deviceId) {
      return;
    }

    this.socket.emit(WS_EVENTS.DEVICE_STATUS, {
      deviceId: this.deviceId,
      status,
    });
  }

  updateTaskStatus(taskId: string, status: string, result?: unknown): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    const update: TaskStatusUpdate = {
      taskId,
      status: status as TaskStatusUpdate['status'],
      result,
      deviceId: this.deviceId!,
    };

    this.socket.emit(WS_EVENTS.TASK_STATUS, update);
  }

  updateAgentConfig(): void {
    if (!this.socket || !this.isConnected || !this.deviceId) {
      return;
    }

    this.socket.emit(WS_EVENTS.DEVICE_CONFIG_UPDATE, {
      deviceId: this.deviceId,
      aiProvider: this.configService.aiProvider,
      aiModel: this.configService.aiModel,
      role: this.configService.role,
      skills: this.configService.skills,
    });
  }

  syncTraceSession(session: TraceSession): void {
    if (!this.socket || !this.isConnected) {
      return;
    }
    this.socket.emit(WS_EVENTS.TRACE_SESSION, session);
  }

  syncTraceEntry(entry: TraceEntry): void {
    if (!this.socket || !this.isConnected) {
      return;
    }
    this.socket.emit(WS_EVENTS.TRACE_ENTRY, entry);
  }

  private setState(state: ConnectionState): void {
    if (this._state !== state) {
      this._state = state;
      this._onStateChanged.fire(state);
    }
  }

  dispose(): void {
    this.disconnect();
    this._onStateChanged.dispose();
    this._onTaskAssigned.dispose();
    this._onConfigUpdated.dispose();
    this._onDeviceRegistered.dispose();
  }
}
