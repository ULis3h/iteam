import * as vscode from 'vscode';
import type { SocketService } from '../services/socket-service';
import type { ConfigService } from '../services/config-service';
import type { TaskService } from '../services/task-service';
import type { TraceService } from '../services/trace-service';
import type { WorkspaceService } from '../services/workspace-service';

export class SidebarProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private extensionUri: vscode.Uri,
    private socketService: SocketService,
    private configService: ConfigService,
    private taskService: TaskService,
    private traceService: TraceService,
    private workspaceService: WorkspaceService,
  ) {
    // Update webview when state changes
    this.disposables.push(
      socketService.onStateChanged(() => this.updateView()),
      socketService.onDeviceRegistered(() => this.updateView()),
      taskService.onQueueChanged(() => this.updateView()),
      traceService.onSessionChanged(() => this.updateView()),
    );
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'connect':
          vscode.commands.executeCommand('iteam.connect');
          break;
        case 'disconnect':
          vscode.commands.executeCommand('iteam.disconnect');
          break;
        case 'openSettings':
          vscode.commands.executeCommand('workbench.action.openSettings', 'iteam');
          break;
        case 'executeTask':
          vscode.commands.executeCommand('iteam.executeTask');
          break;
        case 'openDashboard':
          vscode.commands.executeCommand('iteam.openDashboard');
          break;
      }
    });

    this.updateView();
  }

  private updateView(): void {
    if (!this.view) {
      return;
    }
    this.view.webview.html = this.getHtml();
  }

  private getHtml(): string {
    const state = this.socketService.state;
    const deviceId = this.socketService.getDeviceId();
    const role = this.configService.role;
    const skills = this.configService.skills;
    const ctx = this.workspaceService.getContext();
    const queue = this.taskService.queue;
    const running = this.taskService.running;
    const traces = this.traceService.recentSessions;

    const statusDot = state === 'connected'
      ? '<span class="dot green"></span>'
      : state === 'connecting'
        ? '<span class="dot yellow"></span>'
        : '<span class="dot red"></span>';

    const connectBtn = state === 'connected'
      ? '<button onclick="send(\'disconnect\')">Disconnect</button>'
      : '<button onclick="send(\'connect\')">Connect</button>';

    const skillsHtml = skills.map((s) => `<span class="tag">${s}</span>`).join('');

    const taskRows = running
      ? `<div class="item"><span class="icon">&#9654;</span> ${running.title || running.id}</div>`
      : '';
    const pendingRows = queue
      .filter((t) => t.status === 'pending')
      .map((t) => `<div class="item"><span class="icon">&#9675;</span> ${t.title || t.id}</div>`)
      .join('');

    const traceRows = traces
      .slice(-5)
      .reverse()
      .map((s) => {
        const icon = s.status === 'completed' ? '&#10003;' : s.status === 'failed' ? '&#10007;' : '&#8943;';
        return `<div class="item"><span class="icon">${icon}</span> ${s.title || s.id}</div>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 8px; }
  .section { margin-bottom: 16px; }
  .section-title { font-weight: bold; margin-bottom: 6px; text-transform: uppercase; font-size: 11px; opacity: 0.7; }
  .row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .dot.green { background: #4caf50; }
  .dot.yellow { background: #ff9800; }
  .dot.red { background: #f44336; }
  .tag { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 4px; }
  .item { padding: 4px 0; display: flex; align-items: center; gap: 6px; }
  .icon { opacity: 0.6; }
  .mono { font-family: var(--vscode-editor-font-family); font-size: 11px; opacity: 0.7; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 4px 12px; cursor: pointer; border-radius: 3px; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  .link { color: var(--vscode-textLink-foreground); cursor: pointer; font-size: 12px; }
</style>
</head>
<body>
  <div class="section">
    <div class="section-title">Connection</div>
    <div class="row">${statusDot} ${state} ${connectBtn}</div>
    <div class="mono">${this.configService.serverUrl}</div>
  </div>

  <div class="section">
    <div class="section-title">Device</div>
    <div class="row"><strong>${this.configService.deviceName || 'Auto'}</strong></div>
    <div class="row"><span class="tag">${role}</span> ${skillsHtml}</div>
    ${deviceId ? `<div class="mono">ID: ${deviceId.slice(0, 8)}...</div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Workspace</div>
    <div>${ctx.projectName || 'No workspace'}</div>
    ${ctx.gitBranch ? `<div class="mono">branch: ${ctx.gitBranch}</div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Tasks (${queue.length + (running ? 1 : 0)})</div>
    ${taskRows}${pendingRows || '<div class="mono">No tasks</div>'}
  </div>

  <div class="section">
    <div class="section-title">Recent Traces</div>
    ${traceRows || '<div class="mono">No traces</div>'}
  </div>

  <div class="section">
    <span class="link" onclick="send('openSettings')">Settings</span>
    &nbsp;&middot;&nbsp;
    <span class="link" onclick="send('openDashboard')">Dashboard</span>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function send(cmd) { vscode.postMessage({ command: cmd }); }
  </script>
</body>
</html>`;
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
