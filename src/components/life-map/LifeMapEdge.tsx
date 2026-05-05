import { LifeMapEdge as Edge, LifeMapNode } from '@/lib/life-map/lifeMapTypes'
export function LifeMapEdge({ edge, nodes, activeNodeIds, reducedMotion }: { edge: Edge; nodes: Record<string, LifeMapNode>; activeNodeIds: Set<string>; reducedMotion: boolean }) {
  const a = nodes[edge.sourceId], b = nodes[edge.targetId]; if (!a || !b) return null
  const isConnectedToActive = activeNodeIds.has(edge.sourceId) || activeNodeIds.has(edge.targetId)
  const baseStroke = isConnectedToActive ? 'rgba(196, 224, 255, 0.92)' : 'rgba(120, 144, 182, 0.2)'
  const dash = edge.type === 'shadow' ? '5 5' : '8 10'
  const directionSign = edge.direction === 'sourceToTarget' ? -1 : 1
  const dashOffset = reducedMotion ? 0 : directionSign * (24 + edge.strength * 8)
  const lineWeight = reducedMotion
    ? (isConnectedToActive ? 2.2 + edge.strength * 1.8 : 0.8 + edge.strength)
    : (isConnectedToActive ? 1.8 + edge.strength * 1.6 : 0.8 + edge.strength)

  return <g>
    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={baseStroke} strokeOpacity={isConnectedToActive ? 1 : 0.7} strokeWidth={lineWeight} strokeDasharray={dash} strokeDashoffset={dashOffset} />
    {!reducedMotion && isConnectedToActive ? <circle r={1.6 + edge.strength} fill='rgba(219,234,254,0.9)'>
      <animateMotion dur={`${2.8 - Math.min(1.8, edge.strength)}s`} repeatCount='indefinite' path={`M ${edge.direction === 'sourceToTarget' ? a.x : b.x} ${edge.direction === 'sourceToTarget' ? a.y : b.y} L ${edge.direction === 'sourceToTarget' ? b.x : a.x} ${edge.direction === 'sourceToTarget' ? b.y : a.y}`} />
    </circle> : null}
  </g>
}
