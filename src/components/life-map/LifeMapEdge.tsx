import { LifeMapEdge as Edge, LifeMapNode } from '@/lib/life-map/lifeMapTypes'
export function LifeMapEdge({ edge, nodes }: { edge: Edge; nodes: Record<string, LifeMapNode> }) {
  const a = nodes[edge.sourceId], b = nodes[edge.targetId]; if (!a || !b) return null
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke='rgba(180,200,255,.45)' strokeWidth={1 + edge.strength * 2} strokeDasharray={edge.type === 'shadow' ? '5 5' : undefined} />
}
