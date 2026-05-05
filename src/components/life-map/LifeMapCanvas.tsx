'use client'
import { useMemo } from 'react'
import { LifeMapEdge as Edge, LifeMapNode as Node } from '@/lib/life-map/lifeMapTypes'
import { LifeMapNode } from './LifeMapNode'
import { LifeMapEdge } from './LifeMapEdge'

export function LifeMapCanvas({ nodes, edges, onSelect, reducedMotion }: { nodes: Node[]; edges: Edge[]; onSelect:(n:Node)=>void; reducedMotion: boolean }) {
  const map = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes])
  const activeNodeIds = useMemo(() => new Set(nodes.filter((n) => n.visualState === 'highlighted' || n.importanceScore > 0.75).map((n) => n.id)), [nodes])
  return <div className='relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_40%_20%,#1e3a8a_0%,#020617_55%,#000_100%)]'>
    <svg className='absolute inset-0 h-full w-full'>{edges.map(e => <LifeMapEdge key={e.id} edge={e} nodes={map} activeNodeIds={activeNodeIds} reducedMotion={reducedMotion} />)}</svg>
    {nodes.map(node => <LifeMapNode key={node.id} node={node} onSelect={onSelect} />)}
  </div>
}
