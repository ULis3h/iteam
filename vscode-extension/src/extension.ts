import * as vscode from 'vscode';
import { ConfigService } from './services/config-service';
import { SocketService } from './services/socket-service';
import { WorkspaceService } from './services/workspace-service';
import { TaskService } from './services/task-service';
import { TraceService } from './services/trace-service';
import { StatusBarProvider } from './providers/status-bar-provider';
import { SidebarProvider } from './providers/sidebar-provider';
import { TaskTreeProvider } from './providers/task-tree-provider';
import { registerConnectionCommands } from './commands/connection-commands';
import { registerTaskCommands } from './commands/task-commands';
import { registerConfigCommands } from './commands/config-commands';
import { logger } from './utils/logger';

let configService: ConfigService;
let socketService: SocketService;
let workspaceService: WorkspaceService;
let taskService: TaskService;
let traceService: TraceService;
let statusBar: StatusBarProvider;

export function activate(context: vscode.ExtensionContext): void {
  logger.info('iTeam extension activating...');

  // Initialize services
  configService = new ConfigService();
  socketService = new SocketService(configService);
  workspaceService = new WorkspaceService();
  taskService = new TaskService(socketService, configService, workspaceService);
  traceService = new TraceService(socketService);
  statusBar = new StatusBarProvider();

  // Sidebar webview
  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    socketService,
    configService,
    taskService,
    traceService,
    workspaceService,
  );

  // Task tree view
  const taskTreeProvider = new TaskTreeProvider(taskService);

  // Register disposables
  context.subscriptions.push(
    configService,
    socketService,
    taskService,
    traceService,
    statusBar,
    sidebarProvider,
    taskTreeProvider,
  );

  // Register views
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('iteam-sidebar', sidebarProvider),
    vscode.window.registerTreeDataProvider('iteam-tasks', taskTreeProvider),
  );

  // Wire up state changes to status bar
  context.subscriptions.push(
    socketService.onStateChanged((state) => {
      statusBar.update(state);
    }),

    socketService.onDeviceRegistered((device) => {
      logger.info(`Registered as: ${device.name} (${device.id})`);
    }),

    socketService.onConfigUpdated((data) => {
      const msg = data.oldRole
        ? `iTeam: Role changed ${data.oldRole} -> ${data.role}`
        : `iTeam: Config updated — role: ${data.role}`;
      vscode.window.showInformationMessage(msg);
    }),

    // Task lifecycle -> status bar + trace
    taskService.onTaskStarted((task) => {
      statusBar.setWorking(task.title || task.description || task.id);
      traceService.createSession(task);
      traceService.logTaskReceived(task);
    }),

    taskService.onTaskCompleted((task) => {
      statusBar.setIdle();
      traceService.endSession(task.status === 'completed' ? 'completed' : 'failed');
    }),

    // Re-register when config changes
    configService.onDidChange(() => {
      if (socketService.isConnected) {
        socketService.updateAgentConfig();
        logger.info('Config changed, updated agent config on server');
      }
    }),
  );

  // Register commands
  registerConnectionCommands(context, socketService, configService);
  registerTaskCommands(context, taskService);
  registerConfigCommands(context, configService, socketService);

  // Auto-connect if configured
  if (configService.autoConnect && configService.isConfigured) {
    socketService.connect().catch((err) => {
      logger.warn(`Auto-connect failed: ${err.message}`);
    });
  }

  logger.info('iTeam extension activated');
}

export function deactivate(): void {
  logger.info('iTeam extension deactivating...');
  socketService?.disconnect();
  logger.dispose();
}
