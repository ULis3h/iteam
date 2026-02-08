import * as vscode from 'vscode';

export interface WorkspaceContext {
  projectName: string | undefined;
  workspacePath: string | undefined;
  activeFile: string | undefined;
  gitBranch: string | undefined;
}

export class WorkspaceService {
  getContext(): WorkspaceContext {
    const folders = vscode.workspace.workspaceFolders;
    const activeEditor = vscode.window.activeTextEditor;

    return {
      projectName: folders?.[0]?.name,
      workspacePath: folders?.[0]?.uri.fsPath,
      activeFile: activeEditor?.document.uri.fsPath,
      gitBranch: this.getGitBranch(),
    };
  }

  private getGitBranch(): string | undefined {
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (!gitExtension?.isActive) {
        return undefined;
      }
      const git = gitExtension.exports.getAPI(1);
      const repo = git.repositories[0];
      return repo?.state?.HEAD?.name;
    } catch {
      return undefined;
    }
  }
}
