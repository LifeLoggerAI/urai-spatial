import Link from 'next/link'
import type { ReactNode } from 'react'

const nav = [
  ['What is UrAi?', '/about'],
  ['URAI Labs', '/about/labs'],
  ['Founder', '/founder'],
  ['Ecosystem', '/ecosystem'],
  ['Press', '/press'],
  ['Status', '/status'],
  ['Privacy', '/privacy-controls/'],
] as const

export default function PublicAuthorityShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro: string
  children: ReactNode
}) {
  return (
    <main style={{ minHeight: '100vh', background: '#07101a', color: '#eefcff', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ borderBottom: '1px solid rgba(140,231,238,.2)', padding: '20px clamp(20px,5vw,72px)' }}>
        <Link href="/" style={{ color: '#8ce7ee', fontWeight: 800, textDecoration: 'none', letterSpacing: '.08em' }}>UrAi</Link>
        <nav aria-label="Public information" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
          {nav.map(([label, href]) => <Link key={href} href={href} style={{ color: '#c9d9e5' }}>{label}</Link>)}
        </nav>
      </header>
      <article style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(48px,8vw,96px) 24px 96px', lineHeight: 1.7 }}>
        <p style={{ color: '#8ce7ee', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>{eyebrow}</p>
        <h1 style={{ fontSize: 'clamp(2.4rem,7vw,5.4rem)', lineHeight: 1.02, margin: '12px 0 24px' }}>{title}</h1>
        <p style={{ fontSize: 'clamp(1.15rem,2.4vw,1.5rem)', color: '#d4e6ef', maxWidth: 760 }}>{intro}</p>
        <div style={{ marginTop: 48 }}>{children}</div>
      </article>
    </main>
  )
}
