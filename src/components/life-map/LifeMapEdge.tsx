import { LifeMapEdge as Edge, LifeMapNode } from '@/lib/life-map/lifeMapTypes'
import { resolveEdgeRuntimeState } from '@/lib/life-map/lifeMapEdgeRuntime'

export function LifeMapEdge({
  edge,
  nodes,
  activeNodeIds,
  reducedMotion,
}: {
  edge: Edge
  nodes: Record<string, LifeMapNode>
  activeNodeIds: Set<string>
  reducedMotion: boolean
}) {
  const a = nodes[edge.sourceId]
  const b = nodes[edge.targetId]

  if (!a || !b) return null

  const isConnectedToActive =
    activeNodeIds.has(edge.sourceId) || activeNodeIds.has(edge.targetId)

  const runtimeState = resolveEdgeRuntimeState({
    edge,
    source: a,
    target: b,
    reducedMotion,
  })

  const strokeWidth = isConnectedToActive
    ? 1.8 + edge.strength * 1.6
    : 0.8 + edge.strength

  const dash =
    edge.type === 'shadow'
      ? '5 5'
      : '8 10'

  const flowDirection = runtimeState.isDirectionForward ? 1 : -1
  const flowOffset = flowDirection * (24 + edge.strength * 8)

  const flowPath =
    edge.direction === 'sourceToTarget'
      ? `M ${a.x} ${a.y} L ${b.x} ${b.y}`
      : `M ${b.x} ${b.y} L ${a.x} ${a.y}`

  return (
    <g>
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={`rgba(180,200,255,${
          isConnectedToActive ? runtimeState.strokeOpacity : 0.2
        })`}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
      />

      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={`rgba(217,231,255,${
          isConnectedToActive ? runtimeState.flowOpacity : 0
        })`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="3 9"
        strokeDashoffset={runtimeState.canAnimateFlow ? flowOffset : 0}
      >
        {runtimeState.canAnimateFlow && isConnectedToActive ? (
          <animate
            attributeName="stroke-dashoffset"
            values={`${flowOffset};0`}
            dur="1.1s"
            repeatCount="indefinite"
          />
        ) : null}
      </line>

      {!reducedMotion && isConnectedToActive ? (
        <circle r={1.6 + edge.strength} fill="rgba(219,234,254,0.9)">
          <animateMotion
            dur={`${2.8 - Math.min(1.8, edge.strength)}s`}
            repeatCount="indefinite"
            path={flowPath}
          />
        </circle>
      ) : null}
    </g>
  )
}