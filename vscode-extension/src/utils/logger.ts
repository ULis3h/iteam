import * as vscode from 'vscode';
import { OUTPUT_CHANNEL_NAME } from './constants';

let outputChannel: vscode.OutputChannel | undefined;

function getChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  }
  return outputChannel;
}

function timestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

export const logger = {
  info(message: string, ...args: unknown[]): void {
    const line = `[${timestamp()}] INFO  ${message}`;
    getChannel().appendLine(args.length ? `${line} ${JSON.stringify(args)}` : line);
  },

  warn(message: string, ...args: unknown[]): void {
    const line = `[${timestamp()}] WARN  ${message}`;
    getChannel().appendLine(args.length ? `${line} ${JSON.stringify(args)}` : line);
  },

  error(message: string, ...args: unknown[]): void {
    const line = `[${timestamp()}] ERROR ${message}`;
    getChannel().appendLine(args.length ? `${line} ${JSON.stringify(args)}` : line);
  },

  show(): void {
    getChannel().show(true);
  },

  dispose(): void {
    outputChannel?.dispose();
    outputChannel = undefined;
  },
};
