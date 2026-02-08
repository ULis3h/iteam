import * as vscode from 'vscode';
import type { SocketService } from '../services/socket-service';
import type { ConfigService } from '../services/config-service';
import { logger } from '../utils/logger';

export function registerConnectionCommands(
  context: vscode.ExtensionContext,
  socketService: SocketService,
  configService: ConfigService,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('iteam.connect', async () => {
      if (socketService.isConnected) {
        vscode.window.showInformationMessage('iTeam: Already connected.');
        return;
      }

      if (!configService.isConfigured) {
        const action = await vscode.window.showWarningMessage(
          'iTeam: Server URL not configured.',
          'Open Settings',
        );
        if (action === 'Open Settings') {
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'iteam.serverUrl',
          );
        }
        return;
      }

      try {
        await socketService.connect();
        vscode.window.showInformationMessage('iTeam: Connected to server.');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Connect failed: ${msg}`);
        vscode.window.showErrorMessage(`iTeam: Connection failed — ${msg}`);
      }
    }),

    vscode.commands.registerCommand('iteam.disconnect', () => {
      if (!socketService.isConnected) {
        vscode.window.showInformationMessage('iTeam: Not connected.');
        return;
      }

      socketService.disconnect();
      vscode.window.showInformationMessage('iTeam: Disconnected.');
    }),

    vscode.commands.registerCommand('iteam.showDeviceInfo', () => {
      const deviceId = socketService.getDeviceId();
      const items = [
        `Device ID: ${deviceId || 'N/A'}`,
        `Status: ${socketService.state}`,
        `Server: ${configService.serverUrl}`,
        `Role: ${configService.role}`,
        `Skills: ${configService.skills.join(', ')}`,
        `AI: ${configService.aiProvider} / ${configService.aiModel}`,
      ];

      vscode.window.showQuickPick(items, {
        title: 'iTeam Device Info',
        placeHolder: 'Device information',
      });
    }),

    vscode.commands.registerCommand('iteam.showLogs', () => {
      logger.show();
    }),

    vscode.commands.registerCommand('iteam.openDashboard', () => {
      const url = configService.serverUrl.replace(/:\d+$/, ':5173');
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),
  );
}
