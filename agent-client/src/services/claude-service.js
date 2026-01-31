const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ClaudeService {
  constructor() {
    this.currentProcess = null;
    this.isRunning = false;
    this.eventHandlers = {
      output: [],
      error: [],
      complete: [],
      started: []
    };
  }

  // 执行Claude Code命令
  executeTask(task, agentConfig = {}) {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        reject(new Error('Claude Code is already running'));
        return;
      }

      // 检查API Key
      const apiKey = agentConfig.apiKey || process.env.ANTHROPIC_API_KEY || task.apiKey;
      if (!apiKey) {
        reject(new Error('API Key未配置。请在Agent配置中设置API Key或设置ANTHROPIC_API_KEY环境变量'));
        return;
      }

      // 准备工作目录
      const workDir = task.workDir || process.cwd();

      // 确保工作目录存在
      if (!fs.existsSync(workDir)) {
        reject(new Error(`Work directory does not exist: ${workDir}`));
        return;
      }

      // 构建Claude Code命令 - 传递agentConfig
      const claudeCommand = this.buildClaudeCommand(task, agentConfig);

      this.emit('started', {
        task: task,
        command: claudeCommand,
        model: agentConfig.aiModel || 'claude-sonnet-4-5'
      });

      // 根据AI提供商选择执行方式
      const provider = agentConfig.aiProvider || 'anthropic';

      if (provider === 'anthropic') {
        // 使用Claude Code CLI
        this.currentProcess = spawn('claude', claudeCommand.args, {
          cwd: workDir,
          shell: true,
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: apiKey
          }
        });
      } else if (provider === 'openai') {
        // 使用OpenAI API（需要自定义实现）
        reject(new Error('OpenAI集成暂未实现，请选择Anthropic作为AI提供商'));
        return;
      } else {
        // 自定义提供商
        this.currentProcess = spawn('claude', claudeCommand.args, {
          cwd: workDir,
          shell: true,
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: apiKey,
            API_BASE_URL: agentConfig.apiBaseUrl || ''
          }
        });
      }

      this.isRunning = true;

      // 收集输出
      let stdout = '';
      let stderr = '';

      this.currentProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        this.emit('output', {
          type: 'stdout',
          data: output,
          taskId: task.id
        });
      });

      this.currentProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        this.emit('error', {
          type: 'stderr',
          data: output,
          taskId: task.id
        });
      });

      this.currentProcess.on('close', (code) => {
        this.isRunning = false;
        this.currentProcess = null;

        const result = {
          exitCode: code,
          stdout: stdout,
          stderr: stderr,
          success: code === 0
        };

        this.emit('complete', {
          task: task,
          result: result
        });

        if (code === 0) {
          resolve(result);
        } else {
          reject(new Error(`Claude Code exited with code ${code}`));
        }
      });

      this.currentProcess.on('error', (error) => {
        this.isRunning = false;
        this.currentProcess = null;

        this.emit('error', {
          type: 'process_error',
          error: error,
          taskId: task.id
        });

        reject(error);
      });
    });
  }

  // 构建Claude Code命令
  buildClaudeCommand(task, agentConfig = {}) {
    const args = [];

    // 添加模型配置
    if (agentConfig.aiModel) {
      args.push('--model');
      args.push(agentConfig.aiModel);
    }

    // 根据任务类型构建不同的命令
    switch (task.type) {
      case 'code_generation':
        // 代码生成任务
        args.push('--prompt');
        args.push(`"${task.prompt || task.description}"`);
        break;

      case 'code_review':
        // 代码审查任务
        args.push('--review');
        if (task.files && task.files.length > 0) {
          task.files.forEach(file => {
            args.push(file);
          });
        }
        break;

      case 'bug_fix':
        // Bug修复任务
        args.push('--fix');
        args.push(`"${task.description}"`);
        if (task.file) {
          args.push('--file');
          args.push(task.file);
        }
        break;

      case 'test_generation':
        // 测试生成任务
        args.push('--test');
        if (task.file) {
          args.push(task.file);
        }
        break;

      case 'refactor':
        // 重构任务
        args.push('--refactor');
        args.push(`"${task.description}"`);
        if (task.file) {
          args.push('--file');
          args.push(task.file);
        }
        break;

      case 'custom':
      default:
        // 自定义任务，直接使用description作为prompt
        if (task.prompt) {
          args.push(task.prompt);
        } else {
          args.push(`"${task.description}"`);
        }
        break;
    }

    // 添加额外的标志
    if (task.autoApprove) {
      args.push('--auto-approve');
    }

    if (task.verbose) {
      args.push('--verbose');
    }

    return {
      command: 'claude',
      args: args
    };
  }

  // 停止当前执行
  stop() {
    return new Promise((resolve, reject) => {
      if (!this.currentProcess) {
        resolve({ success: true, message: 'No process running' });
        return;
      }

      try {
        this.currentProcess.kill('SIGTERM');

        // 设置超时，如果进程不响应则强制杀死
        setTimeout(() => {
          if (this.currentProcess) {
            this.currentProcess.kill('SIGKILL');
          }
        }, 5000);

        this.isRunning = false;
        this.currentProcess = null;

        resolve({ success: true, message: 'Process stopped' });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 检查Claude Code是否已安装
  checkInstallation() {
    return new Promise((resolve) => {
      const checkProcess = spawn('claude', ['--version'], { shell: true });

      let output = '';
      checkProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      checkProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            installed: true,
            version: output.trim()
          });
        } else {
          resolve({
            installed: false,
            message: 'Claude Code CLI not found'
          });
        }
      });

      checkProcess.on('error', () => {
        resolve({
          installed: false,
          message: 'Claude Code CLI not found'
        });
      });
    });
  }

  // 注册事件处理器
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  // 检查是否正在运行
  getIsRunning() {
    return this.isRunning;
  }
}

module.exports = new ClaudeService();
