'use client'

import dynamic from 'next/dynamic'

const LifeMapScene = dynamic(() => import('./LifeMapScene'), {
  ssr: false,
  loading: () => (
    <main className="grid min-h-screen place-items-center bg-[#01030a] text-cyan-50">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/80">Opening Life Map...</p>
    </main>
  ),
})

export default function LifeMapClientScene() {
  return <LifeMapScene />
}
