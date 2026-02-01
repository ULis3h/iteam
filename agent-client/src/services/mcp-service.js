/**
 * MCP Service - MCP 客户端服务
 *
 * 允许 Agent Client 连接到外部 MCP Servers，
 * 扩展 Agent 的工具和数据访问能力
 */

const { spawn } = require('child_process');
const readline = require('readline');

class MCPService {
    constructor() {
        this.connections = new Map(); // serverName -> connection
        this.eventHandlers = {
            connected: [],
            disconnected: [],
            toolsUpdated: [],
            error: [],
        };
    }

    /**
     * 连接到 MCP Server
     * @param {string} name - 服务器名称
     * @param {object} config - 配置 { command, args, env }
     */
    async connect(name, config) {
        if (this.connections.has(name)) {
            console.log(`Already connected to MCP server: ${name}`);
            return { success: true, message: 'Already connected' };
        }

        try {
            const { command, args = [], env = {} } = config;

            // 启动 MCP Server 进程
            const serverProcess = spawn(command, args, {
                env: { ...process.env, ...env },
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            // 创建 JSON-RPC ID 计数器
            let requestId = 0;
            const pendingRequests = new Map();

            // 设置 stdio 通信
            const rl = readline.createInterface({
                input: serverProcess.stdout,
                crlfDelay: Infinity,
            });

            rl.on('line', (line) => {
                try {
                    const response = JSON.parse(line);
                    if (response.id !== undefined && pendingRequests.has(response.id)) {
                        const { resolve, reject } = pendingRequests.get(response.id);
                        pendingRequests.delete(response.id);

                        if (response.error) {
                            reject(new Error(response.error.message));
                        } else {
                            resolve(response.result);
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse MCP response:', e);
                }
            });

            serverProcess.stderr.on('data', (data) => {
                console.error(`MCP Server [${name}] stderr:`, data.toString());
            });

            serverProcess.on('close', (code) => {
                console.log(`MCP Server [${name}] exited with code ${code}`);
                this.connections.delete(name);
                this.emit('disconnected', { name, code });
            });

            serverProcess.on('error', (error) => {
                console.error(`MCP Server [${name}] error:`, error);
                this.emit('error', { name, error });
            });

            // 保存连接
            const connection = {
                process: serverProcess,
                requestId: () => ++requestId,
                pendingRequests,
                tools: [],
                resources: [],
            };

            this.connections.set(name, connection);

            // 初始化 MCP 会话
            await this._sendRequest(name, 'initialize', {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: {
                    name: 'iteam-agent-client',
                    version: '1.0.0',
                },
            });

            // 发送 initialized 通知
            this._sendNotification(name, 'notifications/initialized', {});

            // 获取可用工具列表
            const toolsResult = await this._sendRequest(name, 'tools/list', {});
            connection.tools = toolsResult.tools || [];

            this.emit('connected', { name, tools: connection.tools });
            this.emit('toolsUpdated', { name, tools: connection.tools });

            console.log(
                `Connected to MCP server: ${name}, tools:`,
                connection.tools.map((t) => t.name)
            );

            return {
                success: true,
                serverName: name,
                tools: connection.tools,
            };
        } catch (error) {
            console.error(`Failed to connect to MCP server ${name}:`, error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * 断开 MCP Server 连接
     */
    async disconnect(name) {
        const connection = this.connections.get(name);
        if (!connection) {
            return { success: false, error: 'Not connected' };
        }

        try {
            connection.process.kill();
            this.connections.delete(name);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 断开所有连接
     */
    async disconnectAll() {
        for (const name of this.connections.keys()) {
            await this.disconnect(name);
        }
    }

    /**
     * 列出指定服务器的可用工具
     */
    listTools(serverName) {
        const connection = this.connections.get(serverName);
        if (!connection) {
            return [];
        }
        return connection.tools;
    }

    /**
     * 列出所有连接服务器的所有工具
     */
    listAllTools() {
        const allTools = [];
        for (const [name, connection] of this.connections.entries()) {
            for (const tool of connection.tools) {
                allTools.push({
                    serverName: name,
                    ...tool,
                });
            }
        }
        return allTools;
    }

    /**
     * 调用 MCP 工具
     */
    async callTool(serverName, toolName, args = {}) {
        const connection = this.connections.get(serverName);
        if (!connection) {
            throw new Error(`Not connected to server: ${serverName}`);
        }

        try {
            const result = await this._sendRequest(serverName, 'tools/call', {
                name: toolName,
                arguments: args,
            });

            return {
                success: true,
                result: result,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * 读取 MCP 资源
     */
    async readResource(serverName, uri) {
        const connection = this.connections.get(serverName);
        if (!connection) {
            throw new Error(`Not connected to server: ${serverName}`);
        }

        try {
            const result = await this._sendRequest(serverName, 'resources/read', {
                uri: uri,
            });

            return {
                success: true,
                contents: result.contents,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * 获取连接状态
     */
    getConnectionStatus() {
        const status = {};
        for (const [name, connection] of this.connections.entries()) {
            status[name] = {
                connected: true,
                toolCount: connection.tools.length,
                tools: connection.tools.map((t) => t.name),
            };
        }
        return status;
    }

    /**
     * 检查是否已连接到指定服务器
     */
    isConnected(serverName) {
        return this.connections.has(serverName);
    }

    // ============== 内部方法 ==============

    /**
     * 发送 JSON-RPC 请求
     */
    _sendRequest(serverName, method, params) {
        return new Promise((resolve, reject) => {
            const connection = this.connections.get(serverName);
            if (!connection) {
                reject(new Error('Not connected'));
                return;
            }

            const id = connection.requestId();
            const request = {
                jsonrpc: '2.0',
                id,
                method,
                params,
            };

            connection.pendingRequests.set(id, { resolve, reject });

            // 发送请求
            connection.process.stdin.write(JSON.stringify(request) + '\n');

            // 设置超时
            setTimeout(() => {
                if (connection.pendingRequests.has(id)) {
                    connection.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }

    /**
     * 发送 JSON-RPC 通知（无需响应）
     */
    _sendNotification(serverName, method, params) {
        const connection = this.connections.get(serverName);
        if (!connection) {
            return;
        }

        const notification = {
            jsonrpc: '2.0',
            method,
            params,
        };

        connection.process.stdin.write(JSON.stringify(notification) + '\n');
    }

    /**
     * 注册事件处理器
     */
    on(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        }
    }

    /**
     * 触发事件
     */
    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach((handler) => handler(data));
        }
    }
}

module.exports = new MCPService();
