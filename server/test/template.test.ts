import { describe, expect, it } from 'vitest'
import { renderTemplate, templateIssues } from '../src/engine/template.js'

describe('renderTemplate', () => {
  const ctx = {
    inputs: { repo: '/srv/app', topic: '登录' },
    steps: { plan: { output: 'PLAN', status: 'succeeded' } },
    run: { name: 'r1' },
  }

  it('resolves nested paths and tolerates whitespace', () => {
    const { text, missing } = renderTemplate('仓库 {{inputs.repo}} / {{ steps.plan.output }} / {{run.name}}', ctx)
    expect(text).toBe('仓库 /srv/app / PLAN / r1')
    expect(missing).toEqual([])
  })

  it('renders unknown variables as empty strings and reports them', () => {
    const { text, missing } = renderTemplate('a={{inputs.nope}} b={{steps.x.output}}', ctx)
    expect(text).toBe('a= b=')
    expect(missing).toEqual(['inputs.nope', 'steps.x.output'])
  })

  it('serialises non-string values as JSON', () => {
    const { text } = renderTemplate('{{steps.plan}}', ctx)
    expect(JSON.parse(text)).toEqual({ output: 'PLAN', status: 'succeeded' })
  })

  it('leaves text without placeholders untouched', () => {
    expect(renderTemplate('plain {{ not a var', ctx).text).toBe('plain {{ not a var')
  })
})

describe('templateIssues', () => {
  it('reports unknown inputs, unknown steps, self references and undeclared dependencies', () => {
    const issues = templateIssues({
      inputs: [{ key: 'repo' }],
      steps: [
        { id: 'a', name: 'A', prompt: '{{inputs.repo}} {{inputs.nope}} {{steps.a.output}}', dependsOn: [] },
        { id: 'b', name: 'B', prompt: '{{steps.a.output}} {{steps.zzz.output}}', dependsOn: [] },
        { id: 'c', name: 'C', prompt: '{{steps.a.output}}', dependsOn: ['a'] },
      ],
    })
    expect(issues).toEqual([
      'step "A": unknown input {{inputs.nope}}',
      'step "A": refers to its own output',
      'step "B": uses {{steps.a.output}} but does not depend on "a"',
      'step "B": unknown step {{steps.zzz.output}}',
    ])
  })

  it('does not walk the prototype chain', () => {
    const { text, missing } = renderTemplate('{{inputs.constructor}} {{steps.toString}}', { inputs: {}, steps: {} })
    expect(text).toBe(' ')
    expect(missing).toEqual(['inputs.constructor', 'steps.toString'])
  })
})
