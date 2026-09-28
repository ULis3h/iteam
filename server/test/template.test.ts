import { describe, expect, it } from 'vitest'
import { renderTemplate } from '../src/engine/template.js'

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
