'use client'

import { useEffect, useState } from 'react'
import SpatialRealmExperience, { type SpatialRealmKind } from '@/spatial/realms/SpatialRealmExperience'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import type { UraiDestination } from '@/spatial/world/worldTypes'

type FallbackDestination = {
  label: string
  destination: UraiDestination
  href: string
  cameraCheckpoint: string
}

type FallbackDefinition = {
  title: string
  subtitle: string
  background: string
  accent: string
  destinations: readonly FallbackDestination[]
}

const FALLBACK_REALMS: Record<SpatialRealmKind, FallbackDefinition> = {
  shadow: {
    title: 'Shadow Realm',
    subtitle: 'The hidden pattern remains available through a calm semantic route while three-dimensional rendering is unavailable.',
    background: '#02030a',
    accent: '#a58cff',
    destinations: [
      { label: 'Mirror', destination: 'mirror', href: '/mirror?from=shadow-fallback', cameraCheckpoint: 'mirror-arrival' },
      { label: 'Replay', destination: 'replay', href: '/replay?from=shadow-fallback', cameraCheckpoint: 'replay-arrival' },
      { label: 'Home', destination: 'home', href: '/home?returnFrom=shadow-fallback', cameraCheckpoint: 'home-threshold' },
    ],
  },
  council: {
    title: 'Council Chamber',
    subtitle: 'Stewardship guidance remains reachable through a calm semantic route while three-dimensional rendering is unavailable.',
    background: '#020711',
    accent: '#9feeff',
    destinations: [
      { label: 'Passport', destination: 'passport', href: '/passport?from=council-fallback', cameraCheckpoint: 'passport-arrival' },
      { label: 'Mirror', destination: 'mirror', href: '/mirror?from=council-fallback', cameraCheckpoint: 'mirror-arrival' },
      { label: 'Home', destination: 'home', href: '/home?returnFrom=council-fallback', cameraCheckpoint: 'home-threshold' },
    ],
  },
}

function detectWebGL(): boolean {
  const canvas = document.createElement('canvas')
  const context = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | WebGL2RenderingContext | null
  if (!context) return false
  try {
    context.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    // Capability detection must remain non-fatal when a browser blocks context cleanup.
  }
  return true
}

export default function SpatialRealmRuntime({ realm }: { realm: SpatialRealmKind }) {
  const definition = FALLBACK_REALMS[realm]
  const reducedMotion = useReducedMotion()
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    setWebglAvailable(detectWebGL())
  }, [])

  if (webglAvailable === null) {
    return (
      <main
        data-testid={`urai-${realm}-spatial-probe`}
        data-spatial-owner="webgl-capability-probe"
        aria-label={`Preparing ${definition.title}`}
        style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', background: definition.background, color: '#f8fbff', padding: 24, textAlign: 'center' }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: definition.accent }}>URAI spatial</p>
          <h1 style={{ margin: '12px 0 0', fontSize: 'clamp(34px, 7vw, 72px)' }}>{definition.title}</h1>
          <p role="status" style={{ margin: '14px auto 0', maxWidth: 560, color: 'rgba(235,246,255,.72)' }}>Preparing the safest available experience.</p>
        </div>
      </main>
    )
  }

  if (webglAvailable) {
    return (
      <div
        data-testid={`urai-${realm}-runtime-boundary`}
        data-webgl-state="available"
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
      >
        <SpatialRealmExperience realm={realm} />
      </div>
    )
  }

  const travel = (destination: FallbackDestination) => {
    requestUraiWorldTravel({
      destination: destination.destination,
      href: destination.href,
      entryPortal: `${realm}-semantic-fallback-${destination.destination}`,
      cameraCheckpoint: destination.cameraCheckpoint,
    })
  }

  return (
    <div
      data-testid={`urai-${realm}-runtime-boundary`}
      data-webgl-state="unavailable"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
    >
      <main
        className="urai-spatial-realm-fallback"
        data-testid={`urai-${realm}-spatial-fallback`}
        data-spatial-realm={realm}
        data-spatial-owner="semantic-no-webgl-fallback"
        aria-label={`URAI ${definition.title} fallback`}
      >
        <section>
          <p>URAI · SAFE ACCESS</p>
          <h1>{definition.title}</h1>
          <span>{definition.subtitle}</span>
          <strong role="status">Three-dimensional rendering is unavailable on this device. Your navigation and privacy controls remain active.</strong>
          <nav aria-label={`${definition.title} fallback destinations`}>
            {definition.destinations.map((destination) => (
              <button key={destination.destination} type="button" onClick={() => travel(destination)}>
                {destination.label}
              </button>
            ))}
          </nav>
        </section>
        <style jsx>{`
          .urai-spatial-realm-fallback{position:fixed;inset:0;min-height:100svh;display:grid;place-items:center;overflow:auto;padding:32px;background:radial-gradient(circle at 50% 16%,${definition.accent}22,transparent 34%),${definition.background};color:#f8fbff;font-family:Inter,ui-sans-serif,system-ui}.urai-spatial-realm-fallback section{width:min(720px,100%);padding:clamp(28px,7vw,64px);border:1px solid rgba(220,246,255,.18);border-radius:28px;background:rgba(3,8,18,.86);box-shadow:0 28px 90px rgba(0,0,0,.46);text-align:center}.urai-spatial-realm-fallback p{margin:0;color:${definition.accent};font-size:11px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.urai-spatial-realm-fallback h1{margin:14px 0 0;font-size:clamp(42px,9vw,88px);line-height:.92;letter-spacing:-.055em}.urai-spatial-realm-fallback span{display:block;margin:18px auto 0;max-width:580px;color:rgba(235,246,255,.74);line-height:1.6}.urai-spatial-realm-fallback strong{display:block;margin:22px auto 0;max-width:600px;padding:12px 16px;border-radius:14px;background:rgba(220,246,255,.08);font-size:12px;line-height:1.5}.urai-spatial-realm-fallback nav{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:28px}.urai-spatial-realm-fallback button{min-height:48px;padding:0 20px;border:1px solid rgba(220,246,255,.24);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font-weight:850;cursor:pointer}.urai-spatial-realm-fallback button:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:560px){.urai-spatial-realm-fallback{padding:16px}.urai-spatial-realm-fallback section{padding:28px 18px}.urai-spatial-realm-fallback nav{display:grid}.urai-spatial-realm-fallback button{width:100%}}@media(prefers-reduced-motion:reduce){.urai-spatial-realm-fallback *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
        `}</style>
      </main>
    </div>
  )
}
