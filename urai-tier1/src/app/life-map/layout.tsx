import type { ReactNode } from 'react'
import './life-map-aaa-universe.css'
import LifeMapAaaUniverse from './LifeMapAaaUniverse'

export default function LifeMapLayout({ children }: { children: ReactNode }) {
  return (
    <section className="urai-life-map-aaa-route" aria-label="URAI Life Map spatial memory universe">
      <div className="urai-life-map-aaa-route__legacy" aria-hidden="true">{children}</div>
      <LifeMapAaaUniverse />
    </section>
  )
}
