'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

type LifeMapSemanticKind = 'legacy' | 'dream'

const COPY: Record<LifeMapSemanticKind, { title: string; detail: string }> = {
  legacy: {
    title: 'Legacy',
    detail: 'Opening your continuity threads in Life Map.',
  },
  dream: {
    title: 'Dream',
    detail: 'Opening symbolic dream threads in Life Map.',
  },
}

export default function LifeMapSemanticRoute({ kind }: { kind: LifeMapSemanticKind }) {
  const router = useRouter()
  const destination = `/life-map?from=${kind}&overview=1`
  const copy = COPY[kind]

  useEffect(() => {
    router.replace(destination, { scroll: false })
  }, [destination, router])

  return (
    <main
      data-testid={`urai-${kind}-lifemap-convergence`}
      aria-label={`${copy.title} Life Map transition`}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        minHeight: '100svh',
        padding: 24,
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 42%, rgba(98,174,218,.16), transparent 28%), #02050b',
        color: '#f8fbff',
        fontFamily: 'Inter, ui-sans-serif, system-ui',
        textAlign: 'center',
      }}
    >
      <section style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
        <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: '#dff8ff', boxShadow: '0 0 34px rgba(159,231,255,.9)' }} />
        <h1 style={{ margin: 0, fontSize: 'clamp(30px, 7vw, 64px)', letterSpacing: '-.055em', lineHeight: .96 }}>{copy.title}</h1>
        <p role="status" style={{ margin: 0, maxWidth: 440, color: 'rgba(228,244,252,.7)', lineHeight: 1.5 }}>{copy.detail}</p>
        <Link href={destination} style={{ marginTop: 8, color: '#e9faff', fontWeight: 800, textUnderlineOffset: 4 }}>Open Life Map</Link>
      </section>
    </main>
  )
}
