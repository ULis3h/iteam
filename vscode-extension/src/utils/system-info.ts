import * as os from 'os';
import * as vscode from 'vscode';
import type { DeviceMetadata } from '../types';

export function getSystemInfo(config: {
  role: string;
  skills: string[];
  aiProvider: string;
  aiModel: string;
}): DeviceMetadata {
  return {
    role: config.role,
    skills: config.skills,
    aiProvider: config.aiProvider,
    aiModel: config.aiModel,
    arch: os.arch(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    vscodeVersion: vscode.version,
    workspaceName: vscode.workspace.name,
  };
}

export function getDeviceName(configName: string): string {
  return configName || `${os.hostname()}-vscode`;
}
