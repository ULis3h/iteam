import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import type { Task, TaskType } from '../types';
import type { SocketService } from './socket-service';
import type { ConfigService } from './config-service';
import type { WorkspaceService } from './workspace-service';

// Output channel for IDE model responses
let ideOutputChannel: vscode.OutputChannel | undefined;

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
      if (mode === 'api') {
        await this.executeWithApi(task);
      } else if (mode === 'ide') {
        await this.executeWithIdeModel(task);
      } else if (mode === 'terminal') {
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

  /**
   * Execute a task using the Anthropic Messages API directly via HTTP.
   */
  private async executeWithApi(task: Task): Promise<void> {
    const apiKey = this.configService.anthropicApiKey;
    if (!apiKey) {
      throw new Error(
        'Anthropic API key not configured. Set "iteam.anthropicApiKey" in settings.',
      );
    }

    const model = this.configService.aiModel || 'claude-sonnet-4-5';
    const systemPrompt = this.buildSystemPrompt(task);
    const userPrompt = this.buildPrompt(task);

    // Ensure output channel
    if (!ideOutputChannel) {
      ideOutputChannel = vscode.window.createOutputChannel('iTeam AI');
    }
    ideOutputChannel.clear();
    ideOutputChannel.show(true);
    ideOutputChannel.appendLine(`=== Task: ${task.title || task.type} ===`);
    ideOutputChannel.appendLine(`Model: ${model} (Anthropic API)`);
    ideOutputChannel.appendLine('---');

    const requestBody = JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    });

    const fullOutput = await new Promise<string>((resolve, reject) => {
      const https = require('https');
      const req = https.request(
        {
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        },
        (res: any) => {
          if (res.statusCode !== 200) {
            let body = '';
            res.on('data', (d: Buffer) => (body += d.toString()));
            res.on('end', () => reject(new Error(`Anthropic API ${res.statusCode}: ${body}`)));
            return;
          }

          let output = '';
          let buffer = '';
          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const event = JSON.parse(data);
                if (event.type === 'content_block_delta' && event.delta?.text) {
                  output += event.delta.text;
                  ideOutputChannel!.append(event.delta.text);
                }
              } catch {
                // skip unparseable lines
              }
            }
          });

          res.on('end', () => resolve(output));
          res.on('error', reject);
        },
      );

      req.on('error', reject);
      req.write(requestBody);
      req.end();
    });

    ideOutputChannel.appendLine('');
    ideOutputChannel.appendLine('---');
    ideOutputChannel.appendLine('=== Task completed ===');

    task.status = 'completed';
    this.socketService.updateTaskStatus(task.id, 'completed', { output: fullOutput });
    logger.info(`API task completed: ${task.title || task.id}`);
  }

  /**
   * Execute a task using the VS Code built-in Language Model API.
   * Uses vscode.lm.selectChatModels() to find an available model,
   * then streams the response to an output channel.
   */
  private async executeWithIdeModel(task: Task): Promise<void> {
    // Select an available chat model from the IDE
    const models = await vscode.lm.selectChatModels();

    if (!models || models.length === 0) {
      // Fallback to API mode if available
      logger.warn('No IDE language models found, falling back to API mode...');
      return this.executeWithApi(task);
    }

    // Prefer the first available model
    const model = models[0];
    logger.info(`Using IDE model: ${model.name} (${model.vendor}/${model.family})`);

    // Build messages
    const systemPrompt = this.buildSystemPrompt(task);
    const userPrompt = this.buildPrompt(task);

    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt),
    ];

    // Ensure output channel exists
    if (!ideOutputChannel) {
      ideOutputChannel = vscode.window.createOutputChannel('iTeam AI');
    }
    ideOutputChannel.clear();
    ideOutputChannel.show(true);
    ideOutputChannel.appendLine(`=== Task: ${task.title || task.type} ===`);
    ideOutputChannel.appendLine(`Model: ${model.name}`);
    ideOutputChannel.appendLine('---');

    // Send request and stream response
    const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

    let fullOutput = '';
    for await (const fragment of response.text) {
      fullOutput += fragment;
      ideOutputChannel.append(fragment);
    }

    ideOutputChannel.appendLine('');
    ideOutputChannel.appendLine('---');
    ideOutputChannel.appendLine('=== Task completed ===');

    task.status = 'completed';
    this.socketService.updateTaskStatus(task.id, 'completed', { output: fullOutput });
    logger.info(`IDE model task completed: ${task.title || task.id}`);
  }

  /**
   * Build a system-level prompt that provides context about the task type.
   */
  private buildSystemPrompt(task: Task): string {
    const ctx = this.workspaceService.getContext();
    const workspace = ctx.projectName || ctx.workspacePath || 'unknown';

    const typeDescriptions: Record<string, string> = {
      code_generation: 'Generate code based on the requirements.',
      code_review: 'Review the provided code and suggest improvements.',
      bug_fix: 'Diagnose and fix the described bug.',
      test_generation: 'Generate comprehensive test cases.',
      refactor: 'Refactor the code for better quality.',
      custom: 'Complete the requested task.',
    };

    return [
      `You are an AI coding assistant working in the "${workspace}" workspace.`,
      `Task type: ${task.type}`,
      typeDescriptions[task.type] || typeDescriptions.custom,
      task.file ? `Target file: ${task.file}` : '',
      task.files?.length ? `Files: ${task.files.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
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
