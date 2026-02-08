import * as vscode from 'vscode';
import { COMMANDS, STATUS_BAR_ID } from '../utils/constants';
import type { ConnectionState } from '../types';

export class StatusBarProvider implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      STATUS_BAR_ID,
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.statusBarItem.command = COMMANDS.CONNECT;
    this.update('disconnected');
    this.statusBarItem.show();
  }

  update(state: ConnectionState, detail?: string): void {
    switch (state) {
      case 'disconnected':
        this.statusBarItem.text = '$(debug-disconnect) iTeam: Off';
        this.statusBarItem.tooltip = 'iTeam: Disconnected. Click to connect.';
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.command = COMMANDS.CONNECT;
        break;

      case 'connecting':
        this.statusBarItem.text = '$(sync~spin) iTeam: ...';
        this.statusBarItem.tooltip = `iTeam: Connecting...`;
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.command = undefined;
        break;

      case 'connected':
        this.statusBarItem.text = detail
          ? `$(pulse) iTeam: ${detail}`
          : '$(check) iTeam: Idle';
        this.statusBarItem.tooltip = detail
          ? `iTeam: Working — ${detail}`
          : 'iTeam: Connected. Click for options.';
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.command = COMMANDS.SHOW_DEVICE_INFO;
        break;

      case 'error':
        this.statusBarItem.text = '$(error) iTeam: Error';
        this.statusBarItem.tooltip = 'iTeam: Connection error. Click to reconnect.';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.errorBackground',
        );
        this.statusBarItem.command = COMMANDS.CONNECT;
        break;
    }
  }

  setWorking(taskTitle: string): void {
    this.update('connected', taskTitle);
  }

  setIdle(): void {
    this.update('connected');
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
