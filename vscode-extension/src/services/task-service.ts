import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import type { Task, TaskType } from '../types';
import type { SocketService } from './socket-service';
import type { ConfigService } from './config-service';
import type { WorkspaceService } from './workspace-service';

export class TaskService implements vscode.Disposable {
  private taskQueue: Task[] = [];
  private currentTask: Task | null = null;
  private disposables: vscode.Disposable[] = [];

  private readonly _onTaskStarted = new vscode.EventEmitter<Task>();
  private readonly _onTaskCompleted = new vscode.EventEmitter<Task>();
  private readonly _onQueueChanged = new vscode.EventEmitter<void>();

  readonly onTaskStarted = this._onTaskStarted.event;
  readonly onTaskCompleted = this._onTaskCompleted.event;
  readonly onQueueChanged = this._onQueueChanged.event;

  constructor(
    private socketService: SocketService,
    private configService: ConfigService,
    private workspaceService: WorkspaceService,
  ) {
    this.disposables.push(
      socketService.onTaskAssigned((task) => this.handleTaskReceived(task)),
    );
  }

  get queue(): ReadonlyArray<Task> {
    return this.taskQueue;
  }

  get running(): Task | null {
    return this.currentTask;
  }

  private async handleTaskReceived(task: Task): Promise<void> {
    task.status = 'pending';
    this.taskQueue.push(task);
    this._onQueueChanged.fire();

    logger.info(`Task queued: ${task.title || task.id} (type: ${task.type})`);

    if (this.configService.taskAutoAccept) {
      await this.processNextTask();
      return;
    }

    const action = await vscode.window.showInformationMessage(
      `iTeam Task: ${task.title || task.description}`,
      'Execute',
      'Defer',
    );

    if (action === 'Execute') {
      await this.executeTask(task.id);
    }
  }

  async executeTask(taskId: string): Promise<void> {
    const taskIndex = this.taskQueue.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      logger.warn(`Task not found in queue: ${taskId}`);
      return;
    }

    if (this.currentTask) {
      logger.warn('A task is already running, queuing...');
      return;
    }

    const task = this.taskQueue.splice(taskIndex, 1)[0];
    this.currentTask = task;
    task.status = 'running';
    this._onTaskStarted.fire(task);
    this._onQueueChanged.fire();

    this.socketService.updateTaskStatus(task.id, 'running');
    this.socketService.updateStatus('working');

    logger.info(`Executing task: ${task.title || task.id}`);

    const mode = this.configService.taskExecutionMode;

    try {
      if (mode === 'terminal') {
        await this.executeInTerminal(task);
      } else if (mode === 'background') {
        await this.executeInBackground(task);
      } else {
        // manual mode: just log and let user handle
        logger.info(`Manual mode — task prompt:\n${this.buildPrompt(task)}`);
        await vscode.env.clipboard.writeText(this.buildPrompt(task));
        vscode.window.showInformationMessage(
          'iTeam: Task prompt copied to clipboard.',
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Task failed: ${msg}`);
      this.socketService.updateTaskStatus(task.id, 'failed', { error: msg });
      task.status = 'failed';
    } finally {
      this.currentTask = null;
      this.socketService.updateStatus('idle');
      this._onTaskCompleted.fire(task);
      this._onQueueChanged.fire();
      this.processNextTask();
    }
  }

  private async executeInTerminal(task: Task): Promise<void> {
    const ctx = this.workspaceService.getContext();
    const cwd = task.workDir || ctx.workspacePath;
    const command = this.buildClaudeCommand(task);

    const terminal = vscode.window.createTerminal({
      name: `iTeam: ${task.title || task.type}`,
      cwd,
    });

    terminal.show();
    terminal.sendText(command);

    // We can't easily detect terminal completion, so mark as completed
    // when the terminal closes. User can also manually report status.
    const closeDisposable = vscode.window.onDidCloseTerminal((closed) => {
      if (closed === terminal) {
        if (task.status === 'running') {
          task.status = 'completed';
          this.socketService.updateTaskStatus(task.id, 'completed');
        }
        closeDisposable.dispose();
      }
    });

    this.disposables.push(closeDisposable);
  }

  private async executeInBackground(task: Task): Promise<void> {
    const { spawn } = await import('child_process');
    const ctx = this.workspaceService.getContext();
    const cwd = task.workDir || ctx.workspacePath || process.cwd();
    const command = this.buildClaudeCommand(task);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn(command, [], {
        cwd,
        shell: true,
        env: { ...process.env },
      });

      let output = '';

      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        output += text;
        logger.info(`[task:stdout] ${text.trimEnd()}`);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        logger.warn(`[task:stderr] ${data.toString().trimEnd()}`);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          task.status = 'completed';
          this.socketService.updateTaskStatus(task.id, 'completed', { output });
          resolve();
        } else {
          task.status = 'failed';
          this.socketService.updateTaskStatus(task.id, 'failed', {
            exitCode: code,
            output,
          });
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  private buildClaudeCommand(task: Task): string {
    const parts = ['claude'];
    const model = this.configService.aiModel;

    if (model) {
      parts.push('--model', model);
    }

    switch (task.type) {
      case 'code_generation':
        if (task.prompt) {
          parts.push('--prompt', JSON.stringify(task.prompt));
        }
        break;
      case 'code_review':
        parts.push('--review');
        if (task.files?.length) {
          parts.push(...task.files);
        }
        break;
      case 'bug_fix':
        parts.push('--fix', JSON.stringify(task.description));
        if (task.file) {
          parts.push('--file', task.file);
        }
        break;
      case 'test_generation':
        parts.push('--test');
        if (task.file) {
          parts.push(task.file);
        }
        break;
      case 'refactor':
        parts.push('--refactor', JSON.stringify(task.description));
        if (task.file) {
          parts.push('--file', task.file);
        }
        break;
      case 'custom':
      default:
        parts.push(JSON.stringify(task.prompt || task.description));
        break;
    }

    if (task.autoApprove) {
      parts.push('--auto-approve');
    }
    if (task.verbose) {
      parts.push('--verbose');
    }

    return parts.join(' ');
  }

  private buildPrompt(task: Task): string {
    return task.prompt || task.description || `[${task.type}] ${task.title}`;
  }

  private async processNextTask(): Promise<void> {
    if (this.currentTask || this.taskQueue.length === 0) {
      return;
    }

    if (this.configService.taskAutoAccept) {
      const next = this.taskQueue[0];
      await this.executeTask(next.id);
    }
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this._onTaskStarted.dispose();
    this._onTaskCompleted.dispose();
    this._onQueueChanged.dispose();
  }
}
