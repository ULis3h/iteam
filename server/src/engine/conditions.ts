/**
 * Tiny predicate language for `when` (conditional steps) and `assertOutput` (output guardrails).
 *
 *   {{steps.review.output}} contains 'LGTM'
 *   {{inputs.mode}} == 'full'
 *   {{steps.tests.status}} != 'failed'
 *   {{steps.plan.output}} matches /^## /
 *   {{inputs.deploy}}                       ← truthy: non-empty and not false/0/no/off
 *
 * For assertOutput the left side is implicit (the step's output):  contains 'FINAL', /regex/i, 'text'.
 */

export type Operator = '==' | '!=' | 'contains' | '!contains' | 'matches' | '!matches' | 'startsWith' | 'endsWith'

export interface Predicate {
  /** Template text on the left side; null when the subject is implicit (assertOutput). */
  left: string | null
  op: Operator | 'truthy'
  value: string
  flags: string
}

const OPS = ['==', '!=', '!contains', 'contains', '!matches', 'matches', 'startsWith', 'endsWith'] as const
const VALUE = String.raw`(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|\/((?:[^/\\]|\\.)+)\/([a-z]*))`
const WITH_LEFT = new RegExp(String.raw`^(.*?)\s*(==|!=|!contains|contains|!matches|matches|startsWith|endsWith)\s*${VALUE}\s*$`, 's')
const IMPLICIT = new RegExp(String.raw`^\s*(?:(==|!=|!contains|contains|!matches|matches|startsWith|endsWith)\s*)?${VALUE}\s*$`, 's')

const unescape = (s: string) => s.replace(/\\(['"\\])/g, '$1')
const FALSY = new Set(['', 'false', '0', 'no', 'off', 'null', 'undefined', 'none'])

const pickValue = (m: RegExpMatchArray, from: number): { value: string; flags: string; regex: boolean } => {
  if (m[from] !== undefined) return { value: unescape(m[from]), flags: '', regex: false }
  if (m[from + 1] !== undefined) return { value: unescape(m[from + 1]), flags: '', regex: false }
  return { value: m[from + 2] ?? '', flags: m[from + 3] ?? '', regex: true }
}

/** Parse an expression. `implicitLeft` is for assertOutput, where the subject is the step output. */
export function parsePredicate(expr: string, implicitLeft = false): Predicate {
  const text = expr.trim()
  if (!text) throw new Error('empty expression')
  if (implicitLeft) {
    const m = text.match(IMPLICIT)
    if (!m) throw new Error(`cannot parse "${text}": expected <operator> 'value' or /regex/`)
    const { value, flags, regex } = pickValue(m, 2)
    const op = (m[1] as Operator | undefined) ?? (regex ? 'matches' : 'contains')
    if (regex && !/matches$/.test(op)) throw new Error(`operator ${op} takes a quoted string, not a regex`)
    return { left: null, op, value, flags }
  }
  const m = text.match(WITH_LEFT)
  if (!m) return { left: text, op: 'truthy', value: '', flags: '' }
  const { value, flags, regex } = pickValue(m, 3)
  const op = m[2] as Operator
  if (regex && !/matches$/.test(op)) throw new Error(`operator ${op} takes a quoted string, not a regex`)
  if (!regex && /matches$/.test(op)) return { left: m[1].trim(), op, value, flags: '' } // string used as a pattern
  return { left: m[1].trim(), op, value, flags }
}

/** Evaluate a parsed predicate against the (already rendered) subject text. */
export function evaluatePredicate(p: Predicate, subject: string): boolean {
  const s = subject
  switch (p.op) {
    case 'truthy':
      return !FALSY.has(s.trim().toLowerCase())
    case '==':
      return s.trim() === p.value.trim()
    case '!=':
      return s.trim() !== p.value.trim()
    case 'contains':
      return s.includes(p.value)
    case '!contains':
      return !s.includes(p.value)
    case 'startsWith':
      return s.trimStart().startsWith(p.value)
    case 'endsWith':
      return s.trimEnd().endsWith(p.value)
    case 'matches':
    case '!matches': {
      let re: RegExp
      try {
        re = new RegExp(p.value, p.flags)
      } catch (err) {
        throw new Error(`invalid regex /${p.value}/: ${(err as Error).message}`)
      }
      const hit = re.test(s)
      return p.op === 'matches' ? hit : !hit
    }
  }
}

export interface Verdict {
  ok: boolean
  /** Human readable explanation, e.g. `"LGTM" contains 'LGTM' → true`. */
  detail: string
}

const short = (s: string) => (s.length > 60 ? `${s.slice(0, 57)}…` : s).replace(/\s+/g, ' ')

/** Evaluate a `when` expression; `render` resolves {{templates}} in the left side. */
export function evaluateCondition(expr: string, render: (template: string) => string): Verdict {
  const p = parsePredicate(expr, false)
  const subject = render(p.left ?? '')
  const ok = evaluatePredicate(p, subject)
  const rhs = p.op === 'truthy' ? '' : ` ${p.op} ${p.flags || p.op.endsWith('matches') ? `/${p.value}/${p.flags}` : `'${p.value}'`}`
  return { ok, detail: `"${short(subject)}"${rhs} → ${ok}` }
}

/** Evaluate an `assertOutput` expression against a step's output. */
export function evaluateAssertion(expr: string, output: string): Verdict {
  const p = parsePredicate(expr, true)
  const ok = evaluatePredicate(p, output)
  const rhs = p.op.endsWith('matches') ? `/${p.value}/${p.flags}` : `'${p.value}'`
  return { ok, detail: `output ${p.op} ${rhs} → ${ok}` }
}
