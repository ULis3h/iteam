/**
 * Coordinator Prompt Templates
 *
 * 参考 claude-code/src/coordinator/coordinatorMode.ts 设计模式。
 * 将 claude-code 的 370 行协调器系统 prompt 适配为 iTeam 任务分配时
 * 使用的 prompt 模板。
 *
 * 核心设计（来自 claude-code coordinator）:
 * - 4 阶段工作流：Research → Synthesis → Implementation → Verification
 * - 并发策略：读任务并行、写任务串行、验证可与实现并行
 * - 自包含 prompt：Worker 看不到对话历史，prompt 必须完整
 * - 禁止懒委托：每个 prompt 必须包含具体文件、行号、方案
 * - 失败续接：续用同一 worker 而非重新创建
 */

// ============================================================================
// Task Prompt Helpers
// ============================================================================

interface TaskPromptContext {
    /** 任务标题 */
    title: string
    /** 任务描述 */
    description: string
    /** 目标设备名称 */
    deviceName: string
    /** 设备角色 */
    deviceRole?: string
    /** 设备技能 */
    deviceSkills?: string[]
    /** 项目名称 */
    projectName: string
    /** 项目仓库 */
    projectRepo?: string
    /** 工作目录 */
    workDir?: string
    /** 额外上下文（如前序研究结果） */
    additionalContext?: string
    /** 已有记忆（来自 MemoryService） */
    relevantMemories?: string[]
}

/**
 * 构建自包含的任务 prompt
 *
 * 来自 claude-code coordinator 的核心原则：
 * "Workers can't see your conversation. Every prompt must be self-contained."
 */
export function buildTaskPrompt(ctx: TaskPromptContext): string {
    const sections: string[] = []

    // 1. 任务目标
    sections.push(`## 任务目标\n\n${ctx.title}\n\n${ctx.description}`)

    // 2. 项目上下文
    sections.push(
        `## 项目上下文\n\n- 项目名称: ${ctx.projectName}` +
        (ctx.projectRepo ? `\n- 代码仓库: ${ctx.projectRepo}` : '') +
        (ctx.workDir ? `\n- 工作目录: ${ctx.workDir}` : ''),
    )

    // 3. Agent 信息
    sections.push(
        `## 你的身份\n\n- 设备: ${ctx.deviceName}` +
        (ctx.deviceRole ? `\n- 角色: ${ctx.deviceRole}` : '') +
        (ctx.deviceSkills?.length ? `\n- 技能: ${ctx.deviceSkills.join(', ')}` : ''),
    )

    // 4. 相关记忆
    if (ctx.relevantMemories?.length) {
        sections.push(
            `## 相关经验记忆\n\n以下是与本次任务相关的历史经验：\n${ctx.relevantMemories.map((m, i) => `${i + 1}. ${m}`).join('\n')}`,
        )
    }

    // 5. 额外上下文
    if (ctx.additionalContext) {
        sections.push(`## 补充上下文\n\n${ctx.additionalContext}`)
    }

    // 6. 执行规范（来自 claude-code coordinator 的 prompt tips）
    sections.push(EXECUTION_GUIDELINES)

    return sections.join('\n\n---\n\n')
}

// ============================================================================
// Execution Guidelines (adapted from claude-code coordinator)
// ============================================================================

const EXECUTION_GUIDELINES = `## 执行规范

### 工作流程
按以下阶段执行任务：

| 阶段 | 目的 |
|------|------|
| **研究** | 调查代码库，理解问题，找到相关文件 |
| **计划** | 基于研究结果，制定具体的实现方案 |
| **实现** | 按照方案进行有针对性的修改和编写 |
| **验证** | 运行测试、类型检查，确认修改正确 |

### 验证要求
验证意味着**证明代码可以工作**，而不只是确认代码存在。

- 运行测试（不只是 "tests pass"，要确认测试覆盖了改动）
- 运行类型检查并**调查错误**——不要随便归结为 "不相关"
- 如果有疑点，深入排查
- **独立验证**——用实际结果证明，而非照搬假设

### 提交规范
- 完成后运行相关测试和类型检查
- Commit 你的修改并报告 commit hash
- 如果测试或构建失败，修复后再报告

### 上报
当任务完成或遇到无法解决的阻碍时，报告：
1. 做了什么修改（文件、函数、行号）
2. 验证结果（测试输出、类型检查结果）
3. 如有阻碍，说明尝试了什么以及为什么失败`

// ============================================================================
// 4-Phase Workflow Templates
// ============================================================================

/**
 * 构建研究阶段 prompt
 * "Research — Investigate codebase, find files, understand problem"
 */
