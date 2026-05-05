import { LifeMapEdge as Edge, LifeMapNode } from '@/lib/life-map/lifeMapTypes'
import { resolveEdgeRuntimeState } from '@/lib/life-map/lifeMapEdgeRuntime'

export function LifeMapEdge({ edge, nodes, reducedMotion }: { edge: Edge; nodes: Record<string, LifeMapNode>; reducedMotion: boolean }) {
  const a = nodes[edge.sourceId]
  const b = nodes[edge.targetId]
  if (!a || !b) return null

  const runtimeState = resolveEdgeRuntimeState({ edge, source: a, target: b, reducedMotion })
  const strokeWidth = 1 + edge.strength * 2
  const flowDirection = runtimeState.isDirectionForward ? 1 : -1
  const flowOffset = flowDirection * 12

  return (
    <g>
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={`rgba(180,200,255,${runtimeState.strokeOpacity})`}
        strokeWidth={strokeWidth}
        strokeDasharray={edge.type === 'shadow' ? '5 5' : undefined}
      />
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={`rgba(217,231,255,${runtimeState.flowOpacity})`}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeDasharray='3 9'
        strokeDashoffset={runtimeState.canAnimateFlow ? flowOffset : 0}
      >
        {runtimeState.canAnimateFlow ? <animate attributeName='stroke-dashoffset' values={`${flowOffset};0`} dur='1.1s' repeatCount='indefinite' /> : null}
      </line>
    </g>
  )
}
