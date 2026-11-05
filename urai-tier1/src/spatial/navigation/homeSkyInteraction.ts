export type HomeSkyPointer = Pick<PointerEvent, 'pointerId' | 'isPrimary' | 'button' | 'clientX' | 'clientY' | 'timeStamp'>

const MAX_TAP_MOVEMENT_PX = 6
const MAX_TAP_DURATION_MS = 1500

export function isUpwardHomeSkyRay(direction: { x: number; y: number; z: number }) {
  const { x, y, z } = direction
  if (![x, y, z].every(Number.isFinite)) return false
  const length = Math.hypot(x, y, z)
  return length > 0 && y / length > .025
}

// A whole gesture must remain a primary stationary tap. An excursion followed
// by a return is still a drag; an up event without its matching down is inert.
export function createHomeSkyTapGate({ isReady, isVisibleSkyAt, onAscent }: {
  isReady: () => boolean
  isVisibleSkyAt: (x: number, y: number) => boolean
  onAscent: () => void
}) {
  let down: HomeSkyPointer | null = null
  let dragged = false
  const valid = (event: HomeSkyPointer) => event.isPrimary && event.button === 0
    && [event.pointerId, event.clientX, event.clientY, event.timeStamp].every(Number.isFinite)
  const cancel = () => { down = null; dragged = false }
  return {
    cancel,
    down(event: HomeSkyPointer) {
      cancel()
      // The press must begin on visible sky too. A release drifting off an Orb
      // or Ground hit into adjacent sky is not a sky-tap ascent gesture.
      if (!valid(event) || !isReady() || !isVisibleSkyAt(event.clientX, event.clientY)) return
      down = { pointerId:event.pointerId, isPrimary:event.isPrimary, button:event.button, clientX:event.clientX, clientY:event.clientY, timeStamp:event.timeStamp }
    },
    move(event: HomeSkyPointer) {
      if (!down) return
      if (event.pointerId !== down.pointerId || ![event.clientX, event.clientY].every(Number.isFinite)) { cancel(); return }
      if (Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY) > MAX_TAP_MOVEMENT_PX) dragged = true
    },
    up(event: HomeSkyPointer) {
      const start = down, wasDragged = dragged
      cancel()
      if (!start || wasDragged || !valid(event) || event.pointerId !== start.pointerId || !isReady()) return
      const elapsed = event.timeStamp - start.timeStamp
      if (elapsed < 0 || elapsed > MAX_TAP_DURATION_MS || Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > MAX_TAP_MOVEMENT_PX) return
      if (!isVisibleSkyAt(event.clientX, event.clientY) || !isReady()) return
      onAscent()
    },
  }
}

export function subscribeHomeSkyTaps({ owner, canvas, gate, lifecycleTarget }: {
  owner: EventTarget
  canvas: EventTarget
  gate: ReturnType<typeof createHomeSkyTapGate>
  lifecycleTarget?: EventTarget
}) {
  const down = (event: Event) => event.target === canvas ? gate.down(event as PointerEvent) : gate.cancel()
  const move = (event: Event) => gate.move(event as PointerEvent)
  const up = (event: Event) => gate.up(event as PointerEvent)
  const cancel = () => gate.cancel()
  // The existing drag-look owner captures pointers on the main element. Listen
  // there in capture phase so its retargeted up is observed without intercepting
  // movement, Orb clicks, default actions, or the existing React handlers.
  const options = { capture:true, passive:true }
  owner.addEventListener('pointerdown', down, options)
  owner.addEventListener('pointermove', move, options)
  owner.addEventListener('pointerup', up, options)
  owner.addEventListener('pointercancel', cancel, options)
  owner.addEventListener('lostpointercapture', cancel, options)
  lifecycleTarget?.addEventListener('blur', cancel)
  return () => {
    owner.removeEventListener('pointerdown', down, options)
    owner.removeEventListener('pointermove', move, options)
    owner.removeEventListener('pointerup', up, options)
    owner.removeEventListener('pointercancel', cancel, options)
    owner.removeEventListener('lostpointercapture', cancel, options)
    lifecycleTarget?.removeEventListener('blur', cancel)
    cancel()
  }
}

// Context.demo never authorizes the physical Home sky Ascent on its own.
// Only the exact, explicitly disclosed source query may carry that fixture.
export function isHomeSkyAscentTravel(request: {
  destination: string
  entryPortal?: string
  cameraCheckpoint?: string
}): boolean {
  return request.destination === 'life-map'
    && request.entryPortal === 'home-sky'
    && request.cameraCheckpoint === 'home-sky-ascent-complete'
}

