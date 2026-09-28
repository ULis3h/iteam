import { describe, expect, it } from 'vitest'
import { parseWorkflowFile } from '../src/workflow/import-export.js'

const yaml = `
name: 测试
inputs:
  - key: repo
    required: true
agents:
  - name: 架构师
    provider: claude-code
    effort: high
steps:
  - id: plan
    name: 规划
    agent: 架构师
    prompt: 规划 {{inputs.repo}}
  - id: build
    name: 实现
    agent: 开发者
    dependsOn: [plan]
    retries: 1
    prompt: 实现 {{steps.plan.output}}
`

describe('parseWorkflowFile', () => {
  it('parses YAML with defaults applied', () => {
    const file = parseWorkflowFile(yaml)
    expect(file.name).toBe('测试')
    expect(file.steps).toHaveLength(2)
    expect(file.steps[0].dependsOn).toEqual([])
    expect(file.steps[1].dependsOn).toEqual(['plan'])
    expect(file.agents[0].effort).toBe('high')
  })

  it('parses JSON documents too', () => {
    const file = parseWorkflowFile(JSON.stringify({ name: 'j', steps: [{ id: 'a', name: 'A', agent: 'x', prompt: 'p' }] }))
    expect(file.steps[0].id).toBe('a')
  })

  it('rejects empty input, invalid ids, unknown dependencies and cycles', () => {
    expect(() => parseWorkflowFile('   ')).toThrow(/empty/)
    expect(() => parseWorkflowFile('name: x\nsteps:\n  - id: 1bad\n    name: n\n    agent: a\n    prompt: p')).toThrow(/steps.0.id/)
    expect(() => parseWorkflowFile('name: x\nsteps:\n  - id: a\n    name: n\n    agent: a\n    prompt: p\n    dependsOn: [zzz]')).toThrow(/unknown step/)
    expect(() =>
      parseWorkflowFile('name: x\nsteps:\n  - id: a\n    name: n\n    agent: a\n    prompt: p\n    dependsOn: [b]\n  - id: b\n    name: n\n    agent: a\n    prompt: p\n    dependsOn: [a]'),
    ).toThrow(/cycle/)
  })

  it('rejects unknown providers and efforts with readable paths', () => {
    expect(() => parseWorkflowFile('name: x\nagents:\n  - name: a\n    provider: nope\nsteps:\n  - id: a\n    name: n\n    agent: a\n    prompt: p')).toThrow(/agents.0.provider/)
    expect(() => parseWorkflowFile('name: x\nsteps:\n  - id: a\n    name: n\n    agent: a\n    prompt: p\n    effort: extreme')).toThrow(/steps.0.effort/)
  })
})
