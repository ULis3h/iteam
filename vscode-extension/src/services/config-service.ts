import * as vscode from 'vscode';
import { DEFAULTS } from '../utils/constants';

export class ConfigService implements vscode.Disposable {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;
  private disposable: vscode.Disposable;

  constructor() {
    this.disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('iteam')) {
        this._onDidChange.fire();
      }
    });
  }

  private get config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('iteam');
  }

  get serverUrl(): string {
    return this.config.get('serverUrl', DEFAULTS.SERVER_URL);
  }

  get apiKey(): string {
    return this.config.get('apiKey', '');
  }

  get deviceName(): string {
    return this.config.get('deviceName', '');
  }

  get role(): string {
    return this.config.get('role', DEFAULTS.ROLE);
  }

  get skills(): string[] {
    return this.config.get('skills', ['typescript']);
  }

  get aiProvider(): string {
    return this.config.get('aiProvider', DEFAULTS.AI_PROVIDER);
  }

  get aiModel(): string {
    return this.config.get('aiModel', DEFAULTS.AI_MODEL);
  }

  get autoConnect(): boolean {
    return this.config.get('autoConnect', true);
  }

  get heartbeatInterval(): number {
    return this.config.get('heartbeatInterval', DEFAULTS.HEARTBEAT_INTERVAL);
  }

  get taskExecutionMode(): 'ide' | 'api' | 'terminal' | 'background' | 'manual' {
    return this.config.get('taskExecution.mode', 'ide');
  }

  get anthropicApiKey(): string {
    return this.config.get('anthropicApiKey', '');
  }

  get taskAutoAccept(): boolean {
    return this.config.get('taskExecution.autoAccept', true);
  }

  get isConfigured(): boolean {
    return this.serverUrl.length > 0;
  }

  async updateRole(role: string): Promise<void> {
    await this.config.update('role', role, vscode.ConfigurationTarget.Global);
  }

  async updateSkills(skills: string[]): Promise<void> {
    await this.config.update('skills', skills, vscode.ConfigurationTarget.Global);
  }

  dispose(): void {
    this._onDidChange.dispose();
    this.disposable.dispose();
  }
}
