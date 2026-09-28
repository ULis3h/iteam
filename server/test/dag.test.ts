import { describe, expect, it } from 'vitest'
import { stages, topologicalOrder } from '../src/engine/dag.js'

describe('topologicalOrder', () => {
  it('orders a diamond so dependencies come first', () => {
    const order = topologicalOrder([
      { id: 'review', dependsOn: ['a', 'b'] },
      { id: 'a', dependsOn: ['plan'] },
      { id: 'b', dependsOn: ['plan'] },
      { id: 'plan', dependsOn: [] },
    ])
    expect(order.indexOf('plan')).toBeLessThan(order.indexOf('a'))
    expect(order.indexOf('plan')).toBeLessThan(order.indexOf('b'))
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('review'))
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('review'))
    expect(order).toHaveLength(4)
  })

  it('rejects cycles with a readable message', () => {
    expect(() =>
      topologicalOrder([
        { id: 'a', dependsOn: ['b'] },
        { id: 'b', dependsOn: ['a'] },
      ]),
    ).toThrow(/cycle/)
  })

  it('rejects unknown and self dependencies and duplicate ids', () => {
    expect(() => topologicalOrder([{ id: 'a', dependsOn: ['zzz'] }])).toThrow(/unknown step "zzz"/)
    expect(() => topologicalOrder([{ id: 'a', dependsOn: ['a'] }])).toThrow(/itself/)
    expect(() => topologicalOrder([{ id: 'a', dependsOn: [] }, { id: 'a', dependsOn: [] }])).toThrow(/duplicate/)
  })
})

describe('stages', () => {
  it('groups independent steps into parallel stages', () => {
    expect(
      stages([
        { id: 'plan', dependsOn: [] },
        { id: 'a', dependsOn: ['plan'] },
        { id: 'b', dependsOn: ['plan'] },
        { id: 'review', dependsOn: ['a', 'b'] },
      ]),
    ).toEqual([['plan'], ['a', 'b'], ['review']])
  })

  it('places a step at the depth of its deepest dependency', () => {
    expect(
      stages([
        { id: 'x', dependsOn: [] },
        { id: 'y', dependsOn: ['x'] },
        { id: 'z', dependsOn: ['x', 'y'] },
      ]),
    ).toEqual([['x'], ['y'], ['z']])
  })
})
