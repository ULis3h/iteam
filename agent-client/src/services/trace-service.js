/**
 * Trace Service - 任务执行追踪服务
 *
 * 记录任务执行过程中的所有事件：
 * - 任务接收
 * - AI 思考流程
 * - 模型讨论（MCP 调用等）
 * - 执行步骤
 * - 执行结果
 */

const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 延迟获取 electron app，避免循环依赖
let _app = null;
function getApp() {
    if (!_app) {
        _app = require('electron').app;
    }
    return _app;
}

class TraceService {
    constructor() {
        this.db = null;
        this.currentSession = null;
        this.socketService = null;
        this.eventHandlers = {
            sessionCreated: [],
            entryAdded: [],
            sessionUpdated: [],
        };
    }

    /**
     * 初始化本地数据库
     */
    initialize() {
        // 确定数据目录
        const userDataPath = getApp().getPath('userData');
        const dataDir = path.join(userDataPath, 'traces');

        // 确保目录存在
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const dbPath = path.join(dataDir, 'traces.db');
        console.log('Initializing trace database at:', dbPath);

        this.db = new Database(dbPath);

        // 创建表
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        device_id TEXT,
        status TEXT DEFAULT 'running',
        title TEXT,
        start_time TEXT DEFAULT (datetime('now')),
        end_time TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now')),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        metadata TEXT,
        duration INTEGER,
        synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_entries_session ON entries(session_id);
      CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);
      CREATE INDEX IF NOT EXISTS idx_sessions_device ON sessions(device_id);
    `);

        console.log('Trace database initialized');
    }

    /**
     * 设置 Socket 服务用于同步
     */
    setSocketService(socketService) {
        this.socketService = socketService;
    }

    /**
     * 创建新的追踪会话
     */
    createSession(options = {}) {
        const session = {
            id: randomUUID(),
            taskId: options.taskId || null,
            deviceId: options.deviceId || null,
            status: 'running',
            title: options.title || null,
            startTime: new Date().toISOString(),
            endTime: null,
        };

        // 保存到本地数据库
        const stmt = this.db.prepare(`
      INSERT INTO sessions (id, task_id, device_id, status, title, start_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(
            session.id,
            session.taskId,
            session.deviceId,
            session.status,
            session.title,
            session.startTime
        );

        this.currentSession = session;
        this.emit('sessionCreated', session);

        // 同步到服务器
        this._syncSession(session);

        console.log('Trace session created:', session.id);
        return session;
    }

