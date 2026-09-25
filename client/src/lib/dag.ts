export interface DagInput {
  id: string
  dependsOn: string[]
}

export interface LayoutNode {
  id: string
  layer: number
  row: number
  x: number
  y: number
}

export interface LayoutEdge {
  from: string
  to: string
}

export interface DagLayout {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  width: number
  height: number
  stages: string[][]
}

export const NODE_W = 188
export const NODE_H = 64
const GAP_X = 56
const GAP_Y = 18

/** Longest-path layering; nodes of the same layer stack vertically. */
export function layoutDag(items: DagInput[]): DagLayout {
  const ids = new Set(items.map((i) => i.id))
  const level = new Map<string, number>()
  const visiting = new Set<string>()
  const depth = (id: string): number => {
    if (level.has(id)) return level.get(id)!
    if (visiting.has(id)) return 0 // cycle guard; server validates properly
    visiting.add(id)
    const node = items.find((i) => i.id === id)
    const d = node ? node.dependsOn.filter((dep) => ids.has(dep)).reduce((m, dep) => Math.max(m, depth(dep) + 1), 0) : 0
    visiting.delete(id)
    level.set(id, d)
    return d
  }
  items.forEach((i) => depth(i.id))

  const stages: string[][] = []
  for (const item of items) {
    const l = level.get(item.id) ?? 0
    stages[l] = [...(stages[l] ?? []), item.id]
  }
  const compact = stages.filter(Boolean)
  const nodes: LayoutNode[] = []
  const maxRows = Math.max(1, ...compact.map((s) => s.length))
  compact.forEach((stage, layer) => {
    const offset = ((maxRows - stage.length) * (NODE_H + GAP_Y)) / 2
    stage.forEach((id, row) => {
      nodes.push({ id, layer, row, x: layer * (NODE_W + GAP_X), y: offset + row * (NODE_H + GAP_Y) })
    })
  })
  const edges: LayoutEdge[] = items.flatMap((i) => i.dependsOn.filter((d) => ids.has(d)).map((d) => ({ from: d, to: i.id })))
  return {
    nodes,
    edges,
    width: compact.length * (NODE_W + GAP_X) - GAP_X,
    height: maxRows * (NODE_H + GAP_Y) - GAP_Y,
    stages: compact,
  }
}
