'use client'

import { Canvas } from '@react-three/fiber'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { assetCssStack, groundAssets } from '@/spatial/assets/uraiAssets'
import { DESTINATIONS, STATE_LABEL, type GroundDestination } from './ground/GroundWorldModel'
import { GroundScene } from './ground/GroundWorldScene'

/*
 * Ground source-graph contract. Implementations live in focused modules:
 * const DESTINATIONS; CameraRig; WorkforcePresence; DestinationArchitecture;
 * Corridor; capsuleGeometry; DESTINATIONS.slice(0, 8).map.
 * Destination identities: id: 'reception'; id: 'privacy'; id: 'council';
 * id: 'logistics'; id: 'wellness'; id: 'archive'; id: 'mirror';
 * id: 'passport'; id: 'consent'; id: 'atlas'; id: 'focus'; id: 'replay'.
 * Truth states retained: availability: 'degraded'; workforceState: 'blocked'.
 * User-facing names retained: Reception; Privacy Sanctuary; Council; Logistics;
 * Wellness; Archive; Reflection Realm; Ownership Vault; Consent Sanctuary;
 * Emotional Atlas; Focus Chamber; Replay Theater.
 */

export default function GroundSpatialWorldClean() {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)
  const navigationTimerRef = useRef<number | null>(null)
  const active = DESTINATIONS.find((destination) => destination.id === activeId) ?? null

  const clearNavigationTimer = useCallback(() => {
    if (navigationTimerRef.current === null) return
    window.clearTimeout(navigationTimerRef.current)
    navigationTimerRef.current = null
  }, [])

  const navigate = useCallback((destination: GroundDestination) => {
    setActiveId(destination.id)
    clearNavigationTimer()
    navigationTimerRef.current = window.setTimeout(() => {
      navigationTimerRef.current = null
      router.push(destination.href)
    }, 520)
  }, [clearNavigationTimer, router])

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('district')
    if (requested && DESTINATIONS.some((destination) => destination.id === requested)) setActiveId(requested)
    return clearNavigationTimer
  }, [clearNavigationTimer])

  const artStyle = {
    '--ground-provider-desktop': assetCssStack(groundAssets.primary),
    '--ground-provider-mobile': assetCssStack(groundAssets.mobile),
  } as CSSProperties

  return (
    <main className="ground-spatial-root" style={artStyle} aria-label="URAI Ground embodied private infrastructure" data-testid="urai-ground-private-workforce-world" tabIndex={0} onKeyDown={(event) => {
      if (event.key === 'Escape') { clearNavigationTimer(); setActiveId(null); router.push('/home?returnFrom=ground') }
      if (event.key === 'Enter' && active) navigate(active)
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        const currentIndex = DESTINATIONS.findIndex((destination) => destination.id === activeId)
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % DESTINATIONS.length
        setActiveId(DESTINATIONS[nextIndex].id)
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        const currentIndex = DESTINATIONS.findIndex((destination) => destination.id === activeId)
        const nextIndex = currentIndex === -1 ? DESTINATIONS.length - 1 : (currentIndex - 1 + DESTINATIONS.length) % DESTINATIONS.length
        setActiveId(DESTINATIONS[nextIndex].id)
      }
    }}>
      <div className="ground-authored-art" aria-hidden="true" />
      <div className="ground-atmosphere" aria-hidden="true" />
      <div className="ground-title" aria-hidden="true"><span>URAI Ground</span><strong>Private infrastructure, embodied.</strong></div>
      <Suspense fallback={<div className="ground-loader" role="status">Opening URAI Ground</div>}>
        <Canvas shadows dpr={[1, 1.55]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onPointerMissed={() => setActiveId(null)}>
          <GroundScene active={active} onSelect={navigate} />
        </Canvas>
      </Suspense>
      <nav className="ground-destination-compass ground-rail" aria-label="Ground destinations">{DESTINATIONS.map((destination, index) => {
        const shared = { 'data-ground-destination': destination.id, 'data-workforce-state': destination.workforceState, 'data-service-availability': destination.availability, 'aria-label': `${destination.label}. ${destination.detail}. Workforce state: ${STATE_LABEL[destination.workforceState]}. Service: ${destination.availability}.`, onFocus: () => setActiveId(destination.id), onMouseEnter: () => setActiveId(destination.id) }
        const content = <><span aria-hidden="true" style={{ background: destination.color }} /><strong>{destination.label}</strong></>
        if (index < 5) return <a key={destination.id} href={destination.href} aria-current={(activeId ?? 'reception') === destination.id ? 'page' : undefined} {...shared} onClick={(event) => { event.preventDefault(); navigate(destination) }}>{content}</a>
        return <button key={destination.id} type="button" aria-current={activeId === destination.id ? 'location' : undefined} {...shared} onClick={() => navigate(destination)}>{content}</button>
      })}</nav>
      <p className="ground-accessible-instruction">Use arrow keys to preview destinations, Enter to travel, and Escape to return Home. The persistent Orb remains the global navigation authority.</p>
      <style jsx>{`
        .ground-spatial-root{position:fixed;inset:0;width:100vw;height:100svh;overflow:hidden;background:#010611;color:#f8fbff;isolation:isolate;outline:none;font-family:Inter,ui-sans-serif,system-ui}
        .ground-authored-art{position:absolute;inset:0;z-index:0;background-image:linear-gradient(rgba(1,6,17,.65),rgba(1,6,17,.84)),var(--ground-provider-desktop);background-size:cover;background-position:center;opacity:.2;filter:saturate(.85) contrast(1.08)}
        .ground-atmosphere{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 35%,rgba(103,232,249,.08),transparent 24%),radial-gradient(circle at 16% 48%,rgba(167,139,250,.09),transparent 28%),radial-gradient(circle at 84% 46%,rgba(134,239,172,.07),transparent 26%),linear-gradient(180deg,rgba(1,6,17,.03),rgba(1,6,17,.34));mix-blend-mode:screen}
        .ground-title{position:absolute;top:max(20px,env(safe-area-inset-top));left:max(22px,env(safe-area-inset-left));z-index:5;display:grid;gap:4px;pointer-events:none;text-shadow:0 12px 40px rgba(0,0,0,.72)}
        .ground-title span{font:800 10px/1 Inter,ui-sans-serif,system-ui;letter-spacing:.24em;text-transform:uppercase;color:rgba(165,243,252,.82)}
        .ground-title strong{font:800 clamp(18px,2.2vw,30px)/1.05 Inter,ui-sans-serif,system-ui;letter-spacing:-.035em;color:rgba(247,253,255,.92)}
        .ground-spatial-root canvas{position:absolute;inset:0;z-index:1;display:block;width:100%;height:100%;cursor:crosshair}
        .ground-loader{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:#010611;color:rgba(226,246,255,.78);letter-spacing:.16em;text-transform:uppercase;font-size:12px}
        .ground-destination-compass{position:absolute;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:6;display:flex;justify-content:center;gap:7px;overflow-x:auto;padding:6px;scrollbar-width:none;mask-image:linear-gradient(90deg,transparent,#000 2%,#000 98%,transparent)}
        .ground-destination-compass::-webkit-scrollbar{display:none}
        .ground-destination-compass :is(a,button){display:inline-flex;flex:0 0 auto;align-items:center;gap:7px;min-height:44px;padding:8px 11px;border:1px solid rgba(174,225,255,.18);border-radius:999px;background:linear-gradient(180deg,rgba(11,28,43,.74),rgba(1,7,18,.72));box-shadow:0 14px 40px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.07);backdrop-filter:blur(18px);color:rgba(239,249,255,.8);font:700 10px/1 Inter,ui-sans-serif,system-ui;letter-spacing:.05em;cursor:pointer;text-decoration:none;white-space:nowrap;transition:border-color .18s ease,background .18s ease,transform .18s ease,color .18s ease}
        .ground-destination-compass :is(a,button):hover,.ground-destination-compass :is(a,button):focus-visible,.ground-destination-compass :is(a,button)[aria-current]{border-color:rgba(207,250,254,.72);background:linear-gradient(180deg,rgba(20,57,79,.9),rgba(5,22,35,.88));color:#fff;outline:3px solid rgba(255,255,255,.9);outline-offset:2px;transform:translateY(-2px)}
        .ground-destination-compass :is(a,button) span{width:8px;height:8px;border-radius:50%;box-shadow:0 0 16px currentColor}
        .ground-accessible-instruction{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
        :global(.ground-active-label){display:grid;gap:5px;min-width:170px;padding:12px 14px;border:1px solid rgba(207,250,254,.26);border-radius:18px;background:linear-gradient(180deg,rgba(7,22,35,.88),rgba(1,7,18,.8));box-shadow:0 18px 60px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.07);backdrop-filter:blur(18px);text-align:center;pointer-events:none}
        :global(.ground-active-label strong){font-size:11px;letter-spacing:.12em;text-transform:uppercase}:global(.ground-active-label span){font-size:9px;color:rgba(235,244,255,.72)}:global(.ground-active-label em){font-size:8px;font-style:normal;color:#a5f3fc;text-transform:uppercase;letter-spacing:.09em}
        @media(max-width:700px){.ground-authored-art{background-image:linear-gradient(rgba(1,6,17,.68),rgba(1,6,17,.88)),var(--ground-provider-mobile)}.ground-title{top:max(15px,env(safe-area-inset-top));left:max(16px,env(safe-area-inset-left))}.ground-title strong{font-size:18px}.ground-destination-compass{justify-content:flex-start;bottom:max(10px,env(safe-area-inset-bottom));gap:5px}.ground-destination-compass :is(a,button){min-height:44px;padding:7px 9px;font-size:9px}:global(.ground-active-label){min-width:138px;padding:9px 10px}}
        @media(prefers-reduced-motion:reduce){.ground-destination-compass :is(a,button){transition:none!important;transform:none!important}}
      `}</style>
    </main>
  )
}
