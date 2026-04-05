import * as vscode from 'vscode';
import type { SocketService } from '../services/socket-service';
import type { ConfigService } from '../services/config-service';
import { logger } from '../utils/logger';
import { t } from '../i18n';

export function registerConnectionCommands(
  context: vscode.ExtensionContext,
  socketService: SocketService,
  configService: ConfigService,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('iteam.connect', async () => {
      if (socketService.isConnected) {
        vscode.window.showInformationMessage(t('cmd.alreadyConnected'));
        return;
      }

      if (!configService.isConfigured) {
        const action = await vscode.window.showWarningMessage(
          t('cmd.serverNotConfigured'),
          t('cmd.openSettings'),
        );
        if (action === t('cmd.openSettings')) {
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'iteam.serverUrl',
          );
        }
        return;
      }

      try {
        await socketService.connect();
        vscode.window.showInformationMessage(t('cmd.connectedToServer'));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Connect failed: ${msg}`);
        vscode.window.showErrorMessage(t('cmd.connectionFailed', msg));
      }
    }),

    vscode.commands.registerCommand('iteam.disconnect', () => {
      if (!socketService.isConnected) {
        vscode.window.showInformationMessage(t('cmd.notConnected'));
        return;
      }

      socketService.disconnect();
      vscode.window.showInformationMessage(t('cmd.disconnected'));
    }),

    vscode.commands.registerCommand('iteam.showDeviceInfo', () => {
      const deviceId = socketService.getDeviceId();
      const items = [
        t('cmd.deviceId', deviceId || 'N/A'),
        t('cmd.status', socketService.state),
        t('cmd.server', configService.serverUrl),
        t('cmd.role', configService.role),
        t('cmd.skills', configService.skills.join(', ')),
        t('cmd.ai', `${configService.aiProvider} / ${configService.aiModel}`),
      ];

      vscode.window.showQuickPick(items, {
        title: t('cmd.deviceInfoTitle'),
        placeHolder: t('cmd.deviceInfoPlaceholder'),
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
