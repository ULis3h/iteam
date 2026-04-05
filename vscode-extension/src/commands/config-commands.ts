import * as vscode from 'vscode';
import type { ConfigService } from '../services/config-service';
import type { SocketService } from '../services/socket-service';
import { t } from '../i18n';

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
        title: t('cmd.setRoleTitle'),
        placeHolder: t('cmd.setRolePlaceholder', configService.role),
      });

      if (selected) {
        await configService.updateRole(selected);
        if (socketService.isConnected) {
          socketService.updateAgentConfig();
        }
        vscode.window.showInformationMessage(t('cmd.roleSetTo', selected));
      }
    }),

    vscode.commands.registerCommand('iteam.setSkills', async () => {
      const current = configService.skills.join(', ');
      const input = await vscode.window.showInputBox({
        title: t('cmd.setSkillsTitle'),
        prompt: t('cmd.setSkillsPrompt'),
        value: current,
        placeHolder: t('cmd.setSkillsPlaceholder'),
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
          t('cmd.skillsSetTo', skills.join(', ')),
        );
      }
    }),
  );
}
