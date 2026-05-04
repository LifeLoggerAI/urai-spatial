import { LifeMapNode as Node } from '@/lib/life-map/lifeMapTypes'
export function LifeMapNode({ node, onSelect }: { node: Node; onSelect: (n: Node) => void }) {
  const size = 8 + node.importanceScore * 28
  return <button aria-label={node.title} onClick={() => onSelect(node)} className='absolute rounded-full shadow-[0_0_24px] border border-white/30' style={{ left: node.x, top: node.y, width: size, height: size, background: node.auraColor, opacity: 0.5 + node.emotionalIntensity / 2 }} />
}
