import * as vscode from 'vscode';
import type { ConfigService } from '../services/config-service';
import type { SocketService } from '../services/socket-service';

export function registerConfigCommands(
  context: vscode.ExtensionContext,
  configService: ConfigService,
  socketService: SocketService,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('iteam.setRole', async () => {
      const roles = [
        'frontend',
        'backend',
        'fullstack',
        'devops',
        'qa',
        'architect',
        'pm',
        'designer',
      ];

      const selected = await vscode.window.showQuickPick(roles, {
        title: 'Set Device Role',
        placeHolder: `Current: ${configService.role}`,
      });

      if (selected) {
        await configService.updateRole(selected);
        if (socketService.isConnected) {
          socketService.updateAgentConfig();
        }
        vscode.window.showInformationMessage(`iTeam: Role set to ${selected}`);
      }
    }),

    vscode.commands.registerCommand('iteam.setSkills', async () => {
      const current = configService.skills.join(', ');
      const input = await vscode.window.showInputBox({
        title: 'Set Device Skills',
        prompt: 'Enter skills separated by commas',
        value: current,
        placeHolder: 'typescript, react, nodejs',
      });

      if (input !== undefined) {
        const skills = input
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        await configService.updateSkills(skills);
        if (socketService.isConnected) {
          socketService.updateAgentConfig();
        }
        vscode.window.showInformationMessage(
          `iTeam: Skills set to ${skills.join(', ')}`,
        );
      }
    }),
  );
}
