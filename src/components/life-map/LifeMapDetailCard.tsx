import { LifeMapNode } from '@/lib/life-map/lifeMapTypes'
import { buildNarratorLine } from '@/lib/life-map/lifeMapNarratorScripts'
export function LifeMapDetailCard({ node, onClose, onReplay }: { node: LifeMapNode; onClose:()=>void; onReplay:()=>void }) {
 return <div className='absolute inset-x-3 bottom-24 z-50 rounded-2xl border border-white/20 bg-slate-950/90 p-4 text-white backdrop-blur'>
  <div className='flex justify-between'><h3 className='font-semibold'>{node.title}</h3><button onClick={onClose}>✕</button></div>
  <p className='text-xs text-white/70'>{new Date(node.timestamp).toDateString()} • {node.emotionalTone}</p>
  <p className='mt-2 text-sm'>{node.description}</p><p className='mt-2 text-sm italic text-indigo-200'>{buildNarratorLine(node)}</p>
  <div className='mt-3 flex gap-2 text-xs'><button onClick={onReplay} className='rounded bg-indigo-500 px-3 py-1'>Replay</button><button className='rounded bg-emerald-500 px-3 py-1'>Add ritual</button><button className='rounded bg-white/20 px-3 py-1'>Export</button></div>
 </div>
}
