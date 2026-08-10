'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import { locationMapAssets } from '@/spatial/assets/uraiAssets'
import { LocationMapSpatialWorld } from './LocationMapSpatialWorld'
import type { MemoryPlace } from './memoryPlaceSchema'
import './location-map-scene.css'

type Camera = { x: number; y: number; zoom: number }
type AtlasPoint = { place: MemoryPlace; x: number; y: number; depth: number }
type AccessMode = 'checking' | 'threshold' | 'private' | 'demo'
type PointerPoint = { x: number; y: number }

const OVERVIEW: Camera = { x: 0, y: 0, zoom: 0.9 }
const USER_KEY = 'urai:userId'
const DEMO_KEY = 'urai:locationMapDemoMode'
const SEEDS = [[18,29,.25],[34,58,.58],[47,34,.38],[62,51,.68],[77,27,.46],[82,66,.78],[43,75,.88],[24,72,.72],[69,77,.92]] as const

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)) }
function words(value: string | undefined | null) { return value ? value.replaceAll('-', ' ') : '' }
function tone(place: MemoryPlace) { return place.emotionalOverlay.auraColor || '#8eeaff' }
function privacy(place: MemoryPlace) {
  const labels: Record<MemoryPlace['locationPrivacy'], string> = {
    hidden: 'Location hidden',
    'symbolic-only': 'Symbolic placement only',
    'city-only': 'City-level precision',
    'approx-private': 'Approximate private area',
    'exact-private': 'Exact location kept private',
    'exact-share-opt-in': 'Exact location shared only by consent',
  }
  return labels[place.locationPrivacy]
}
function pointsFor(places: MemoryPlace[] | undefined | null): AtlasPoint[] {
  if (!places) return []
  return places.map((place, index) => {
    const seed = SEEDS[index % SEEDS.length]
    const lap = Math.floor(index / SEEDS.length)
    return { place, x: clamp(seed[0] + ((lap * 9) % 17) - 8, 10, 90), y: clamp(seed[1] + ((lap * 7) % 15) - 7, 13, 87), depth: clamp(seed[2] + lap * .04, .18, .96) }
  })
}
function distance(points: PointerPoint[]) {
  if (points.length < 2) return 0
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
}

