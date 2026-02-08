import * as vscode from 'vscode';
import type { Task } from '../types';
import type { TaskService } from '../services/task-service';

type TreeItem = TaskGroupItem | TaskItem;

class TaskGroupItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly tasks: Task[],
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.description = `${tasks.length}`;
  }
}

class TaskItem extends vscode.TreeItem {
  constructor(public readonly task: Task) {
    super(task.title || task.description || task.id);
    this.description = task.type;
    this.tooltip = task.description;

    switch (task.status) {
      case 'running':
        this.iconPath = new vscode.ThemeIcon('pulse', new vscode.ThemeColor('charts.blue'));
        break;
      case 'pending':
        this.iconPath = new vscode.ThemeIcon('circle-outline');
        break;
      case 'completed':
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
        break;
      case 'failed':
        this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        break;
    }
  }
}

export class TaskTreeProvider implements vscode.TreeDataProvider<TreeItem>, vscode.Disposable {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private disposable: vscode.Disposable;

  constructor(private taskService: TaskService) {
    this.disposable = taskService.onQueueChanged(() => {
      this._onDidChangeTreeData.fire();
    });
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): TreeItem[] {
    if (!element) {
      // Root level: show groups
      const groups: TreeItem[] = [];
      const running = this.taskService.running;
      const queue = this.taskService.queue;

      if (running) {
        groups.push(new TaskGroupItem('Running', [running]));
      }

      const pending = queue.filter((t) => t.status === 'pending');
      if (pending.length > 0) {
        groups.push(new TaskGroupItem('Pending', pending));
      }

      if (groups.length === 0) {
        return [new vscode.TreeItem('No tasks') as TreeItem];
      }

      return groups;
    }

    if (element instanceof TaskGroupItem) {
      return element.tasks.map((t) => new TaskItem(t));
    }

    return [];
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
    this.disposable.dispose();
  }
}