export function buildResearchPrompt(ctx: {
    objective: string
    projectName: string
    workDir?: string
    focusAreas?: string[]
}): string {
    const focus = ctx.focusAreas?.length
        ? `\n\n重点调查方向：\n${ctx.focusAreas.map((a) => `- ${a}`).join('\n')}`
        : ''

    return `## 研究任务

调查项目 "${ctx.projectName}" 的代码库以理解以下问题：

${ctx.objective}
${focus}${ctx.workDir ? `\n\n工作目录: ${ctx.workDir}` : ''}

### 要求
- 报告具体的文件路径、行号和类型签名
- 不要修改任何文件
- 报告发现的问题、相关代码和可能的方案

这次研究的结果将用于制定实施方案——请聚焦于文件路径、行号和技术细节。`
}

/**
 * 构建实现阶段 prompt
 *
 * 来自 claude-code coordinator 的核心原则：
 * "Never write 'based on your findings'. These phrases delegate understanding
 *  to the worker instead of doing it yourself."
 *
 * 所以实现 prompt 必须包含具体的文件、行号和修改方案。
 */
export function buildImplementationPrompt(ctx: {
    objective: string
    projectName: string
    workDir?: string
    /** 具体的修改指令——必须包含文件路径、行号、要改什么 */
    spec: string
}): string {
    return `## 实现任务

在项目 "${ctx.projectName}" 中执行以下修改：
${ctx.workDir ? `\n工作目录: ${ctx.workDir}` : ''}

### 修改方案

${ctx.spec}

### 要求
- 按照上述方案进行修改，遇到问题就修复
- 运行相关测试和类型检查
- Commit 修改并报告 hash
- 如果测试失败，修复断言并重新提交`
}

/**
 * 构建验证阶段 prompt
 *
 * 来自 claude-code coordinator：
 * "Verify independently — prove the code works, don't rubber-stamp."
 * "Try edge cases and error paths."
 */
export function buildVerificationPrompt(ctx: {
    objective: string
    projectName: string
    workDir?: string
    /** 要验证的修改描述 */
    changes: string
    /** 验证重点 */
    focusAreas?: string[]
}): string {
    const focus = ctx.focusAreas?.length
        ? `\n\n验证重点：\n${ctx.focusAreas.map((a) => `- ${a}`).join('\n')}`
        : ''

    return `## 验证任务

验证项目 "${ctx.projectName}" 中最近的修改是否正确：
${ctx.workDir ? `\n工作目录: ${ctx.workDir}` : ''}

### 修改内容

${ctx.changes}
${focus}

### 要求
- 用**全新视角**审视代码——不要假设实现是正确的
- 运行测试且**启用修改涉及的功能**
- 运行类型检查并**调查**所有错误
- 尝试边界情况和错误路径
- 如果发现问题，详细说明问题和修复建议`
}

// ============================================================================
// Concurrency Advice Template
// ============================================================================

/**
 * 并发策略建议
 * 来自 claude-code coordinator 的并发管理原则
 */
export const CONCURRENCY_STRATEGY = {
    /** 只读任务（研究）可以完全并行 */
    RESEARCH: 'parallel' as const,
    /** 写入任务（实现）同一文件集只能串行 */
    IMPLEMENTATION: 'serial_per_file_set' as const,
    /** 验证可以与不同文件区域的实现并行 */
    VERIFICATION: 'parallel_different_areas' as const,
} as const

/**
 * 判断两个任务是否可以并行执行
 */
export function canRunInParallel(
    taskA: { type: 'research' | 'implementation' | 'verification'; files?: string[] },
    taskB: { type: 'research' | 'implementation' | 'verification'; files?: string[] },
): boolean {
    // 研究任务总是可以并行
    if (taskA.type === 'research' || taskB.type === 'research') {
        return true
    }

    // 两个实现任务：检查文件是否重叠
    if (taskA.type === 'implementation' && taskB.type === 'implementation') {
        if (!taskA.files || !taskB.files) return false  // 不确定时串行
        const setA = new Set(taskA.files)
        return !taskB.files.some((f) => setA.has(f))
    }

    // 验证 + 实现：检查文件区域
    if (!taskA.files || !taskB.files) return false
    const setA = new Set(taskA.files)
    return !taskB.files.some((f) => setA.has(f))
}

// ============================================================================
// Worker Failure Handling (from claude-code coordinator)
// ============================================================================

/**
 * 构建失败续接 prompt
 *
 * 来自 claude-code coordinator：
 * "When a worker reports failure: Continue the same worker via SendMessage —
 *  it has the full error context."
 */
export function buildFailureContinuationPrompt(ctx: {
    originalTask: string
    errorMessage: string
    /** 之前尝试了什么 */
    previousAttempt: string
}): string {
    return `上次任务失败了。以下是错误信息：

## 原始任务
${ctx.originalTask}

## 错误信息
${ctx.errorMessage}

## 之前的尝试
${ctx.previousAttempt}

### 要求
- 基于错误信息分析根因
- 修复问题（修复根因，不是表面症状）
- 运行测试验证修复
- Commit 并报告结果`
}
