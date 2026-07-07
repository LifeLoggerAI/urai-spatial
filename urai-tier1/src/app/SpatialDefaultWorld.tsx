'use client'

import Link from 'next/link'
import LifeMapScene from '@/spatial/lifemap/LifeMapScene'

const navItems = [
  ['Ground', '/ground'],
  ['Life Map', '/life-map'],
  ['World', '/world'],
  ['Passport', '/passport'],
  ['Status', '/status'],
] as const

export default function SpatialDefaultWorld() {
  return (
    <>
      <LifeMapScene />
      <header
        aria-label="URAI spatial entry controls"
        style={{
          position: 'fixed',
          zIndex: 140,
          left: 18,
          top: 18,
          display: 'grid',
          gap: 8,
          maxWidth: 'min(360px, calc(100vw - 36px))',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 'max-content',
            maxWidth: '100%',
            padding: '10px 13px',
            borderRadius: 16,
            border: '1px solid rgba(160, 220, 255, .22)',
            background: 'rgba(2, 6, 18, .58)',
            color: '#f8fbff',
            boxShadow: '0 20px 70px rgba(0,0,0,.32)',
            backdropFilter: 'blur(16px)',
            pointerEvents: 'auto',
          }}
        >
          <strong style={{ display: 'block', fontSize: 13, letterSpacing: '.18em' }}>URAI SPATIAL</strong>
          <span style={{ display: 'block', marginTop: 4, color: 'rgba(235,244,255,.78)', fontSize: 12 }}>
            Drag to orbit. Tap a star. Enter Ground below.
          </span>
        </div>
      </header>
      <nav
        aria-label="URAI spatial route rail"
        style={{
          position: 'fixed',
          zIndex: 145,
          left: '50%',
          bottom: 18,
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
          maxWidth: 'calc(100vw - 28px)',
          padding: 8,
          borderRadius: 999,
          border: '1px solid rgba(160, 220, 255, .2)',
          background: 'rgba(2, 6, 18, .7)',
          boxShadow: '0 24px 90px rgba(0,0,0,.35)',
          backdropFilter: 'blur(18px)',
          overflowX: 'auto',
        }}
      >
        {navItems.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            style={{
              minWidth: 'max-content',
              padding: '10px 14px',
              borderRadius: 999,
              color: '#f8fbff',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 850,
              letterSpacing: '.02em',
              background: label === 'Life Map' ? 'rgba(103,232,249,.18)' : 'rgba(255,255,255,.055)',
              border: '1px solid rgba(255,255,255,.08)',
            }}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
