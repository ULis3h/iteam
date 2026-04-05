import * as vscode from 'vscode';
import type { TaskService } from '../services/task-service';
import { logger } from '../utils/logger';
import { t } from '../i18n';

export function registerTaskCommands(
  context: vscode.ExtensionContext,
  taskService: TaskService,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('iteam.executeTask', async () => {
      const queue = taskService.queue;

      if (queue.length === 0) {
        vscode.window.showInformationMessage(t('cmd.noPendingTasks'));
        return;
      }

      if (taskService.running) {
        vscode.window.showWarningMessage(
          t('cmd.taskAlreadyRunning', taskService.running.title || taskService.running.id),
        );
        return;
      }

      if (queue.length === 1) {
        await taskService.executeTask(queue[0].id);
        return;
      }

      const items = queue.map((task) => ({
        label: task.title || task.description || task.id,
        description: task.type,
        detail: task.description,
        taskId: task.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        title: t('cmd.selectTaskTitle'),
        placeHolder: t('cmd.selectTaskPlaceholder'),
      });

      if (selected) {
        await taskService.executeTask(selected.taskId);
      }
    }),
  );
}
