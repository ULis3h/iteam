/**
 * 角色技能文档生成器
 * 将角色配置转换为结构化的 Markdown 文档
 */

interface RoleSkill {
  roleId: string
  name: string
  description: string
  color: string
  icon: string
  techStack: {
    primary: string[]
    secondary: string[]
    tools: string[]
  }
  responsibilities: {
    core: string[]
    support: string[]
    avoid: string[]
  }
  capabilities: {
    codeReview: boolean
    codeGen: boolean
    testing: boolean
    deployment: boolean
    design: boolean
    planning: boolean
  }
  prompts: {
    systemPrompt: string
    taskPrompt: string
    constraints: string[]
  }
  collaboration: {
    worksWellWith: string[]
    leadsIn: string[]
    assistsIn: string[]
  }
}

/**
 * 将角色配置转换为 Markdown 文档
 */
export function generateRoleDocument(role: RoleSkill): string {
  const sections: string[] = []

  // 标题
  sections.push(`# ${role.icon} ${role.name} Agent Skill\n`)

  // 角色概述
  sections.push(`## 角色概述\n`)
  sections.push(`${role.description}\n`)

  // 核心技能栈
  sections.push(`## 核心技能栈\n`)

  sections.push(`### 主要技术\n`)
  role.techStack.primary.forEach(tech => {
    sections.push(`- ${tech}`)
  })
  sections.push('')

  sections.push(`### 次要技术\n`)
  role.techStack.secondary.forEach(tech => {
    sections.push(`- ${tech}`)
  })
  sections.push('')

  sections.push(`### 常用工具\n`)
  role.techStack.tools.forEach(tool => {
    sections.push(`- ${tool}`)
  })
  sections.push('')

  // 职责范围
  sections.push(`## 职责范围\n`)

  sections.push(`### 核心职责\n`)
  role.responsibilities.core.forEach((item, index) => {
    sections.push(`${index + 1}. ${item}`)
  })
  sections.push('')

  sections.push(`### 支持职责\n`)
  role.responsibilities.support.forEach((item, index) => {
    sections.push(`${index + 1}. ${item}`)
  })
  sections.push('')

  sections.push(`### 避免职责\n`)
  role.responsibilities.avoid.forEach((item, index) => {
    sections.push(`${index + 1}. ${item}`)
  })
  sections.push('')

  // Agent 能力矩阵
  sections.push(`## Agent 能力矩阵\n`)
  const capabilityLabels: Record<keyof typeof role.capabilities, string> = {
    codeReview: '代码审查',
    codeGen: '代码生成',
    testing: '测试',
    deployment: '部署',
    design: '设计',
    planning: '规划'
  }

  Object.entries(role.capabilities).forEach(([key, value]) => {
    const label = capabilityLabels[key as keyof typeof role.capabilities]
    const icon = value ? '✅' : '❌'
    sections.push(`- ${icon} ${label}`)
  })
  sections.push('')

  // Agent 指令模板
  sections.push(`## Agent 指令模板\n`)

  sections.push(`### 系统提示词\n`)
  sections.push(`\`\`\`\n${role.prompts.systemPrompt}\n\`\`\`\n`)

  sections.push(`### 任务提示词\n`)
  sections.push(`\`\`\`\n${role.prompts.taskPrompt}\n\`\`\`\n`)

  sections.push(`### 约束条件\n`)
  role.prompts.constraints.forEach((constraint, index) => {
    sections.push(`${index + 1}. ${constraint}`)
  })
  sections.push('')

  // 协作偏好
  sections.push(`## 协作偏好\n`)

  sections.push(`### 适合协作的角色\n`)
  sections.push(role.collaboration.worksWellWith.join(' · ') + '\n')

  sections.push(`### 主导的场景\n`)
  role.collaboration.leadsIn.forEach((item, index) => {
    sections.push(`${index + 1}. ${item}`)
  })
  sections.push('')

  sections.push(`### 辅助的场景\n`)
  role.collaboration.assistsIn.forEach((item, index) => {
    sections.push(`${index + 1}. ${item}`)
  })
  sections.push('')

  // 页脚
  sections.push(`---\n`)
  sections.push(`**角色ID**: \`${role.roleId}\`  `)
  sections.push(`**主题色**: ${role.color}  `)
  sections.push(`**自动生成**: 此文档由系统自动生成，请勿手动编辑  `)

  return sections.join('\n')
}

/**
 * 为角色生成标签数组
 */
export function generateRoleTags(role: RoleSkill): string[] {
  const tags: string[] = [
    'agent-skill',
    'role',
    role.roleId,
    role.name
  ]

  // 添加主要技术作为标签
  role.techStack.primary.slice(0, 5).forEach(tech => {
    tags.push(tech)
  })

  return tags
}

/**
 * 生成文档作者名称
 */
export function getDocumentAuthor(): string {
  return 'iTeam System'
}