// A real Home sky ascent may retain only an explicitly disclosed local fixture
// context. Never carry memory, tenant, or unrelated query authority across realms.
export function retainDisclosedHomeAscentDemo(sourcePathname: string, sourceSearch: string, request: {
  destination: string
  href?: string
  entryPortal?: string
  cameraCheckpoint?: string
  context?: { memoryId?: string; replayManifestId?: string }
}, target: URL) {
  retainDisclosedHomeReturnDemo(sourcePathname, sourceSearch, request, target)
  const home = sourcePathname.replace(/\/+$/, '') || '/'
  const lifeMap = target.pathname.replace(/\/+$/, '') || '/'
  const source = new URLSearchParams(sourceSearch)
  const flags = source.getAll('demo')
  // Never convert selected private-memory context into a public demo fixture.
  // Existing target demo declarations (including demo=0) must not be overwritten.
  const selectedKeys = ['memoryId', 'node', 'manifestId', 'movieId', 'chapterId']
  if ((home !== '/' && home !== '/home') || lifeMap !== '/life-map'
    || !isHomeSkyAscentTravel(request)
    || flags.length !== 1 || flags[0] !== '1'
    || target.searchParams.has('demo')
    || request.context?.memoryId || request.context?.replayManifestId
    || selectedKeys.some((key) => source.has(key) || target.searchParams.has(key))) return
  target.searchParams.set('demo', '1')
}

// Carry only an explicitly disclosed demo through the direct accessible link.
// Absence, demo=0, and other query fields never manufacture demo authority.
export function homeJourneyHref(href: string, search: string, sourcePathname = '/home') {
  const source = new URLSearchParams(search)
  const demo = source.getAll('demo')
  if (demo.length !== 1 || demo[0] !== '1') return href
  const target = new URL(href, 'https://urai.invalid')
  if (sourcePathname.replace(/\/+$/, '') === '/life-map'
    && ['/', '/home'].includes(target.pathname.replace(/\/+$/, '') || '/')) {
    retainDisclosedHomeReturnDemo(sourcePathname, search, { destination:'home', href }, target)
    return `${target.pathname}${target.search}${target.hash}`
  }
  // Direct accessible links must honor the same private selection fence as
  // physical Home sky Ascent. A private memory ID cannot grant demo authority.
  const selectedKeys = ['memoryId', 'node', 'manifestId', 'movieId', 'chapterId']
  if (selectedKeys.some((key) => source.has(key) || target.searchParams.has(key))) return href
  if (!target.searchParams.has('demo')) target.searchParams.set('demo', '1')
  return `${target.pathname}${target.search}${target.hash}`
}

// Returning from an explicitly disclosed Life Map demo preserves only its
// disclosure flag. It never carries a selected memory or grants private access.
export function retainDisclosedHomeReturnDemo(sourcePathname: string, sourceSearch: string, request: {
  destination: string
  href?: string
  context?: { memoryId?: string; replayManifestId?: string }
}, target: URL) {
  const source = new URLSearchParams(sourceSearch)
  const flags = source.getAll('demo')
  const memories = source.getAll('memoryId')
  const demoMemory = memories.length === 1 && /^demo:[^\s:]+$/.test(memories[0])
  const selectedKeys = ['memoryId', 'node', 'manifestId', 'movieId', 'chapterId']
  const destination = target.pathname.replace(/\/+$/, '') || '/'
  const originalTarget = request.href ? new URL(request.href, target.origin).searchParams : target.searchParams
  if (sourcePathname.replace(/\/+$/, '') !== '/life-map'
    || request.destination !== 'home' || (destination !== '/' && destination !== '/home')
    || flags.length !== 1 || flags[0] !== '1'
    || target.searchParams.has('demo')
    || originalTarget.has('demo') || selectedKeys.some(key => originalTarget.has(key))
    || selectedKeys.some(key => target.searchParams.has(key))
    || source.has('movieId') || source.has('chapterId')
    || (selectedKeys.some(key => source.has(key)) && !demoMemory)
    || (request.context?.memoryId && request.context.memoryId !== memories[0])
    || request.context?.replayManifestId) return
  target.searchParams.set('demo', '1')
}