export function LocationMapScene({ places, acceptanceFixturesEnabled = false }: { places: MemoryPlace[]; acceptanceFixturesEnabled?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stageRef = useRef<HTMLDivElement | null>(null)
  const markers = useRef<Array<HTMLButtonElement | null>>([])
  const drag = useRef<{ x: number; y: number; camera: Camera } | null>(null)
  const pointers = useRef(new Map<number, PointerPoint>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)
  const touchDrag = useRef<{ x: number; y: number; camera: Camera } | null>(null)
  const touchPinch = useRef<{ distance: number; zoom: number } | null>(null)
  const fixtureState = acceptanceFixturesEnabled ? searchParams.get('acceptanceState') : null
  const visiblePlaces = useMemo(() => {
    if (!places) return []
    if (fixtureState === 'empty') return []
    if (fixtureState !== 'private') return places
    return places.map((place, index) => ({
      ...place,
      id: `private-acceptance-${index + 1}`,
      userId: 'acceptance-user',
      title: `Private Place ${index + 1}`,
      privacyLevel: 'private' as const,
      locationPrivacy: index === 0 ? 'exact-private' as const : 'approx-private' as const,
    }))
  }, [fixtureState, places])
  const points = useMemo(() => pointsFor(visiblePlaces), [visiblePlaces])
  const demoData = visiblePlaces.length > 0 && visiblePlaces.every(place => place.privacyLevel === 'demo')
  const [access, setAccess] = useState<AccessMode>('checking')
  const [camera, setCamera] = useState<Camera>(OVERVIEW)
  const cameraRef = useRef<Camera>(OVERVIEW)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [privacyMode, setPrivacyMode] = useState('private')
  const [entryPortal, setEntryPortal] = useState('location-beacon')
  const [checkpoint, setCheckpoint] = useState('atlas-world-view')
  const [offline, setOffline] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [announcement, setAnnouncement] = useState('Atlas overview ready.')
  const selected = points.find(point => point.place.id === selectedId) ?? null

  useEffect(() => { cameraRef.current = camera }, [camera])

  const focusCamera = useCallback((point: AtlasPoint) => {
    const width = window.innerWidth
    const height = window.innerHeight
    return { x: ((50 - point.x) / 100) * width * .86, y: ((50 - point.y) / 100) * height * .68, zoom: width < 760 ? 1.34 : 1.54 }
  }, [])

  const applyUrl = useCallback(() => {
    setPrivacyMode(searchParams.get('privacyMode') || 'private')
    setEntryPortal(searchParams.get('entryPortal') || 'location-beacon')
    const requestedCheckpoint = searchParams.get('cameraCheckpoint') || 'atlas-world-view'
    const index = points.findIndex(item => item.place.id === searchParams.get('placeId'))
    if (index >= 0) {
      const point = points[index]
      const nextCamera = focusCamera(point)
      setSelectedId(point.place.id)
      setActiveIndex(index)
      setCheckpoint('place-focus')
      cameraRef.current = nextCamera
      setCamera(nextCamera)
      return
    }
    setSelectedId(null)
    setCheckpoint(requestedCheckpoint === 'place-focus' ? 'atlas-world-view' : requestedCheckpoint)
    cameraRef.current = OVERVIEW
    setCamera(OVERVIEW)
  }, [focusCamera, points, searchParams])

  useEffect(() => {
    const explicitDemo = searchParams.get('demo') === '1'
    try {
      const userId = localStorage.getItem(USER_KEY)?.trim()
      const retainedDemo = localStorage.getItem(DEMO_KEY) === 'true'
      setAccess(userId ? 'private' : explicitDemo || retainedDemo ? 'demo' : 'threshold')
    } catch {
      setAccess(explicitDemo ? 'demo' : 'threshold')
    }
  }, [searchParams])
  useEffect(() => { applyUrl() }, [applyUrl])
  useEffect(() => {
    if (!selected) return
    const handleResize = () => {
      const nextCamera = focusCamera(selected)
      cameraRef.current = nextCamera
      setCamera(nextCamera)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [focusCamera, selected])
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motion.matches)
    const updateNetwork = () => setOffline(!navigator.onLine)
    updateMotion(); updateNetwork()
    motion.addEventListener?.('change', updateMotion)
    window.addEventListener('online', updateNetwork)
    window.addEventListener('offline', updateNetwork)
    return () => { motion.removeEventListener?.('change', updateMotion); window.removeEventListener('online', updateNetwork); window.removeEventListener('offline', updateNetwork) }
  }, [])

  const writeUrl = useCallback((placeId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('privacyMode', privacyMode || 'private')
    params.set('entryPortal', entryPortal || 'location-beacon')
    params.set('cameraCheckpoint', placeId ? 'place-focus' : 'atlas-world-view')
    if (access === 'demo') params.set('demo', '1')
    if (placeId) params.set('placeId', placeId); else params.delete('placeId')
    router.push(`/location-map/?${params.toString()}`, { scroll: false })
  }, [access, entryPortal, privacyMode, router, searchParams])
  const overview = useCallback((push = true) => {
    setSelectedId(null); setCheckpoint('atlas-world-view'); cameraRef.current = OVERVIEW; setCamera(OVERVIEW)
    setAnnouncement('Returned to the complete emotional geography atlas.')
    if (push) writeUrl(null)
    requestAnimationFrame(() => stageRef.current?.focus())
  }, [writeUrl])
  const focus = useCallback((point: AtlasPoint, index: number, push = true) => {
    const nextCamera = focusCamera(point)
    setSelectedId(point.place.id); setActiveIndex(index); setCheckpoint('place-focus'); cameraRef.current = nextCamera; setCamera(nextCamera)
    setAnnouncement(`${point.place.title} selected. ${privacy(point.place)}.`)
    if (push) writeUrl(point.place.id)
  }, [focusCamera, writeUrl])

  useEffect(() => {
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || !selectedId) return
      const target = event.target
      if (target instanceof HTMLElement && target.matches('input,textarea,select,[contenteditable="true"]')) return
      event.preventDefault(); overview()
    }
    window.addEventListener('keydown', onEscape, true)
    return () => window.removeEventListener('keydown', onEscape, true)
  }, [overview, selectedId])

  const zoom = useCallback((amount: number) => setCamera(value => {
    const nextCamera = { ...value, zoom: clamp(value.zoom + amount, .7, 1.9) }
    cameraRef.current = nextCamera
    return nextCamera
  }), [])
  const onWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    zoom(event.deltaY > 0 ? -.09 : .09)
  }, [zoom])

  const moveMarker = (amount: number) => {
    if (!points.length) return
    const next = (activeIndex + amount + points.length) % points.length
    setActiveIndex(next); markers.current[next]?.focus(); setAnnouncement(points[next].place.title)
  }
  const moveCameraY = (amount: number) => setCamera(value => {
    const nextCamera = { ...value, y: clamp(value.y + amount, -320, 320) }
    cameraRef.current = nextCamera
    return nextCamera
  })
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveMarker(-1) }
    else if (event.key === 'ArrowRight') { event.preventDefault(); moveMarker(1) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); moveCameraY(42) }
    else if (event.key === 'ArrowDown') { event.preventDefault(); moveCameraY(-42) }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(.12) }
    else if (event.key === '-' || event.key === '_') { event.preventDefault(); zoom(-.12) }
    else if (event.key === '0' || event.key === 'Home') { event.preventDefault(); overview() }
    else if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && points[activeIndex]) { event.preventDefault(); focus(points[activeIndex], activeIndex) }
  }
  const onBeaconKey = (event: KeyboardEvent<HTMLButtonElement>, amount: number) => { event.preventDefault(); event.stopPropagation(); moveMarker(amount) }
  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || (event.target as HTMLElement).closest('button,a,[data-atlas-panel]')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const activePointers = [...pointers.current.values()]
    if (activePointers.length === 1) drag.current = { x: event.clientX, y: event.clientY, camera: cameraRef.current }
    if (activePointers.length === 2) { pinch.current = { distance: distance(activePointers), zoom: cameraRef.current.zoom }; drag.current = null }
  }, [])
  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || !pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const activePointers = [...pointers.current.values()]
    if (activePointers.length >= 2 && pinch.current) {
      const nextDistance = distance(activePointers)
      if (nextDistance > 0 && pinch.current.distance > 0) {
        setCamera(value => {
          const nextCamera = { ...value, zoom: clamp(pinch.current!.zoom * (nextDistance / pinch.current!.distance), .7, 1.9) }
          cameraRef.current = nextCamera
          return nextCamera
        })
      }
      return
    }
    if (!drag.current) return
    const nextCamera = { ...drag.current.camera, x: clamp(drag.current.camera.x + event.clientX - drag.current.x, -360, 360), y: clamp(drag.current.camera.y + event.clientY - drag.current.y, -320, 320) }
    cameraRef.current = nextCamera
    setCamera(nextCamera)
  }, [])
  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 1) {
      const remainingPoint = [...pointers.current.values()][0]
      drag.current = { x: remainingPoint.x, y: remainingPoint.y, camera: cameraRef.current }
    } else if (pointers.current.size === 0) drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || access === 'checking' || access === 'threshold' || !visiblePlaces.length) return
    const pointsFrom = (touches: TouchList) => Array.from(touches).map(touch => ({ x: touch.clientX, y: touch.clientY }))
    const blocked = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest('button,a,[data-atlas-panel]'))
    const onStart = (event: globalThis.TouchEvent) => {
      if (blocked(event.target)) return
      event.preventDefault()
      const activeTouches = pointsFrom(event.touches)
      if (activeTouches.length >= 2) { touchPinch.current = { distance: distance(activeTouches), zoom: cameraRef.current.zoom }; touchDrag.current = null }
      else if (activeTouches.length === 1) { touchDrag.current = { x: activeTouches[0].x, y: activeTouches[0].y, camera: cameraRef.current }; touchPinch.current = null }
    }
    const onMove = (event: globalThis.TouchEvent) => {
      if (blocked(event.target)) return
      event.preventDefault()
      const activeTouches = pointsFrom(event.touches)
      if (activeTouches.length >= 2 && touchPinch.current) {
        const nextDistance = distance(activeTouches)
        if (nextDistance > 0 && touchPinch.current.distance > 0) {
          const nextCamera = { ...cameraRef.current, zoom: clamp(touchPinch.current.zoom * (nextDistance / touchPinch.current.distance), .7, 1.9) }
          cameraRef.current = nextCamera; setCamera(nextCamera)
        }
        return
      }
      if (activeTouches.length !== 1) return
      if (touchPinch.current || !touchDrag.current) { touchPinch.current = null; touchDrag.current = { x: activeTouches[0].x, y: activeTouches[0].y, camera: cameraRef.current }; return }
      const nextCamera = { ...touchDrag.current.camera, x: clamp(touchDrag.current.camera.x + activeTouches[0].x - touchDrag.current.x, -360, 360), y: clamp(touchDrag.current.camera.y + activeTouches[0].y - touchDrag.current.y, -320, 320) }
      cameraRef.current = nextCamera; setCamera(nextCamera)
    }
    const onEnd = (event: globalThis.TouchEvent) => {
      const remaining = pointsFrom(event.touches)
      touchPinch.current = null
      touchDrag.current = remaining.length === 1 ? { x: remaining[0].x, y: remaining[0].y, camera: cameraRef.current } : null
    }
    stage.addEventListener('touchstart', onStart, { passive: false })
    stage.addEventListener('touchmove', onMove, { passive: false })
    stage.addEventListener('touchend', onEnd, { passive: false })
    stage.addEventListener('touchcancel', onEnd, { passive: false })
    return () => { stage.removeEventListener('touchstart', onStart); stage.removeEventListener('touchmove', onMove); stage.removeEventListener('touchend', onEnd); stage.removeEventListener('touchcancel', onEnd) }
  }, [access, visiblePlaces.length])

  const openDemo = () => {
    try { localStorage.setItem(DEMO_KEY, 'true') } catch { /* storage may be unavailable */ }
    const params = new URLSearchParams(searchParams.toString())
    params.set('demo', '1'); params.set('privacyMode', 'private'); params.set('entryPortal', 'location-beacon'); params.set('cameraCheckpoint', 'atlas-world-view')
    setAccess('demo'); router.replace(`/location-map/?${params.toString()}`, { scroll: false })
  }

  if (access === 'checking') return <main className="locationAtlas locationAtlas--empty" data-location-map-owner="canonical-route" data-private-memory-mounted="false"><section><p>URAI · Private emotional geography</p><h1>Opening the atlas.</h1><span>Checking the private threshold without mounting personal location history.</span></section></main>
  if (access === 'threshold') return <main className="locationAtlas locationAtlas--empty" data-location-map-owner="canonical-route" data-private-memory-mounted="false"><section><p>URAI · Private emotional geography</p><h1>Your places stay closed until you open them.</h1><span>No personal place history is mounted while signed out. You may enter the disclosed sample atlas.</span><button type="button" onClick={openDemo}>Open disclosed sample</button><Link href="/home">Return Home</Link></section></main>
  if (!visiblePlaces.length) return <main className="locationAtlas locationAtlas--empty" data-location-map-owner="canonical-route"><section><p>URAI · Private emotional geography</p><h1>Your atlas is quiet.</h1><span>No place memories are available. Nothing private has been inferred.</span><Link href="/home">Return Home</Link></section></main>

  const isDemo = demoData || access === 'demo'
  const style = { '--atlas-x': `${camera.x}px`, '--atlas-y': `${camera.y}px`, '--atlas-zoom': camera.zoom, '--weather-color': selected ? tone(selected.place) : '#8eeaff', '--weather-strength': selected?.place.emotionalOverlay.intensity ?? .34 } as CSSProperties
  const worldPoints = points.map(point => ({ id: point.place.id, x: point.x, y: point.y, depth: point.depth, color: tone(point.place), intensity: point.place.emotionalOverlay.intensity, selected: selectedId === point.place.id }))

  return <main className="locationAtlas locationAtlas--r3f" style={style} data-launch-surface="premium-emotional-weather-atlas" data-location-map-owner="canonical-route" data-location-map-renderer="react-three-fiber-spatial-atlas" data-location-map-source={isDemo ? 'disclosed-demo' : 'private-repository'} data-privacy-mode={privacyMode} data-entry-portal={entryPortal} data-camera-checkpoint={checkpoint} data-reduced-motion={reducedMotion ? 'true' : 'false'} data-online={offline ? 'false' : 'true'}>
    <picture className="locationAtlasArt" aria-hidden="true"><source media="(max-width:760px)" srcSet={locationMapAssets.mobile.src}/><img src={locationMapAssets.primary.src} alt="" draggable={false}/></picture>
    <div className="locationAtlasWeather" aria-hidden="true"/>
    <header className="locationAtlasHeader" data-atlas-panel><div><span>URAI · Emotional geography</span><strong>{isDemo ? 'Sample atlas' : 'Private atlas'}</strong></div><div className="locationAtlasStatus"><span>{isDemo ? 'Sample view' : 'Private view'}</span><span>{isDemo ? 'Disclosed sample places' : 'Permissioned places'}</span>{offline ? <span>Offline · local view retained</span> : null}</div><nav><Link href="/life-map">Life Map</Link><Link href="/home">Home</Link></nav></header>
    <section className="locationAtlasViewport" aria-label="Interactive symbolic emotional geography atlas"><div ref={stageRef} className="locationAtlasStage" role="application" tabIndex={0} aria-describedby="location-atlas-help" onKeyDown={onKey} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <p id="location-atlas-help" className="srOnly">Use Left and Right Arrow to move between places. Enter focuses a place. Plus and Minus zoom. Escape or Home returns to overview. Drag to pan. Pinch to zoom on touch screens.</p>
      <LocationMapSpatialWorld camera={camera} points={worldPoints} selectedColor={selected ? tone(selected.place) : '#8eeaff'} reducedMotion={reducedMotion} />
      <div className="locationAtlasCamera" aria-hidden="true" data-spatial-fallback="retired"><i/><i/><i/></div>
      <div className="locationAtlasBeacons" aria-label={`${points.length} discoverable symbolic places`}>{points.map((point,index) => <button key={point.place.id} ref={node => { markers.current[index] = node }} type="button" className="locationAtlasBeacon" style={{ '--beacon-x': `${point.x}%`, '--beacon-y': `${point.y}%`, '--beacon-depth': point.depth, '--beacon-color': tone(point.place), '--beacon-intensity': point.place.emotionalOverlay.intensity } as CSSProperties} data-selected={selectedId === point.place.id ? 'true' : 'false'} aria-pressed={selectedId === point.place.id} aria-label={`${point.place.title}. ${words(point.place.emotionalOverlay.mood)} weather. ${privacy(point.place)}. ${point.place.memoryIds.length} linked memories.`} onClick={() => focus(point,index)} onFocus={() => setActiveIndex(index)} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') onBeaconKey(event,-1); else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') onBeaconKey(event,1) }}><span className="locationAtlasBeaconCore"><i/></span><span className="locationAtlasBeaconLabel"><strong>{point.place.title}</strong><small>{words(point.place.emotionalOverlay.mood)} · {privacy(point.place)}</small></span></button>)}</div>
      <div className="locationAtlasForeground" aria-hidden="true"/>
    </div></section>
    <aside className="locationAtlasOrientation" data-atlas-panel><span>{selected ? 'Place focus' : 'Atlas overview'}</span><strong>{selected ? selected.place.title : `${points.length} symbolic places`}</strong><small>{selected ? 'Escape returns to the atlas.' : 'Drag to explore · pinch or wheel to zoom · choose a beacon.'}</small></aside>
    {selected ? <aside className="locationAtlasSelection" data-atlas-panel aria-labelledby="selected-place-title"><button type="button" className="locationAtlasClose" onClick={() => overview()} aria-label="Return to atlas overview">×</button><span>{words(selected.place.category)}</span><h1 id="selected-place-title">{selected.place.title}</h1><p>{words(selected.place.emotionalOverlay.mood)} weather at {Math.round(selected.place.emotionalOverlay.intensity * 100)}% intensity.</p><dl><div><dt>Privacy</dt><dd>{privacy(selected.place)}</dd></div><div><dt>Memories</dt><dd>{selected.place.memoryIds.length} permissioned marker{selected.place.memoryIds.length === 1 ? '' : 's'}</dd></div><div><dt>Place form</dt><dd>{words(selected.place.kind)} · {words(selected.place.reconstruction.scenePreset)}</dd></div></dl><div className="locationAtlasActions"><Link href={`/place/${encodeURIComponent(selected.place.id)}`}>Enter this place</Link><button type="button" onClick={() => overview()}>Return to atlas</button></div>{isDemo ? <small className="locationAtlasDisclosure">Sample place · no personal location history is displayed.</small> : null}</aside> : null}
    <div className="locationAtlasControls" data-atlas-panel aria-label="Atlas camera controls"><button type="button" onClick={() => zoom(-.12)} aria-label="Zoom out">−</button><button type="button" onClick={() => overview()} aria-label="Return to atlas overview">Overview</button><button type="button" onClick={() => zoom(.12)} aria-label="Zoom in">+</button></div>
    <div className="locationAtlasTruth" data-atlas-panel><span>{isDemo ? 'Sample atlas' : 'Private atlas'}</span><small>Symbolic positions protect precise history. No live location requested.</small></div>
    <div className="srOnly" role="status" aria-live="polite">{announcement}</div>
  </main>
}
