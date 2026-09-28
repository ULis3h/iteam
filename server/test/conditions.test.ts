import { describe, expect, it } from 'vitest'
import { evaluateAssertion, evaluateCondition, parsePredicate } from '../src/engine/conditions.js'

const render = (vars: Record<string, string>) => (t: string) => t.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, k: string) => vars[k] ?? '')

describe('conditions', () => {
  it('parses operators, quoted strings and regexes', () => {
    expect(parsePredicate(`{{steps.a.output}} contains 'LGTM'`)).toEqual({ left: '{{steps.a.output}}', op: 'contains', value: 'LGTM', flags: '' })
    expect(parsePredicate(`{{inputs.mode}} == "full mode"`)).toMatchObject({ op: '==', value: 'full mode' })
    expect(parsePredicate(`{{steps.a.output}} matches /^## /i`)).toMatchObject({ op: 'matches', value: '^## ', flags: 'i' })
    expect(parsePredicate(`{{inputs.deploy}}`)).toMatchObject({ op: 'truthy', left: '{{inputs.deploy}}' })
    expect(parsePredicate(`it''s`, false)).toMatchObject({ op: 'truthy' })
    expect(parsePredicate(`contains 'x'`, true)).toMatchObject({ left: null, op: 'contains', value: 'x' })
    expect(parsePredicate(`/^FINAL/`, true)).toMatchObject({ op: 'matches', value: '^FINAL' })
    expect(parsePredicate(`'plain'`, true)).toMatchObject({ op: 'contains', value: 'plain' })
    expect(() => parsePredicate('', true)).toThrow(/empty/)
    expect(() => parsePredicate('nonsense', true)).toThrow(/cannot parse/)
    expect(() => parsePredicate(`{{x}} == /re/`)).toThrow(/quoted string/)
  })

  it('evaluates when-conditions against rendered templates', () => {
    const r = render({ 'steps.review.output': 'Looks good. LGTM!', 'steps.tests.status': 'failed', 'inputs.deploy': 'yes', 'inputs.empty': '' })
    expect(evaluateCondition(`{{steps.review.output}} contains 'LGTM'`, r).ok).toBe(true)
    expect(evaluateCondition(`{{steps.review.output}} !contains 'LGTM'`, r).ok).toBe(false)
    expect(evaluateCondition(`{{steps.tests.status}} == 'failed'`, r).ok).toBe(true)
    expect(evaluateCondition(`{{steps.tests.status}} != 'failed'`, r).ok).toBe(false)
    expect(evaluateCondition(`{{steps.review.output}} matches /lgtm/i`, r).ok).toBe(true)
    expect(evaluateCondition(`{{steps.review.output}} startsWith 'Looks'`, r).ok).toBe(true)
    expect(evaluateCondition(`{{inputs.deploy}}`, r).ok).toBe(true)
    expect(evaluateCondition(`{{inputs.empty}}`, r).ok).toBe(false)
    expect(evaluateCondition(`{{inputs.deploy}} == 'no'`, r).detail).toBe(`"yes" == 'no' → false`)
    expect(() => evaluateCondition(`{{inputs.deploy}} matches /(/`, r)).toThrow(/invalid regex/)
  })

  it('evaluates output assertions', () => {
    expect(evaluateAssertion(`contains 'FINAL'`, 'draft\nFINAL: ok').ok).toBe(true)
    expect(evaluateAssertion(`startsWith 'FINAL'`, '  draft').ok).toBe(false)
    expect(evaluateAssertion(`/^## /m`, 'intro\n## Title').ok).toBe(true)
    expect(evaluateAssertion(`!contains 'TODO'`, 'all done').ok).toBe(true)
    expect(evaluateAssertion(`'ok'`, 'not really').detail).toBe(`output contains 'ok' → false`)
  })
})
