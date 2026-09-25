import { useMemo } from 'react'
import { layoutDag, NODE_H, NODE_W } from '../lib/dag'
import { statusColor } from '../lib/format'
import type { StepStatus } from '../types'

export interface PipelineNode {
  id: string
  name: string
  agentName: string
  meta?: string
  dependsOn: string[]
  status?: StepStatus
}

const PAD = 16

/** SVG rendering of the step DAG, laid out left-to-right by execution stage. */
export function PipelineGraph({ nodes, selectedId, onSelect, compact }: { nodes: PipelineNode[]; selectedId?: string | null; onSelect?: (id: string) => void; compact?: boolean }) {
  const layout = useMemo(() => layoutDag(nodes.map((n) => ({ id: n.id, dependsOn: n.dependsOn }))), [nodes])
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const pos = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout])

  if (!nodes.length) return <div className="text-ink-muted text-[13px] p-6 text-center">—</div>

  const width = layout.width + PAD * 2
  const height = layout.height + PAD * 2

  return (
    <div className="overflow-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" style={{ maxWidth: '100%', height: 'auto', maxHeight: compact ? 220 : undefined }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#c4c7cf" />
          </marker>
        </defs>
        {layout.edges.map((e) => {
          const a = pos.get(e.from)!
          const b = pos.get(e.to)!
          const x1 = a.x + NODE_W + PAD
          const y1 = a.y + NODE_H / 2 + PAD
          const x2 = b.x + PAD
          const y2 = b.y + NODE_H / 2 + PAD
          const dx = Math.max(30, (x2 - x1) / 2)
          const upstream = byId.get(e.from)
          const active = upstream?.status === 'succeeded'
          return (
            <path
              key={`${e.from}-${e.to}`}
              d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={active ? '#9fb3f8' : '#d6d8de'}
              strokeWidth={1.5}
              markerEnd="url(#arrow)"
            />
          )
        })}
        {layout.nodes.map((n) => {
          const node = byId.get(n.id)!
          const status = node.status
          const color = status ? statusColor(status) : '#c4c7cf'
          const selected = selectedId === n.id
          return (
            <g
              key={n.id}
              transform={`translate(${n.x + PAD}, ${n.y + PAD})`}
              onClick={() => onSelect?.(n.id)}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={14}
                fill="#ffffff"
                stroke={selected ? '#1c1c1e' : status === 'running' ? color : '#e7e8ec'}
                strokeWidth={selected ? 2 : 1.5}
                className={status === 'running' ? 'pulse-ring' : ''}
              />
              <rect x={0} y={0} width={5} height={NODE_H} rx={2.5} fill={color} />
              <text x={16} y={26} fontSize={13} fontWeight={600} fill="#1c1c1e">
                {truncate(node.name, 20)}
              </text>
              <text x={16} y={46} fontSize={11} fill="#5f6368">
                {truncate(node.agentName, 18)}
                {node.meta ? ` · ${truncate(node.meta, 14)}` : ''}
              </text>
              {status && (
                <circle cx={NODE_W - 16} cy={16} r={4.5} fill={color}>
                  {status === 'running' && <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />}
                </circle>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
