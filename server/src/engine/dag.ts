export interface DagNode {
  id: string
  dependsOn: string[]
}

/** Validate a DAG and return a topological order (Kahn). Throws with a readable message. */
export function topologicalOrder(nodes: DagNode[]): string[] {
  const ids = new Set(nodes.map((n) => n.id))
  const dup = nodes.map((n) => n.id).filter((id, i, arr) => arr.indexOf(id) !== i)
  if (dup.length) throw new Error(`duplicate step id: ${[...new Set(dup)].join(', ')}`)

  for (const n of nodes) {
    for (const dep of n.dependsOn) {
      if (!ids.has(dep)) throw new Error(`step "${n.id}" depends on unknown step "${dep}"`)
      if (dep === n.id) throw new Error(`step "${n.id}" depends on itself`)
    }
  }

  const indegree = new Map<string, number>()
  const children = new Map<string, string[]>()
  for (const n of nodes) {
    indegree.set(n.id, n.dependsOn.length)
    for (const dep of n.dependsOn) children.set(dep, [...(children.get(dep) ?? []), n.id])
  }

  const queue = nodes.filter((n) => n.dependsOn.length === 0).map((n) => n.id)
  const order: string[] = []
  while (queue.length) {
    const id = queue.shift() as string
    order.push(id)
    for (const child of children.get(id) ?? []) {
      const left = (indegree.get(child) ?? 0) - 1
      indegree.set(child, left)
      if (left === 0) queue.push(child)
    }
  }
  if (order.length !== nodes.length) {
    const stuck = nodes.filter((n) => !order.includes(n.id)).map((n) => n.id)
    throw new Error(`dependency cycle detected among: ${stuck.join(', ')}`)
  }
  return order
}

/** Group steps into execution stages (all steps of a stage can run in parallel). */
export function stages(nodes: DagNode[]): string[][] {
  const level = new Map<string, number>()
  for (const id of topologicalOrder(nodes)) {
    const node = nodes.find((n) => n.id === id) as DagNode
    const depth = node.dependsOn.reduce((max, dep) => Math.max(max, (level.get(dep) ?? 0) + 1), 0)
    level.set(id, depth)
  }
  const result: string[][] = []
  for (const [id, depth] of level) {
    result[depth] = [...(result[depth] ?? []), id]
  }
  return result.filter(Boolean)
}