    /**
     * 添加追踪条目
     */
    addEntry(type, title, content, options = {}) {
        if (!this.currentSession) {
            console.warn('No active session, creating one');
            this.createSession();
        }

        const entry = {
            id: randomUUID(),
            sessionId: this.currentSession.id,
            timestamp: new Date().toISOString(),
            type,
            title,
            content: typeof content === 'string' ? content : JSON.stringify(content),
            metadata: options.metadata ? JSON.stringify(options.metadata) : null,
            duration: options.duration || null,
        };

        // 保存到本地数据库
        const stmt = this.db.prepare(`
      INSERT INTO entries (id, session_id, timestamp, type, title, content, metadata, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(
            entry.id,
            entry.sessionId,
            entry.timestamp,
            entry.type,
            entry.title,
            entry.content,
            entry.metadata,
            entry.duration
        );

        this.emit('entryAdded', entry);

        // 同步到服务器
        this._syncEntry(entry);

        return entry;
    }

    // ============== 便捷方法 ==============

    /**
     * 记录任务接收
     */
    logTaskReceived(task) {
        return this.addEntry('task_received', `接收任务: ${task.title || task.id}`, {
            taskId: task.id,
            title: task.title,
            description: task.description,
            type: task.type,
        });
    }

    /**
     * 记录 AI 思考过程
     */
    logThinking(thinking) {
        return this.addEntry('thinking', 'AI 思考', thinking);
    }

    /**
     * 记录模型讨论（MCP 调用等）
     */
    logDiscussion(title, content, metadata = {}) {
        return this.addEntry('discussion', title, content, { metadata });
    }

    /**
     * 记录执行步骤
     */
    logStep(title, content, options = {}) {
        return this.addEntry('step', title, content, options);
    }

    /**
     * 记录执行结果
     */
    logResult(success, result) {
        return this.addEntry(
            'result',
            success ? '执行成功' : '执行失败',
            result
        );
    }

    /**
     * 记录错误
     */
    logError(error) {
        return this.addEntry('error', '发生错误', {
            message: error.message || error,
            stack: error.stack,
        });
    }

    /**
     * 结束当前会话
     */
    endSession(status = 'completed') {
        if (!this.currentSession) {
            return null;
        }

        const endTime = new Date().toISOString();

        const stmt = this.db.prepare(`
      UPDATE sessions SET status = ?, end_time = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
        stmt.run(status, endTime, this.currentSession.id);

        this.currentSession.status = status;
        this.currentSession.endTime = endTime;

        this.emit('sessionUpdated', this.currentSession);

        // 同步到服务器
        this._syncSession(this.currentSession);

        const session = this.currentSession;
        this.currentSession = null;

        console.log('Trace session ended:', session.id, status);
        return session;
    }

    // ============== 查询方法 ==============

    /**
     * 获取所有会话
     */
    getSessions(limit = 50) {
        const stmt = this.db.prepare(`
      SELECT * FROM sessions ORDER BY start_time DESC LIMIT ?
    `);
        return stmt.all(limit);
    }

    /**
     * 获取会话详情（含条目）
     */
    getSession(sessionId) {
        const sessionStmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
        const session = sessionStmt.get(sessionId);

        if (!session) return null;

        const entriesStmt = this.db.prepare(`
      SELECT * FROM entries WHERE session_id = ? ORDER BY timestamp ASC
    `);
        session.entries = entriesStmt.all(sessionId);

        return session;
    }

    /**
     * 获取当前会话
     */
    getCurrentSession() {
        return this.currentSession;
    }

    // ============== 同步方法 ==============

    /**
     * 同步会话到服务器
     */
    _syncSession(session) {
        if (!this.socketService || !this.socketService.isConnected()) {
            return;
        }

        this.socketService.socket.emit('trace:session', {
            id: session.id,
            taskId: session.taskId,
            deviceId: session.deviceId || this.socketService.getDeviceId(),
            status: session.status,
            title: session.title,
            startTime: session.startTime,
            endTime: session.endTime,
        });

        // 标记为已同步
        const stmt = this.db.prepare('UPDATE sessions SET synced = 1 WHERE id = ?');
        stmt.run(session.id);
    }

    /**
     * 同步条目到服务器
     */
    _syncEntry(entry) {
        if (!this.socketService || !this.socketService.isConnected()) {
            return;
        }

        this.socketService.socket.emit('trace:entry', {
            id: entry.id,
            sessionId: entry.sessionId,
            type: entry.type,
            title: entry.title,
            content: entry.content,
            metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
            duration: entry.duration,
            timestamp: entry.timestamp,
        });

        // 标记为已同步
        const stmt = this.db.prepare('UPDATE entries SET synced = 1 WHERE id = ?');
        stmt.run(entry.id);
    }

    /**
     * 同步所有未同步的数据
     */
    syncAll() {
        if (!this.socketService || !this.socketService.isConnected()) {
            return;
        }

        // 同步未同步的会话
        const sessions = this.db
            .prepare('SELECT * FROM sessions WHERE synced = 0')
            .all();
        for (const session of sessions) {
            this._syncSession(session);
        }

        // 同步未同步的条目
        const entries = this.db
            .prepare('SELECT * FROM entries WHERE synced = 0')
            .all();
        for (const entry of entries) {
            this._syncEntry(entry);
        }

        console.log(`Synced ${sessions.length} sessions, ${entries.length} entries`);
    }

    // ============== 事件系统 ==============

    on(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        }
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach((handler) => handler(data));
        }
    }

    /**
     * 清理旧数据
     */
    cleanup(daysToKeep = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysToKeep);

        const stmt = this.db.prepare(`
      DELETE FROM sessions WHERE start_time < ? AND status != 'running'
    `);
        const result = stmt.run(cutoff.toISOString());

        console.log(`Cleaned up ${result.changes} old sessions`);
        return result.changes;
    }
}

module.exports = new TraceService();
