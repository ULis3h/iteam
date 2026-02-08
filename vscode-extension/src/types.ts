// Device types matching server Prisma schema
export interface DeviceInfo {
  name: string;
  type: string;
  os: string;
  ip: string;
  metadata: DeviceMetadata;
}

export interface DeviceMetadata {
  role: string;
  skills: string[];
  aiProvider: string;
  aiModel: string;
  arch: string;
  hostname: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  vscodeVersion?: string;
  workspaceName?: string;
}

export interface DeviceRegistered {
  id: string;
  deviceId?: string;
  name: string;
  type: string;
  status: string;
  role?: string;
  skills?: string;
}

export interface DeviceStatus {
  deviceId: string;
  name?: string;
  status: 'online' | 'offline' | 'idle' | 'working';
  currentProject?: string;
  currentModule?: string;
}

export interface HeartbeatData {
  deviceId: string;
  timestamp: number;
  cpuUsage: NodeJS.CpuUsage;
  memoryUsage: NodeJS.MemoryUsage;
  aiProvider?: string;
  aiModel?: string;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  projectId?: string;
  workDir?: string;
  files?: string[];
  file?: string;
  prompt?: string;
  autoApprove?: boolean;
  verbose?: boolean;
  status: TaskStatus;
}

export type TaskType =
  | 'code_generation'
  | 'code_review'
  | 'bug_fix'
  | 'test_generation'
  | 'refactor'
  | 'custom';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface TaskStatusUpdate {
  taskId: string;
  status: TaskStatus;
  result?: unknown;
  deviceId: string;
}

// Trace types
export interface TraceSession {
  id: string;
  taskId?: string;
  deviceId: string;
  status: string;
  title?: string;
  startTime: string;
  endTime?: string;
}

export interface TraceEntry {
  id: string;
  sessionId: string;
  type: TraceEntryType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  duration?: number;
  timestamp: string;
}

export type TraceEntryType =
  | 'task_received'
  | 'thinking'
  | 'discussion'
  | 'step'
  | 'result'
  | 'error';

// Config update from server
export interface ConfigUpdate {
  name: string;
  role: string;
  skills: string | string[];
  oldRole?: string;
}

// Connection state
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';
