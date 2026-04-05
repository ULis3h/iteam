import * as vscode from 'vscode';
import { COMMANDS, STATUS_BAR_ID } from '../utils/constants';
import type { ConnectionState } from '../types';
import { t } from '../i18n';

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
        this.statusBarItem.text = `$(debug-disconnect) ${t('statusBar.off')}`;
        this.statusBarItem.tooltip = t('statusBar.tooltip.disconnected');
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.command = COMMANDS.CONNECT;
        break;

      case 'connecting':
        this.statusBarItem.text = `$(sync~spin) ${t('statusBar.connecting')}`;
        this.statusBarItem.tooltip = t('statusBar.tooltip.connecting');
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.command = undefined;
        break;

      case 'connected':
        this.statusBarItem.text = detail
          ? `$(pulse) ${t('statusBar.working', detail)}`
          : `$(check) ${t('statusBar.idle')}`;
        this.statusBarItem.tooltip = detail
          ? t('statusBar.tooltip.working', detail)
          : t('statusBar.tooltip.connected');
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.command = COMMANDS.SHOW_DEVICE_INFO;
        break;

      case 'error':
        this.statusBarItem.text = `$(error) ${t('statusBar.error')}`;
        this.statusBarItem.tooltip = t('statusBar.tooltip.error');
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
