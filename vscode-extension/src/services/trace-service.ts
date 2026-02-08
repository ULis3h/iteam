import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import type { TraceSession, TraceEntry, TraceEntryType, Task } from '../types';
import type { SocketService } from './socket-service';

export class TraceService implements vscode.Disposable {
  private currentSession: TraceSession | null = null;
  private sessions: TraceSession[] = [];
  private entries: Map<string, TraceEntry[]> = new Map();

  private readonly _onSessionChanged = new vscode.EventEmitter<TraceSession | null>();
  readonly onSessionChanged = this._onSessionChanged.event;

  constructor(private socketService: SocketService) {}

  get current(): TraceSession | null {
    return this.currentSession;
  }

  get recentSessions(): ReadonlyArray<TraceSession> {
    return this.sessions.slice(-20);
  }

  getEntries(sessionId: string): ReadonlyArray<TraceEntry> {
    return this.entries.get(sessionId) || [];
  }

  createSession(task: Task): TraceSession {
    const session: TraceSession = {
      id: crypto.randomUUID(),
      taskId: task.id,
      deviceId: this.socketService.getDeviceId() || 'unknown',
      status: 'running',
      title: task.title || task.description,
      startTime: new Date().toISOString(),
    };

    this.currentSession = session;
    this.sessions.push(session);
    this.entries.set(session.id, []);
    this._onSessionChanged.fire(session);

    this.socketService.syncTraceSession(session);
    logger.info(`Trace session started: ${session.id}`);

    return session;
  }

  addEntry(
    type: TraceEntryType,
    title: string,
    content: string,
    metadata?: Record<string, unknown>,
    duration?: number,
  ): TraceEntry | null {
    if (!this.currentSession) {
      return null;
    }

    const entry: TraceEntry = {
      id: crypto.randomUUID(),
      sessionId: this.currentSession.id,
      type,
      title,
      content,
      metadata,
      duration,
      timestamp: new Date().toISOString(),
    };

    const sessionEntries = this.entries.get(this.currentSession.id);
    sessionEntries?.push(entry);

    this.socketService.syncTraceEntry(entry);
    return entry;
  }

  endSession(status: 'completed' | 'failed'): void {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.status = status;
    this.currentSession.endTime = new Date().toISOString();

    this.socketService.syncTraceSession(this.currentSession);
    logger.info(`Trace session ended: ${this.currentSession.id} (${status})`);

    this.currentSession = null;
    this._onSessionChanged.fire(null);
  }

  // Convenience methods matching agent-client patterns
  logTaskReceived(task: Task): void {
    this.addEntry('task_received', 'Task Received', JSON.stringify(task, null, 2));
  }

  logThinking(title: string, content: string): void {
    this.addEntry('thinking', title, content);
  }

  logStep(title: string, content: string, duration?: number): void {
    this.addEntry('step', title, content, undefined, duration);
  }

  logResult(content: string): void {
    this.addEntry('result', 'Result', content);
  }

  logError(content: string): void {
    this.addEntry('error', 'Error', content);
  }

  dispose(): void {
    this._onSessionChanged.dispose();
  }
}
